import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
 {
 listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
 seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
 buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
 productName: { type: String, required: true },
 quantityOrdered: { type: Number, required: true },
 unit: { type: String, required: true },
 pricePerUnit: { type: Number, required: true },
 totalPrice: { type: Number, required: true },
 status: { type: String, enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"], default: "pending" },
 buyerNote: { type: String, default: "" },
 },
 { timestamps: true }
);

orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index({ seller: 1, createdAt: -1 });

export default mongoose.model("Order", orderSchema);
