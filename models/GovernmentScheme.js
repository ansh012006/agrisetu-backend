import mongoose from "mongoose";

const governmentSchemeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    shortDescription: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["income_support", "insurance", "irrigation", "soil", "marketing", "credit", "other"],
      default: "other",
    },
    officialUrl: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

governmentSchemeSchema.index({ isActive: 1, displayOrder: 1 });

const GovernmentScheme = mongoose.model("GovernmentScheme", governmentSchemeSchema);

export default GovernmentScheme;
