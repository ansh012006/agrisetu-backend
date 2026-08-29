// Seeds land-proportional subsidy rules so the Coupons feature has
// real rules to match against. Rates are derived from standard
// ICAR-recommended NPK dosage per hectare for each crop (a genuine
// agronomic reference point, not a verified legal purchase cap - see
// each rule's `notes`). Run: node seed/seedInputRules.js
// (No admin account needed first - this reduced-scope InputSubsidyRule
// model doesn't track a createdBy field.)

import dotenv from "dotenv";
import connectDB from "../config/db.js";
import InputSubsidyRule from "../models/InputSubsidyRule.js";

dotenv.config();

const RULES = [
  { crop: "Wheat", product: "Urea", productCategory: "fertilizer", quantityValue: 1, areaValue: 0.2, notes: "~120 kg N/ha for wheat (~5 bags Urea/ha)." },
  { crop: "Wheat", product: "DAP", productCategory: "fertilizer", quantityValue: 1, areaValue: 0.4, notes: "~60 kg P2O5/ha for wheat (~2.5 bags DAP/ha)." },
  { crop: "Rice", product: "Urea", productCategory: "fertilizer", quantityValue: 1, areaValue: 0.2, notes: "~120 kg N/ha for rice (~5 bags Urea/ha)." },
  { crop: "Rice", product: "DAP", productCategory: "fertilizer", quantityValue: 1, areaValue: 0.4, notes: "~60 kg P2O5/ha for rice (~2.5 bags DAP/ha)." },
  { crop: "Cotton", product: "Urea", productCategory: "fertilizer", quantityValue: 1, areaValue: 0.25, notes: "~100 kg N/ha for cotton (~4 bags Urea/ha)." },
  { crop: "Sugarcane", product: "Urea", productCategory: "fertilizer", quantityValue: 1, areaValue: 0.11, notes: "~250 kg N/ha for sugarcane (~9 bags Urea/ha)." },
  { crop: "Maize", product: "Urea", productCategory: "fertilizer", quantityValue: 1, areaValue: 0.2, notes: "~120 kg N/ha for maize (~5 bags Urea/ha)." },
  { crop: "Potato", product: "Urea", productCategory: "fertilizer", quantityValue: 1, areaValue: 0.15, notes: "~180 kg N/ha for potato (~6.5 bags Urea/ha)." },
  // Wildcard-crop (crop: "") fallback rules - the engine already
  // supports these (ruleMatchesCriteria treats an empty crop as
  // matching any crop) but no seed data ever used one, so a farmer
  // growing anything other than these 6 specific crops got a hard
  // "no rule exists" rejection even for a completely standard product
  // like Urea. pickMostSpecificRule() already prefers a crop-specific
  // rule over a wildcard one whenever both match, so these only ever
  // kick in as a genuine fallback, never override the rates above.
  { crop: "", product: "Urea", productCategory: "fertilizer", quantityValue: 1, areaValue: 0.2, notes: "General average N application rate (~120 kg N/ha) for crops without a specific rule on file." },
  { crop: "", product: "DAP", productCategory: "fertilizer", quantityValue: 1, areaValue: 0.4, notes: "General average P2O5 application rate (~60 kg P2O5/ha) for crops without a specific rule on file." },
  { crop: "", product: "MOP", productCategory: "fertilizer", quantityValue: 1, areaValue: 0.5, notes: "General average K2O application rate (~50 kg K2O/ha) - MOP had no rule at all before this." },
];

const run = async () => {
  await connectDB();

  let created = 0;
  let updated = 0;

  for (const r of RULES) {
    const filter = { crop: r.crop, product: r.product, productCategory: r.productCategory, quantityMode: "per_area_rate" };
    const update = {
      $set: {
        state: "All India",
        district: "",
        product: r.product,
        productCategory: r.productCategory,
        crop: r.crop,
        landAreaRange: { min: 0, max: null, unit: "acre" },
        quantityMode: "per_area_rate",
        maxAllowedQuantity: { unit: "bag" },
        perAreaRate: { quantityValue: r.quantityValue, areaValue: r.areaValue, areaUnit: "hectare" },
        isActive: true,
        effectiveFrom: new Date("2026-01-01"),
        effectiveTo: null,
        notes: r.notes,
      },
    };
    const result = await InputSubsidyRule.findOneAndUpdate(filter, update, { upsert: true, new: true, rawResult: true, setDefaultsOnInsert: true });
    if (result.lastErrorObject?.updatedExisting) updated += 1;
    else created += 1;
  }

  console.log(`Input subsidy rules: ${created} created, ${updated} updated.`);
  process.exit(0);
};

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
