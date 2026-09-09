import mongoose from "mongoose";

const diseaseAnalysisSchema = new mongoose.Schema(
  {
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  cropName: { type: String, default: "" },
  diseaseName: { type: String, required: true },
  isHealthy: { type: Boolean, default: false },
  confidence: { type: Number, required: true },
  description: { type: String, default: "" },
  treatment: { type: mongoose.Schema.Types.Mixed, default: "" },
  severity: { type: String, default: "medium" },
  symptoms: [{ type: String }],
  possibleCauses: [{ type: String }],
  recommendedPesticide: [{ type: String }],
  recommendedFertilizer: [{ type: String }],
  organicTreatment: [{ type: String }],
  preventiveMeasures: [{ type: String }],
  cropsAffected: [{ type: String }],
  imageUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

diseaseAnalysisSchema.index({ farmer: 1, createdAt: -1 });

export default mongoose.model("DiseaseAnalysis", diseaseAnalysisSchema);
