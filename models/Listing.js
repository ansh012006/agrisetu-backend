import mongoose from "mongoose";

const listingSchema = new mongoose.Schema(
 {
 seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
 productName: { type: String, required: true, trim: true },
 category: { type: String, required: true, trim: true },
 description: { type: String, default: "" },
 quantityAvailable: { type: Number, required: true },
 unit: { type: String, default: "kg" },
 pricePerUnit: { type: Number, required: true },
 images: [{ type: String }],
 location: {
 state: { type: String, default: "" },
 district: { type: String, default: "" },
 },
 isActive: { type: Boolean, default: true },
 },
 { timestamps: true }
);

listingSchema.index({ category: 1, createdAt: -1 });

export default mongoose.model("Listing", listingSchema);
