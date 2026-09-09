import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
 {
 code: { type: String, unique: true, required: true, uppercase: true },
 farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
 land: { type: mongoose.Schema.Types.ObjectId, ref: "Land", required: true },
 product: { type: String, required: true },
 productCategory: { type: String, required: true },
 quantityValue: { type: Number, required: true },
 crop: { type: String, default: "" },
 status: { type: String, enum: ["active", "redeemed", "cancelled", "expired"], default: "active" },
 redeemedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
 redeemedAt: { type: Date },
 issuedBy: { type: String, default: "system" },
 },
 { timestamps: true }
);

couponSchema.index({ farmer: 1, status: 1 });
couponSchema.index({ land: 1, crop: 1, product: 1, productCategory: 1 });

export default mongoose.model("Coupon", couponSchema);
