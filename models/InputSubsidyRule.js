import mongoose from "mongoose";

const inputSubsidyRuleSchema = new mongoose.Schema(
 {
 crop: { type: String, default: "" },
 product: { type: String, required: true },
 productCategory: { type: String, required: true },
 state: { type: String, required: true, default: "All India" },
 district: { type: String, default: "" },
 landAreaRange: {
 min: { type: Number, default: 0 },
 max: { type: Number, default: null },
 unit: { type: String, default: "acre" },
 },
 quantityMode: { type: String, enum: ["per_area_rate", "fixed"], default: "per_area_rate" },
 maxAllowedQuantity: { value: Number, unit: { type: String, default: "bag" } },
 perAreaRate: { quantityValue: Number, areaValue: Number, areaUnit: { type: String, default: "hectare" } },
 isActive: { type: Boolean, default: true },
 effectiveFrom: { type: Date, default: Date.now },
 effectiveTo: { type: Date, default: null },
 notes: { type: String, default: "" },
 },
 { timestamps: true }
);

inputSubsidyRuleSchema.index({ crop: 1, product: 1, productCategory: 1 });

export default mongoose.model("InputSubsidyRule", inputSubsidyRuleSchema);
