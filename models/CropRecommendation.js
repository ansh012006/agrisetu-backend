import mongoose from "mongoose";

const cropRecommendationSchema = new mongoose.Schema(
  {
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  land: { type: mongoose.Schema.Types.ObjectId, ref: "Land", required: true },
  recommendedCrops: { type: mongoose.Schema.Types.Mixed, default: [] },
  reasoning: { type: String, default: "" },
  generalAdvice: [{ type: String }],
  soilConsiderations: [{ type: String }],
  weatherConsiderations: [{ type: String }],
  soilType: { type: String, default: "" },
  season: { type: String, default: "" },
  confidence: { type: Number, default: 0 },
  },
  { timestamps: true }
);

cropRecommendationSchema.index({ farmer: 1, createdAt: -1 });

export default mongoose.model("CropRecommendation", cropRecommendationSchema);
