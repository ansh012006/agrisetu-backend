import DiseaseAnalysis from "../models/DiseaseAnalysis.js";
import { analyzeCropImage, GeminiServiceError } from "../utils/gemini.js";

// @route   POST /api/disease/analyze
// Field name "cropImage" matches exactly what the Android app's
// DiseaseRepository.kt sends via MultipartBody.Part.createFormData.
export const analyzeDisease = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "Please attach a crop image to analyze." });
  }

  try {
    const result = await analyzeCropImage({ buffer: req.file.buffer, mimeType: req.file.mimetype });

    const analysis = await DiseaseAnalysis.create({
      farmer: req.user._id,
      ...result,
    });

    res.status(201).json({ success: true, analysis });
  } catch (error) {
    if (error instanceof GeminiServiceError) {
      return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code });
    }
    next(error);
  }
};

// @route   GET /api/disease/history
export const getDiseaseHistory = async (req, res, next) => {
  try {
    const analyses = await DiseaseAnalysis.find({ farmer: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: analyses.length, analyses });
  } catch (error) {
    next(error);
  }
};
