import mongoose from "mongoose";
import { AREA_UNITS } from "./Land.js";

export const PRODUCT_CATEGORIES = ["fertilizer", "pesticide", "seed", "equipment", "other"];
export const QUANTITY_UNITS = ["bag", "kg", "litre", "unit", "packet"];

const inputSubsidyRuleSchema = new mongoose.Schema(
  {
    state: { type: String, trim: true, default: "All India" },
    district: { type: String, trim: true, default: "" },
    crop: { type: String, trim: true, default: "" },
    product: { type: String, required: true, trim: true },
    productCategory: { type: String, enum: PRODUCT_CATEGORIES, required: true },
    landAreaRange: {
      min: { type: Number, default: 0, min: 0 },
      max: { type: Number, default: null },
      unit: { type: String, enum: AREA_UNITS, default: "acre" },
    },
    // "flat": every matching farmer gets the same fixed quantity.
    // "per_area_rate": entitlement scales proportionally with the
    // farmer's actual land size (e.g. "1 bag per 0.33 hectare") - see
    // utils/inputRuleEngine.js computeEligibleQuantityForFarmer().
    quantityMode: { type: String, enum: ["flat", "per_area_rate"], default: "flat" },
    maxAllowedQuantity: {
      value: { type: Number, min: 0 },
      unit: { type: String, enum: QUANTITY_UNITS, required: true },
    },
    perAreaRate: {
      quantityValue: { type: Number, min: 0.01 },
      areaValue: { type: Number, min: 0.01 },
      areaUnit: { type: String, enum: AREA_UNITS, default: "hectare" },
    },
    isActive: { type: Boolean, default: true },
    effectiveFrom: { type: Date, default: Date.now },
    effectiveTo: { type: Date, default: null },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

inputSubsidyRuleSchema.index({ product: 1, productCategory: 1, isActive: 1 });

const InputSubsidyRule = mongoose.model("InputSubsidyRule", inputSubsidyRuleSchema);

export default InputSubsidyRule;
