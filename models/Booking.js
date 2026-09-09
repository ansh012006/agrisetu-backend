import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
 {
 machinery: { type: mongoose.Schema.Types.ObjectId, ref: "Machinery", required: true },
 owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
 renter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
 startDate: { type: Date, required: true },
 endDate: { type: Date, required: true },
 totalPrice: { type: Number, required: true },
 status: { type: String, enum: ["pending", "confirmed", "cancelled", "completed"], default: "pending" },
 renterNote: { type: String, default: "" },
 },
 { timestamps: true }
);

bookingSchema.index({ renter: 1, createdAt: -1 });
bookingSchema.index({ owner: 1, createdAt: -1 });

export default mongoose.model("Booking", bookingSchema);
