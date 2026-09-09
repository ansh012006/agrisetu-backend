import { callGemini } from "./gemini.js";

export async function getCropRecommendations({ soilType, areaValue, areaUnit, state, district, irrigationAvailable, currentCrop }) {
  // ponytail: rich shape matches Android CropRecommendation, strings kept for compat
  const prompt = `As an agricultural expert for India, recommend the best crops for the following conditions:

  Soil Type: ${soilType || "Not specified"}
  Area: ${areaValue || "?"} ${areaUnit || "acres"}
  State: ${state || "Not specified"}
  District: ${district || "Not specified"}
  Irrigation Available: ${irrigationAvailable ? "Yes" : "No"}
  Current Crop: ${currentCrop || "None"}

  Respond ONLY with valid JSON in this exact format:
  {"recommendedCrops":[{"cropName":"Wheat","suitabilityScore":90,"reasoning":"why","expectedYield":"4t/ha"}],"reasoning":"brief explanation","generalAdvice":["tip1"],"soilConsiderations":["s1"],"weatherConsiderations":["w1"],"season":"kharif/rabi/zaid","confidence":0-100}`;

  try {
  const text = await callGemini(prompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not parse recommendations.");

  const data = JSON.parse(jsonMatch[0]);
  let crops = [];
  if (Array.isArray(data.recommendedCrops)) {
  crops = data.recommendedCrops.map((c) => (typeof c === "string" ? { cropName: c, suitabilityScore: 80, reasoning: "", expectedYield: "" } : { cropName: c.cropName || String(c), suitabilityScore: Number(c.suitabilityScore) || 80, reasoning: c.reasoning || "", expectedYield: c.expectedYield || "" }));
  }
  const arr = (v) => (Array.isArray(v) ? v.map(String) : []);
  return {
  recommendedCrops: crops,
  reasoning: data.reasoning || "",
  generalAdvice: arr(data.generalAdvice),
  soilConsiderations: arr(data.soilConsiderations),
  weatherConsiderations: arr(data.weatherConsiderations),
  season: data.season || "kharif",
  confidence: Math.min(100, Math.max(0, Number(data.confidence) || 75)),
  };
  } catch (err) {
  if (err.name === "GeminiServiceError") throw err;
  throw new Error("Crop recommendation failed: " + err.message);
  }
}
