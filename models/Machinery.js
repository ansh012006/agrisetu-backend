import mongoose from "mongoose";

export const MACHINERY_CATEGORIES = ["tractor", "harvester", "plough", "sprayer", "seeder", "other"];
export const MACHINERY_STATUSES = ["available", "inactive"];

const machinerySchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: MACHINERY_CATEGORIES, required: true },
    description: { type: String, trim: true, default: "" },
    rentPricePerDay: { type: Number, required: true, min: 0.01 },
    location: {
      state: { type: String, trim: true, default: "" },
      district: { type: String, trim: true, default: "" },
    },
    status: { type: String, enum: MACHINERY_STATUSES, default: "available" },
  },
  { timestamps: true }
);

machinerySchema.index({ status: 1, createdAt: -1 });

const Machinery = mongoose.model("Machinery", machinerySchema);

export default Machinery;
