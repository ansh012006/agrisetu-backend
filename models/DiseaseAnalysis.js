import mongoose from "mongoose";

export const SEVERITY_LEVELS = ["healthy", "mild", "moderate", "severe", "critical"];

const diseaseAnalysisSchema = new mongoose.Schema(
  {
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    cropName: { type: String, required: true, trim: true },
    diseaseName: { type: String, required: true, trim: true },
    isHealthy: { type: Boolean, default: false },
    confidence: { type: Number, required: true, min: 0, max: 100 },
    severity: { type: String, enum: SEVERITY_LEVELS, required: true },
    symptoms: [{ type: String }],
    possibleCauses: [{ type: String }],
    treatment: [{ type: String }],
    recommendedPesticide: [{ type: String }],
    recommendedFertilizer: [{ type: String }],
    organicTreatment: [{ type: String }],
    preventiveMeasures: [{ type: String }],
    imageUrl: { type: String, default: "" },
    modelUsed: { type: String, default: "" },
  },
  { timestamps: true }
);

diseaseAnalysisSchema.index({ farmer: 1, createdAt: -1 });

const DiseaseAnalysis = mongoose.model("DiseaseAnalysis", diseaseAnalysisSchema);

export default DiseaseAnalysis;
