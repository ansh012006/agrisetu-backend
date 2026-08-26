import mongoose from "mongoose";

const cropRecommendationSchema = new mongoose.Schema(
  {
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    land: { type: mongoose.Schema.Types.ObjectId, ref: "Land", default: null },
    recommendedCrops: [
      {
        cropName: { type: String, required: true },
        suitabilityScore: { type: Number, min: 0, max: 100 },
        reasoning: { type: String, default: "" },
        expectedYield: { type: String, default: "" },
      },
    ],
    soilConsiderations: [{ type: String }],
    weatherConsiderations: [{ type: String }],
    generalAdvice: [{ type: String }],
  },
  { timestamps: true }
);

cropRecommendationSchema.index({ farmer: 1, createdAt: -1 });

const CropRecommendation = mongoose.model("CropRecommendation", cropRecommendationSchema);

export default CropRecommendation;
