import mongoose from "mongoose";

export const AREA_UNITS = ["acre", "hectare", "bigha", "guntha", "sqft", "sqm"];

const landSchema = new mongoose.Schema(
  {
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    landName: { type: String, required: true, trim: true },
    area: {
      value: { type: Number, required: true, min: 0.01 },
      unit: { type: String, enum: AREA_UNITS, default: "acre" },
    },
    location: {
      state: { type: String, trim: true, default: "" },
      district: { type: String, trim: true, default: "" },
      village: { type: String, trim: true, default: "" },
    },
    soilType: { type: String, trim: true, default: "" },
    currentCrop: { type: String, trim: true, default: "" },
    ownershipStatus: { type: String, enum: ["owned", "leased", "tenant", "shared"], default: "owned" },
    irrigationAvailable: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Land = mongoose.model("Land", landSchema);

export default Land;
