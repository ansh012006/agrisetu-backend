import CropRecommendation from "../models/CropRecommendation.js";
import Land from "../models/Land.js";
import { getCropRecommendations } from "../utils/cropRecommendation.js";
import { GeminiServiceError } from "../utils/gemini.js";

// @route   POST /api/crop-recommendations  { landId }
export const generateRecommendation = async (req, res, next) => {
  try {
    const { landId } = req.body;
    if (!landId) {
      return res.status(400).json({ success: false, message: "landId is required." });
    }

    const land = await Land.findById(landId);
    if (!land) {
      return res.status(404).json({ success: false, message: "Land record not found." });
    }
    if (land.farmer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "You do not have access to this land record." });
    }

    const result = await getCropRecommendations({
      soilType: land.soilType,
      areaValue: land.area.value,
      areaUnit: land.area.unit,
      state: land.location?.state,
      district: land.location?.district,
      irrigationAvailable: land.irrigationAvailable,
      currentCrop: land.currentCrop,
    });

    const recommendation = await CropRecommendation.create({
      farmer: req.user._id,
      land: land._id,
      ...result,
    });

    res.status(201).json({ success: true, recommendation });
  } catch (error) {
    if (error instanceof GeminiServiceError) {
      return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code });
    }
    next(error);
  }
};

// @route   GET /api/crop-recommendations/history
export const getRecommendationHistory = async (req, res, next) => {
  try {
    const recommendations = await CropRecommendation.find({ farmer: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: recommendations.length, recommendations });
  } catch (error) {
    next(error);
  }
};
