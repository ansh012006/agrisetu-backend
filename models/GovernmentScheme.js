import mongoose from "mongoose";

const governmentSchemeSchema = new mongoose.Schema(
 {
 name: { type: String, required: true, trim: true },
 shortDescription: { type: String, required: true },
 category: { type: String, required: true, trim: true },
 officialUrl: { type: String, default: "" },
 displayOrder: { type: Number, default: 0 },
 isActive: { type: Boolean, default: true },
 eligibility: { type: String, default: "" },
 benefits: { type: String, default: "" },
 },
 { timestamps: true }
);

governmentSchemeSchema.index({ isActive: 1, displayOrder: 1 });

export default mongoose.model("GovernmentScheme", governmentSchemeSchema);
