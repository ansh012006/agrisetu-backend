import { toAcres } from "./farmConstants.js";

const WILDCARD_STATE_VALUES = ["", "all india", "all-india", "central"];
const normalize = (v) => (v || "").toString().trim().toLowerCase();
const isWildcard = (v) => WILDCARD_STATE_VALUES.includes(normalize(v)) || normalize(v) === "";

export const isWithinAreaRange = (areaAcres, range) => {
  if (typeof areaAcres !== "number" || Number.isNaN(areaAcres)) return false;
  const unit = range?.unit || "acre";
  const min = toAcres(range?.min ?? 0, unit);
  const max = range?.max != null ? toAcres(range.max, unit) : null;
  if (areaAcres < min) return false;
  if (max != null && areaAcres > max) return false;
  return true;
};

export const isRuleActiveOn = (rule, asOfDate) => {
  if (!rule.isActive) return false;
  if (rule.effectiveFrom && new Date(rule.effectiveFrom) > asOfDate) return false;
  if (rule.effectiveTo && new Date(rule.effectiveTo) < asOfDate) return false;
  return true;
};

export const ruleMatchesCriteria = (rule, criteria, asOfDate = new Date()) => {
  if (!isRuleActiveOn(rule, asOfDate)) return false;
  if (normalize(rule.product) !== normalize(criteria.product)) return false;
  if (rule.productCategory !== criteria.productCategory) return false;
  if (!isWildcard(rule.state) && normalize(rule.state) !== normalize(criteria.state)) return false;
  if (!isWildcard(rule.district) && normalize(rule.district) !== normalize(criteria.district)) return false;
  if (!isWildcard(rule.crop) && normalize(rule.crop) !== normalize(criteria.crop)) return false;
  if (!isWithinAreaRange(criteria.landAreaAcres, rule.landAreaRange)) return false;
  return true;
};

const specificityScore = (rule) => {
  let score = 0;
  if (!isWildcard(rule.state)) score += 1;
  if (!isWildcard(rule.district)) score += 1;
  if (!isWildcard(rule.crop)) score += 1;
  return score;
};

export const pickMostSpecificRule = (matchingRules) => {
  if (!matchingRules || matchingRules.length === 0) return null;
  return [...matchingRules].sort((a, b) => specificityScore(b) - specificityScore(a))[0];
};

export const findApplicableRule = (allRules, criteria, asOfDate = new Date()) => {
  const matching = (allRules || []).filter((rule) => ruleMatchesCriteria(rule, criteria, asOfDate));
  return pickMostSpecificRule(matching);
};

/**
 * Computes a specific farmer's entitlement under a rule. "flat" returns
 * the fixed value; "per_area_rate" scales proportionally with the
 * farmer's land (e.g. "1 bag per 0.33 hectare" gives a farmer with 6
 * hectares floor(6/0.33) = 18 bags). Floored to a whole number - real
 * allocations are issued in whole units.
 */
export const computeEligibleQuantityForFarmer = (rule, landAreaAcres) => {
  if (rule.quantityMode === "per_area_rate") {
    const rateAreaAcres = toAcres(rule.perAreaRate.areaValue, rule.perAreaRate.areaUnit);
    if (!rateAreaAcres || !landAreaAcres) return 0;
    return Math.floor((landAreaAcres / rateAreaAcres) * rule.perAreaRate.quantityValue);
  }
  return rule.maxAllowedQuantity.value;
};
