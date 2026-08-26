import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { GeminiServiceError } from "./gemini.js";

const TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 30000;

const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    recommendedCrops: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          cropName: { type: SchemaType.STRING },
          suitabilityScore: { type: SchemaType.NUMBER },
          reasoning: { type: SchemaType.STRING },
          expectedYield: { type: SchemaType.STRING },
        },
        required: ["cropName", "suitabilityScore", "reasoning"],
      },
    },
    soilConsiderations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    weatherConsiderations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    generalAdvice: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  },
  required: ["recommendedCrops"],
};

const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new GeminiServiceError("The AI service took too long to respond. Please try again.", 504, "TIMEOUT")), ms)
    ),
  ]);

export const getCropRecommendations = async ({ soilType, areaValue, areaUnit, state, district, irrigationAvailable, currentCrop }) => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new GeminiServiceError("AI crop recommendation is not configured on the server (missing GEMINI_API_KEY).", 503, "NOT_CONFIGURED");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json", responseSchema },
  });

  const prompt = `You are an agricultural expert. Recommend 3-5 suitable crops for this farmland:
Soil type: ${soilType || "unknown"}
Land area: ${areaValue} ${areaUnit}
Location: ${district || ""}, ${state || ""}
Irrigation available: ${irrigationAvailable ? "yes" : "no (rainfed)"}
Current/previous crop: ${currentCrop || "none specified"}

For each crop give a suitability score (0-100), brief reasoning, and expected yield range.
Also give general soil, weather, and farming advice as short bullet points.`;

  let result;
  try {
    result = await withTimeout(model.generateContent(prompt), TIMEOUT_MS);
  } catch (err) {
    if (err instanceof GeminiServiceError) throw err;
    const status = err?.status ?? err?.response?.status ?? err?.cause?.status;
    if (status === 429) {
      throw new GeminiServiceError("The AI service is receiving too many requests right now. Please try again in a moment.", 429, "RATE_LIMITED");
    }
    if (status === 401 || status === 403) {
      throw new GeminiServiceError("The AI service rejected the request. The API key may be invalid or lack permission.", 502, "AUTH_FAILED");
    }
    throw new GeminiServiceError("Could not reach the AI service. Please check your network connection and try again.", 502, "NETWORK_ERROR");
  }

  let parsed;
  try {
    parsed = JSON.parse(result.response.text());
  } catch (err) {
    throw new GeminiServiceError("The AI service returned an unexpected response. Please try again.", 502, "INVALID_RESPONSE");
  }

  if (!parsed.recommendedCrops || parsed.recommendedCrops.length === 0) {
    throw new GeminiServiceError("The AI response was incomplete. Please try again.", 502, "INCOMPLETE_RESPONSE");
  }

  return {
    recommendedCrops: parsed.recommendedCrops,
    soilConsiderations: parsed.soilConsiderations || [],
    weatherConsiderations: parsed.weatherConsiderations || [],
    generalAdvice: parsed.generalAdvice || [],
  };
};
