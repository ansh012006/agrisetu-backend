import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiServiceError extends Error {
 constructor(message, statusCode = 500, code = "GEMINI_ERROR") {
 super(message);
 this.statusCode = statusCode;
 this.code = code;
 this.name = "GeminiServiceError";
 }
}

let genAI = null;

function getClient() {
 if (!genAI) {
 const apiKey = process.env.GEMINI_API_KEY;
 if (!apiKey) throw new GeminiServiceError("GEMINI_API_KEY is not set.", 500, "MISSING_API_KEY");
 genAI = new GoogleGenerativeAI(apiKey);
 }
 return genAI;
}

export async function callGemini(prompt, options = {}) {
 const client = getClient();
 const modelName = options.model || process.env.GEMINI_MODEL || "gemini-2.0-flash";
 const model = client.getGenerativeModel({ model: modelName });

 const timeoutMs = options.timeout || parseInt(process.env.GEMINI_TIMEOUT_MS || "30000");

 const result = await Promise.race([
 model.generateContent(prompt),
 new Promise((_, reject) =>
 setTimeout(() => reject(new GeminiServiceError("Gemini request timed out.", 504, "TIMEOUT")), timeoutMs)
 ),
 ]);

 const response = await result.response;
 const text = response.text();

 if (!text || text.trim().length === 0) {
 throw new GeminiServiceError("Gemini returned an empty response.", 502, "EMPTY_RESPONSE");
 }

 return text.trim();
}

export async function analyzeCropImage({ buffer, mimeType }) {
  if (!buffer) throw new GeminiServiceError("Image buffer is required.", 400, "MISSING_IMAGE");

  // ponytail: rich shape matches Android DiseaseAnalysis, old fields kept for compat
  const prompt = `You are an expert agricultural AI. Analyze this crop image and respond ONLY with valid JSON in this exact format (no markdown, no extra text):
  {"cropName":"crop name","diseaseName":"disease name or Healthy","isHealthy":false,"confidence":0-100,"severity":"healthy|mild|moderate|severe|critical","symptoms":["s1"],"possibleCauses":["c1"],"treatment":["t1"],"recommendedPesticide":["p1"],"recommendedFertilizer":["f1"],"organicTreatment":["o1"],"preventiveMeasures":["m1"],"description":"brief description","cropsAffected":["crop1"]}`;

  const imagePart = { inlineData: { mimeType: mimeType || "image/jpeg", data: buffer.toString("base64") } };

  try {
  const client = getClient();
  const model = client.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-2.0-flash" });

  const result = await Promise.race([
  model.generateContent([prompt, imagePart]),
  new Promise((_, reject) =>
  setTimeout(() => reject(new GeminiServiceError("Analysis timed out.", 504, "TIMEOUT")), 30000)
  ),
  ]);

  const text = (await result.response).text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new GeminiServiceError("Could not parse analysis result.", 502, "PARSE_ERROR");

  const data = JSON.parse(jsonMatch[0]);
  const arr = (v) => (Array.isArray(v) ? v.map(String) : v ? [String(v)] : []);
  const isHealthy = data.isHealthy === true || String(data.diseaseName || "").toLowerCase() === "healthy";
  let severity = String(data.severity || "").toLowerCase();
  if (!["healthy", "mild", "moderate", "severe", "critical", "low", "medium", "high"].includes(severity)) severity = isHealthy ? "healthy" : "moderate";
  const treatmentArr = arr(data.treatment);
  return {
  cropName: data.cropName || "",
  diseaseName: data.diseaseName || "Unknown",
  isHealthy,
  confidence: Math.min(100, Math.max(0, Number(data.confidence) || 0)),
  description: data.description || "",
  treatment: treatmentArr.length === 1 && typeof data.treatment === "string" ? data.treatment : treatmentArr,
  severity,
  symptoms: arr(data.symptoms),
  possibleCauses: arr(data.possibleCauses),
  recommendedPesticide: arr(data.recommendedPesticide),
  recommendedFertilizer: arr(data.recommendedFertilizer),
  organicTreatment: arr(data.organicTreatment),
  preventiveMeasures: arr(data.preventiveMeasures),
  cropsAffected: Array.isArray(data.cropsAffected) ? data.cropsAffected : [],
  };
  } catch (err) {
  if (err instanceof GeminiServiceError) throw err;
  throw new GeminiServiceError("Image analysis failed: " + err.message, 502, "ANALYSIS_ERROR");
  }
}
