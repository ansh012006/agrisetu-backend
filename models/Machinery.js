import mongoose from "mongoose";

const machinerySchema = new mongoose.Schema(
 {
 owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
 name: { type: String, required: true, trim: true },
 category: { type: String, required: true, trim: true },
 description: { type: String, default: "" },
 brand: { type: String, default: "" },
 model: { type: String, default: "" },
 year: { type: Number },
 condition: { type: String, enum: ["new", "good", "fair"], default: "good" },
 rentalPricePerDay: { type: Number, required: true },
 rentalPricePerHour: { type: Number, default: 0 },
 location: {
 state: { type: String, default: "" },
 district: { type: String, default: "" },
 },
 images: [{ type: String }],
 isActive: { type: Boolean, default: true },
 },
 { timestamps: true }
);

machinerySchema.index({ category: 1, createdAt: -1 });

export default mongoose.model("Machinery", machinerySchema);
