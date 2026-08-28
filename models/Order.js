import mongoose from "mongoose";

export const ORDER_STATUSES = ["pending", "confirmed", "cancelled"];

const orderSchema = new mongoose.Schema(
  {
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
    // Snapshotted at order time so the order record stays accurate even
    // if the listing is later edited, deactivated, or deleted -
    // matches how Coupon already snapshots product/quantity/unit at
    // generation time rather than always dereferencing a live document.
    productName: { type: String, required: true },
    quantityOrdered: { type: Number, required: true, min: 0.01 },
    unit: { type: String, required: true },
    pricePerUnit: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    status: { type: String, enum: ORDER_STATUSES, default: "pending" },
  },
  { timestamps: true }
);

orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index({ seller: 1, createdAt: -1 });

const Order = mongoose.model("Order", orderSchema);

export default Order;
