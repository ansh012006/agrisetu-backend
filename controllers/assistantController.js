import { askAssistant } from "../utils/assistantAI.js";
import { GeminiServiceError } from "../utils/gemini.js";
import Land from "../models/Land.js";
import DiseaseAnalysis from "../models/DiseaseAnalysis.js";
import Order from "../models/Order.js";
import Booking from "../models/Booking.js";
import Coupon from "../models/Coupon.js";
import CropRecommendation from "../models/CropRecommendation.js";

// @route   POST /api/assistant/ask
// @access  farmer
export const askAssistantHandler = async (req, res, next) => {
  try {
    const { question, location } = req.body;
    // ponytail: pull location from user's saved land if not passed in
    let resolvedLocation = location;
    if (!resolvedLocation || (!resolvedLocation.state && !resolvedLocation.district)) {
      try {
        const firstLand = await Land.findOne({ farmer: req.user._id }).lean();
        if (firstLand) {
          resolvedLocation = {
            state: firstLand.location?.state || "",
            district: firstLand.location?.district || "",
            village: firstLand.location?.village || "",
          };
        }
      } catch {
        // ignore — proceed without location
      }
    }
    const answer = await askAssistant(question, "", resolvedLocation || null);
    res.status(200).json({ success: true, answer });
  } catch (error) {
    if (error instanceof GeminiServiceError) {
      return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code });
    }
    next(error);
  }
};

// @route   POST /api/assistant/contextual-ask
// Android AssistantRepository.askContextual expects this with { answer, dataUsed }
export const contextualAskHandler = async (req, res, next) => {
  try {
    const { question } = req.body;
    const farmerId = req.user._id;
    const [lands, diseases, orders, bookings, coupons, crops] = await Promise.all([
      Land.find({ farmer: farmerId }).limit(5).lean(),
      DiseaseAnalysis.find({ farmer: farmerId }).sort({ createdAt: -1 }).limit(3).lean(),
      Order.find({ buyer: farmerId }).sort({ createdAt: -1 }).limit(3).lean(),
      Booking.find({ renter: farmerId }).sort({ createdAt: -1 }).limit(3).lean(),
      Coupon.find({ farmer: farmerId, status: "active" }).limit(5).lean(),
      CropRecommendation.find({ farmer: farmerId }).sort({ createdAt: -1 }).limit(3).lean(),
    ]);
    const context = [
      lands.length ? `Lands: ${lands.map((l) => `${l.landName} (${l.area?.value}${l.area?.unit}, ${l.soilType || "unknown soil"})`).join("; ")}` : "",
      diseases.length ? `Recent diseases: ${diseases.map((d) => d.diseaseName).join(", ")}` : "",
      crops.length ? `Past recommendations: ${crops.flatMap((c) => (Array.isArray(c.recommendedCrops) ? c.recommendedCrops.map((x) => (typeof x === "string" ? x : x.cropName)) : [])).join(", ")}` : "",
      orders.length ? `Orders: ${orders.length}` : "",
      bookings.length ? `Bookings: ${bookings.length}` : "",
      coupons.length ? `Active coupons: ${coupons.length}` : "",
    ].filter(Boolean).join("\n");
    const firstLand = lands[0] || {};
    const location = {
      state: firstLand.location?.state || "",
      district: firstLand.location?.district || "",
      village: firstLand.location?.village || "",
    };
    const answer = await askAssistant(question, context, location);
    res.status(200).json({
      success: true,
      answer,
      dataUsed: {
        hasLands: lands.length > 0,
        hasDiseaseHistory: diseases.length > 0,
        hasOrders: orders.length > 0,
        hasBookings: bookings.length > 0,
        hasCoupons: coupons.length > 0,
      },
    });
  } catch (error) {
    if (error instanceof GeminiServiceError) {
      return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code });
    }
    next(error);
  }
};
