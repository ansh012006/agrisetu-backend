import Coupon from "../models/Coupon.js";
import Land from "../models/Land.js";
import InputSubsidyRule from "../models/InputSubsidyRule.js";
import { ApiError } from "../utils/apiHelpers.js";
import mongoose from "mongoose";

export class EligibilityError extends ApiError {
 constructor(message, statusCode = 400, code = "ELIGIBILITY_ERROR") {
 super(message, statusCode, code);
 this.name = "EligibilityError";
 }
}

function generateCode() {
 const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
 let code = "AG-";
 for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
 return code;
}

async function findMatchingRule(landId, product, productCategory, crop) {
 const land = await Land.findById(landId).lean();
 if (!land) throw new EligibilityError("Land not found.", 404, "LAND_NOT_FOUND");

 const rules = await InputSubsidyRule.find({
 crop: { $in: [crop || "", ""] },
 product,
 productCategory,
 isActive: true,
 effectiveFrom: { $lte: new Date() },
 $or: [{ effectiveTo: null }, { effectiveTo: { $gte: new Date() } }],
 }).lean();

 if (rules.length === 0) {
 throw new EligibilityError("No subsidy rule found for this product and crop combination.", 400, "NO_RULE");
 }

 const landArea = land.area?.value || 0;
 const landUnit = land.area?.unit || "acre";

 let best = null;
 let bestScore = -1;
 for (const rule of rules) {
 let score = 0;
 if (rule.crop && rule.crop === crop) score += 2;
 else if (!rule.crop) score += 0;
 const areaRange = rule.landAreaRange || {};
 if (areaRange.max === null || (landArea >= (areaRange.min || 0) && (areaRange.max === null || landArea <= areaRange.max))) score += 1;
 if (score > bestScore) { bestScore = score; best = rule; }
 }

 if (!best) throw new EligibilityError("No applicable subsidy rule for your land area.", 400, "NO_APPLICABLE_RULE");
 return { land, rule: best };
}

function computeQuantity(rule, landArea) {
  if (rule.quantityMode === "per_area_rate" && rule.perAreaRate) {
  const rate = rule.perAreaRate;
  return Math.ceil((landArea * rate.quantityValue) / rate.areaValue);
  }
  return rule.maxAllowedQuantity?.value || 1;
}

// ponytail: dual shape (code+couponCode, quantityValue+quantity) for Android compat
const toCouponDTO = (c) => {
  if (!c) return c;
  const o = { ...c };
  o.couponCode = o.code || o.couponCode || "";
  o.code = o.couponCode;
  const qtyVal = o.quantityValue ?? o.quantity?.value ?? 1;
  const qtyUnit = o.quantity?.unit || "bag";
  o.quantityValue = Number(qtyVal);
  o.quantity = { value: Number(qtyVal), unit: qtyUnit };
  o.expiresAt = o.expiresAt || null;
  if (o.land && typeof o.land === "object" && o.land.landName) o.land = { landName: o.land.landName };
  else if (typeof o.land === "string") o.land = { landName: "" };
  else if (!o.land) o.land = null;
  if (o.farmer && typeof o.farmer === "object" && (o.farmer.name || o.farmer._id)) o.farmer = { name: o.farmer.name || "" };
  else if (!o.farmer || typeof o.farmer === "string") o.farmer = o.farmer && typeof o.farmer === "object" ? o.farmer : null;
  return o;
};

const populateCoupon = async (id) => {
  const c = await Coupon.findById(id).populate("land", "landName").populate("farmer", "name").lean();
  return toCouponDTO(c);
};

export async function generateCoupon({ farmerId, landId, product, productCategory, quantityValue, crop }) {
 if (!landId || !product || !productCategory) {
 throw new EligibilityError("landId, product, and productCategory are required.", 400, "MISSING_FIELDS");
 }

 const { land, rule } = await findMatchingRule(landId, product, productCategory, crop || "");
 const landArea = land.area?.value || 0;
 const qty = quantityValue || computeQuantity(rule, landArea);

 const existing = await Coupon.findOne({
 farmer: farmerId,
 land: landId,
 product,
 productCategory,
 crop: crop || "",
 status: "active",
 });

 if (existing) {
 throw new EligibilityError("You already have an active coupon for this product and land.", 400, "DUPLICATE_COUPON");
 }

 const now = new Date();
 const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
 const monthlyCount = await Coupon.countDocuments({
 farmer: farmerId,
 productCategory,
 createdAt: { $gte: startOfMonth },
 });

 if (monthlyCount >= 5) {
 throw new EligibilityError("Monthly limit reached. Maximum 5 coupons per month.", 429, "MONTHLY_LIMIT");
 }

  const code = generateCode();
  const created = await Coupon.create({
  code,
  farmer: farmerId,
  land: landId,
  product,
  productCategory,
  quantityValue: qty,
  crop: crop || "",
  });

  const coupon = await populateCoupon(created._id);
  return { coupon, remainingQuota: 5 - monthlyCount - 1 };
}

export async function getMyCoupons(farmerId, status) {
  const filter = { farmer: farmerId };
  if (status) filter.status = status;
  const list = await Coupon.find(filter).populate("land", "landName").populate("farmer", "name").sort({ createdAt: -1 }).lean();
  return list.map(toCouponDTO);
}

export async function getMyLimits(farmerId) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyUsed = await Coupon.countDocuments({
  farmer: farmerId,
  createdAt: { $gte: startOfMonth },
  });
  // Android expects limits: List<SubsidyLimit>; group by product so 22 rules don't render as 22 rows
  const rules = await InputSubsidyRule.find({ isActive: true }).limit(50).lean();
  const lands = await Land.find({ farmer: farmerId }).lean();
  const landIds = lands.map((l) => l._id.toString());
  const totalArea = lands.reduce((s, l) => s + (Number(l.area?.value) || 0), 0) || 1;
  const coupons = await Coupon.find({ farmer: farmerId, createdAt: { $gte: startOfMonth } }).lean();
  const byProduct = new Map();
  for (const r of rules) {
  const key = `${r.product}||${r.productCategory}||${r.maxAllowedQuantity?.unit || "bag"}`;
  const eligible = computeQuantity(r, totalArea);
  const allocated = coupons.filter((c) => c.productCategory === r.productCategory).reduce((s, c) => s + (Number(c.quantityValue) || 0), 0);
  const cur = byProduct.get(key);
  if (!cur || eligible > cur.eligibleQuantity) {
  byProduct.set(key, {
  ruleId: r._id.toString(),
  product: r.product,
  productCategory: r.productCategory,
  unit: r.maxAllowedQuantity?.unit || "bag",
  quantityMode: r.quantityMode === "fixed" ? "flat" : r.quantityMode,
  eligibleQuantity: eligible,
  totalAllocated: allocated,
  remainingQuantity: Math.max(0, eligible - allocated),
  usedPercent: eligible > 0 ? Math.round((allocated / eligible) * 100) : 0,
  applicableLands: landIds,
  });
  }
  }
  const limits = [...byProduct.values()].sort((a, b) => a.product.localeCompare(b.product));
  return { monthlyUsed, monthlyLimit: 5, remaining: 5 - monthlyUsed, limits };
}

export async function lookupCoupon(code) {
  if (!code) throw new EligibilityError("Coupon code is required.", 400, "MISSING_CODE");
  const coupon = await Coupon.findOne({ code: code.toUpperCase() }).populate("land", "landName").populate("farmer", "name").lean();
  if (!coupon) throw new EligibilityError("Coupon not found.", 404, "NOT_FOUND");
  return toCouponDTO(coupon);
}

export async function redeemCoupon(couponCode, redeemerId) {
  const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
  if (!coupon) throw new EligibilityError("Coupon not found.", 404, "NOT_FOUND");
  if (coupon.status !== "active") throw new EligibilityError("Coupon is not active.", 400, "INACTIVE_COUPON");

  coupon.status = "redeemed";
  coupon.redeemedBy = redeemerId;
  coupon.redeemedAt = new Date();
  await coupon.save();
  return await populateCoupon(coupon._id);
}

export async function cancelCoupon(couponId, farmerId) {
  const coupon = await Coupon.findById(couponId);
  if (!coupon) throw new EligibilityError("Coupon not found.", 404, "NOT_FOUND");
  if (coupon.farmer.toString() !== farmerId.toString()) throw new EligibilityError("Not authorized.", 403, "FORBIDDEN");
  if (coupon.status !== "active") throw new EligibilityError("Only active coupons can be cancelled.", 400, "NOT_ACTIVE");
  coupon.status = "cancelled";
  await coupon.save();
  return await populateCoupon(coupon._id);
}
