import Coupon from "../models/Coupon.js";
import Land from "../models/Land.js";
import InputSubsidyRule from "../models/InputSubsidyRule.js";
import RuleAllocationCounter from "../models/RuleAllocationCounter.js";
import { findApplicableRule, computeEligibleQuantityForFarmer } from "../utils/inputRuleEngine.js";
import { toAcres } from "../utils/farmConstants.js";

export class EligibilityError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.name = "EligibilityError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * The atomic guard: a single findOneAndUpdate with the quota check
 * built into its filter is what makes this safe under concurrent
 * requests - MongoDB serializes writes to the same document, so a
 * second concurrent request's filter is evaluated against the
 * already-updated counter from the first, and correctly fails if
 * there's no longer enough room. No application-level locking needed.
 */
const reserveQuota = async (farmerId, rule, quantityValue, landAreaAcres) => {
  if (!quantityValue || quantityValue <= 0) {
    throw new EligibilityError("Quantity must be a positive number.", 400, "INVALID_QUANTITY");
  }
  if (rule.quantityMode === "per_area_rate" && (typeof landAreaAcres !== "number" || landAreaAcres <= 0)) {
    throw new EligibilityError("This rule's entitlement is calculated from land size, but no valid land area was provided.", 400, "MISSING_LAND_AREA");
  }

  const maxAllowed = computeEligibleQuantityForFarmer(rule, landAreaAcres);

  try {
    await RuleAllocationCounter.findOneAndUpdate(
      { farmer: farmerId, rule: rule._id },
      { $setOnInsert: { farmer: farmerId, rule: rule._id, totalAllocated: 0 } },
      { upsert: true }
    );
  } catch (err) {
    if (err.code !== 11000) throw err;
  }

  const updatedCounter = await RuleAllocationCounter.findOneAndUpdate(
    { farmer: farmerId, rule: rule._id, totalAllocated: { $lte: maxAllowed - quantityValue } },
    { $inc: { totalAllocated: quantityValue } },
    { new: true }
  );

  if (!updatedCounter) {
    const current = await RuleAllocationCounter.findOne({ farmer: farmerId, rule: rule._id }).lean();
    const remaining = Math.max(0, maxAllowed - (current?.totalAllocated || 0));
    throw new EligibilityError(
      `Insufficient remaining quota. Requested ${quantityValue}, but only ${remaining} ${rule.maxAllowedQuantity.unit}(s) remain.`,
      409,
      "INSUFFICIENT_QUOTA"
    );
  }

  return { maxAllowed, updatedCounter };
};

export const generateCoupon = async ({ farmerId, landId, product, productCategory, quantityValue, crop }) => {
  const land = await Land.findById(landId);
  if (!land) throw new EligibilityError("Land record not found.", 404, "LAND_NOT_FOUND");
  if (land.farmer.toString() !== farmerId.toString()) {
    throw new EligibilityError("You do not have access to this land record.", 403, "FORBIDDEN");
  }

  const landAreaAcres = toAcres(land.area.value, land.area.unit);
  const resolvedCrop = crop || land.currentCrop || "";
  const criteria = {
    product,
    productCategory,
    state: land.location?.state || "",
    district: land.location?.district || "",
    crop: resolvedCrop,
    landAreaAcres,
  };

  const allRules = await InputSubsidyRule.find({ product, productCategory, isActive: true }).lean();
  const rule = findApplicableRule(allRules, criteria);

  if (!rule) {
    throw new EligibilityError(
      `No active government subsidy rule matches product "${product}", category "${productCategory}"` +
        (resolvedCrop ? `, crop "${resolvedCrop}"` : ", no crop specified") +
        `. Double-check the product name matches exactly and that a crop is selected if the rule requires one.`,
      404,
      "NOT_ELIGIBLE"
    );
  }

  const { maxAllowed, updatedCounter } = await reserveQuota(farmerId, rule, quantityValue, landAreaAcres);

  const couponCode = await Coupon.generateUniqueCode();
  let coupon = await Coupon.create({
    farmer: farmerId,
    land: land._id,
    rule: rule._id,
    product: rule.product,
    productCategory: rule.productCategory,
    quantity: { value: quantityValue, unit: rule.maxAllowedQuantity.unit },
    couponCode,
    status: "active",
    expiresAt: Coupon.defaultExpiry(),
  });
  // The Android app's Coupon model expects `land` AND `farmer` as
  // populated objects ({landName} / {name}), matching the shape the
  // dealer-facing redeemCoupon/lookupCoupon below already return - the
  // freshly-created document only has both as raw ObjectIds, which
  // fails to parse on the client (Gson throws "Expected BEGIN_OBJECT
  // but was STRING") since the shared Coupon model expects an object,
  // not a bare ID string, for both fields. Re-fetch populated before
  // returning, exactly the same fix already applied to `land` here -
  // this one was missed because `farmer` was added to the Android
  // model in a later change than this function.
  coupon = await Coupon.findById(coupon._id).populate("land", "landName").populate("farmer", "name");

  return { coupon, remainingQuota: Math.max(0, maxAllowed - updatedCounter.totalAllocated) };
};

export const getMyCoupons = async (farmerId, status) => {
  const query = { farmer: farmerId };
  if (status) query.status = status;
  return Coupon.find(query).sort({ createdAt: -1 }).populate("land", "landName").populate("farmer", "name");
};

/**
 * Farmer-facing "My Subsidy Limits" summary — for every active rule
 * that any of the farmer's lands qualify for, shows the total
 * entitlement, how much is used, and what remains. Sums proportionally
 * across multiple qualifying lands for per_area_rate rules; flat rules
 * report a single fixed value regardless of how many lands qualify.
 */
export const getMyLimits = async (farmerId) => {
  const [lands, allRules] = await Promise.all([
    Land.find({ farmer: farmerId }).lean(),
    InputSubsidyRule.find({ isActive: true }).lean(),
  ]);
  if (lands.length === 0 || allRules.length === 0) return [];

  const rulesByProduct = new Map();
  for (const rule of allRules) {
    const key = `${rule.product.toLowerCase()}::${rule.productCategory}`;
    if (!rulesByProduct.has(key)) rulesByProduct.set(key, []);
    rulesByProduct.get(key).push(rule);
  }

  // Keyed by product+category (not by a single specific rule id) - see
  // below for why. Tracks the eligible quantity (from re-matching
  // against each land today) alongside every ruleId that's ever been
  // relevant for this product, so actual usage can be summed across
  // all of them.
  const matched = new Map();
  for (const land of lands) {
    const landAreaAcres = toAcres(land.area.value, land.area.unit);
    for (const [productKey, rulesForProduct] of rulesByProduct) {
      const criteria = {
        product: rulesForProduct[0].product,
        productCategory: rulesForProduct[0].productCategory,
        state: land.location?.state || "",
        district: land.location?.district || "",
        crop: land.currentCrop || "",
        landAreaAcres,
      };
      const match = findApplicableRule(rulesForProduct, criteria);
      if (!match) continue;

      const landEligible = computeEligibleQuantityForFarmer(match, landAreaAcres);
      if (!matched.has(productKey)) {
        matched.set(productKey, { rule: match, landNames: new Set(), eligibleQuantity: 0, ruleIds: new Set() });
      }
      const entry = matched.get(productKey);
      entry.landNames.add(land.landName);
      entry.ruleIds.add(match._id.toString());
      entry.eligibleQuantity =
        match.quantityMode === "per_area_rate" ? entry.eligibleQuantity + landEligible : Math.max(entry.eligibleQuantity, landEligible);
    }
  }

  if (matched.size === 0) return [];

  // Usage is summed across EVERY rule id ever relevant for a product,
  // not just whichever single rule re-matching against today's land
  // data happens to pick. This is the actual fix: generateCoupon()
  // resolves its crop from `crop || land.currentCrop` (the coupon
  // form's own crop field can override the land's stored crop), while
  // this function only ever had access to land.currentCrop - any time
  // those two diverged, a coupon's usage was recorded against a
  // different rule id than the one re-derived here, and a lookup keyed
  // to a single ruleId would silently show 0 used despite real
  // consumption. Summing across every ruleId that's ever matched this
  // product for this farmer's rules closes that gap regardless of
  // which specific rule any individual coupon was actually generated
  // under.
  const allProductRuleIds = new Set();
  for (const entry of matched.values()) {
    for (const id of entry.ruleIds) allProductRuleIds.add(id);
  }
  // Also include every rule id for each matched product (not just the
  // ones that happened to match today), since a coupon could have been
  // generated under a rule variant that no longer matches this land's
  // current crop/state/district (e.g. the land's crop changed since).
  for (const [productKey, entry] of matched) {
    for (const rule of rulesByProduct.get(productKey) || []) {
      allProductRuleIds.add(rule._id.toString());
      entry.ruleIds.add(rule._id.toString());
    }
  }

  const counters = await RuleAllocationCounter.find({
    farmer: farmerId,
    rule: { $in: Array.from(allProductRuleIds) },
  }).lean();
  const counterByRule = new Map(counters.map((c) => [c.rule.toString(), c.totalAllocated]));

  return Array.from(matched.entries()).map(([, entry]) => {
    const { rule, landNames, eligibleQuantity, ruleIds } = entry;
    const totalAllocated = Array.from(ruleIds).reduce((sum, id) => sum + (counterByRule.get(id) || 0), 0);
    const remainingQuantity = Math.max(0, eligibleQuantity - totalAllocated);
    return {
      ruleId: rule._id.toString(),
      product: rule.product,
      productCategory: rule.productCategory,
      unit: rule.maxAllowedQuantity.unit,
      quantityMode: rule.quantityMode,
      eligibleQuantity,
      totalAllocated,
      remainingQuantity,
      usedPercent: eligibleQuantity > 0 ? Math.round((totalAllocated / eligibleQuantity) * 100) : 0,
      applicableLands: Array.from(landNames),
    };
  });
};

/**
 * Dealer/officer-initiated redemption — the farmer shows their coupon
 * code at the point of sale, the dealer looks it up and confirms it.
 * The quota was already reserved at generation time (see
 * generateCoupon above), so redemption doesn't touch the counter again,
 * it just confirms the reservation was actually used.
 */
export const redeemCoupon = async (couponCode, redeemedBy) => {
  const coupon = await Coupon.findOne({ couponCode: couponCode.trim().toUpperCase() })
    .populate("farmer", "name")
    .populate("land", "landName");

  if (!coupon) {
    throw new EligibilityError("No coupon found with that code.", 404, "COUPON_NOT_FOUND");
  }

  if (coupon.status === "active" && coupon.expiresAt < new Date()) {
    coupon.status = "expired";
    await coupon.save();
  }

  if (coupon.status !== "active") {
    throw new EligibilityError(`This coupon is "${coupon.status}" and cannot be redeemed.`, 400, "INVALID_STATUS");
  }

  coupon.status = "redeemed";
  coupon.redeemedAt = new Date();
  await coupon.save();

  return coupon;
};

/**
 * Look up a coupon by code without redeeming it — lets a dealer confirm
 * the farmer/product/quantity before committing to the redemption.
 */
export const lookupCoupon = async (couponCode) => {
  const coupon = await Coupon.findOne({ couponCode: couponCode.trim().toUpperCase() })
    .populate("farmer", "name")
    .populate("land", "landName");

  if (!coupon) {
    throw new EligibilityError("No coupon found with that code.", 404, "COUPON_NOT_FOUND");
  }
  return coupon;
};

/**
 * Lets a farmer discard a coupon they generated but haven't redeemed
 * yet, crediting the allocated quantity back to their remaining quota -
 * the exact mirror of reserveQuota() above. Only "active" coupons can
 * be cancelled; a coupon a dealer has already redeemed represents real
 * product handed over, so its quota is not refundable, and a coupon
 * that's already cancelled or expired has nothing left to reverse.
 */
export const cancelCoupon = async (couponId, farmerId) => {
  const coupon = await Coupon.findById(couponId);
  if (!coupon) {
    throw new EligibilityError("Coupon not found.", 404, "COUPON_NOT_FOUND");
  }
  if (coupon.farmer.toString() !== farmerId.toString()) {
    throw new EligibilityError("You do not have access to this coupon.", 403, "FORBIDDEN");
  }
  if (coupon.status !== "active") {
    throw new EligibilityError(`This coupon is "${coupon.status}" and can no longer be discarded.`, 400, "NOT_ACTIVE");
  }

  // Symmetric to reserveQuota()'s $inc: a negative increment credits
  // the quantity back. No lower-bound guard is needed here the way
  // reserveQuota() guards its upper bound - this coupon's own
  // reservation is guaranteed to already be reflected in the counter
  // (it was added when the coupon was created), so decrementing by
  // that same amount can't drive the counter negative.
  await RuleAllocationCounter.findOneAndUpdate(
    { farmer: farmerId, rule: coupon.rule },
    { $inc: { totalAllocated: -coupon.quantity.value } }
  );

  coupon.status = "cancelled";
  await coupon.save();

  return Coupon.findById(coupon._id).populate("land", "landName").populate("farmer", "name");
};
