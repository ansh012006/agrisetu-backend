import mongoose from "mongoose";

export const BOOKING_STATUSES = ["pending", "confirmed", "cancelled", "completed"];

const bookingSchema = new mongoose.Schema(
  {
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    machinery: { type: mongoose.Schema.Types.ObjectId, ref: "Machinery", required: true, index: true },
    // Snapshotted at booking time, same reasoning as Order snapshotting
    // product/price from Listing - stays accurate even if the
    // machinery listing is later edited or deactivated.
    machineryName: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    rentPricePerDay: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    status: { type: String, enum: BOOKING_STATUSES, default: "pending" },
  },
  { timestamps: true }
);

bookingSchema.index({ farmer: 1, createdAt: -1 });
bookingSchema.index({ owner: 1, createdAt: -1 });
// Speeds up the overlap-conflict query in marketplace booking logic,
// which always filters by machinery + status + date range together.
bookingSchema.index({ machinery: 1, status: 1, startDate: 1, endDate: 1 });

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
