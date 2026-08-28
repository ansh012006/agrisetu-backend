import mongoose from "mongoose";

export const LISTING_CATEGORIES = ["grain", "vegetable", "fruit", "pulses", "spices", "dairy", "other"];
export const LISTING_UNITS = ["kg", "quintal", "ton", "litre", "dozen", "piece"];
export const LISTING_STATUSES = ["active", "sold_out", "inactive"];

const listingSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    productName: { type: String, required: true, trim: true },
    category: { type: String, enum: LISTING_CATEGORIES, required: true },
    quantityAvailable: { type: Number, required: true, min: 0 },
    unit: { type: String, enum: LISTING_UNITS, required: true },
    pricePerUnit: { type: Number, required: true, min: 0.01 },
    description: { type: String, trim: true, default: "" },
    status: { type: String, enum: LISTING_STATUSES, default: "active" },
  },
  { timestamps: true }
);

listingSchema.index({ status: 1, createdAt: -1 });

const Listing = mongoose.model("Listing", listingSchema);

export default Listing;
