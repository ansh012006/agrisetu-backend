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

// ponytail: only remap known-shutdown models; pass anything else through so future models keep working
const DEAD_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-flash-lite",
  "gemini-1.5-pro",
  "gemini-1.0-pro",
];
const DEFAULT_MODEL = "gemini-3.8-flash";

// ponytail: fallback chain — if the preferred model is unavailable, try
// cheaper/lighter ones before giving up. This makes the AI assistant
// robust against model outages or key-tier mismatches.
const FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3.5-flash"];

function resolveModel(explicit) {
 const name = explicit || process.env.GEMINI_MODEL || DEFAULT_MODEL;
 if (DEAD_MODELS.includes(name)) {
  console.warn(`[Gemini] Model "${name}" is shut down, falling back to ${DEFAULT_MODEL}.`);
  return DEFAULT_MODEL;
 }
 return name;
}

function getClient() {
  if (!genAI) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiServiceError("GEMINI_API_KEY is not set.", 500, "MISSING_API_KEY");
  genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

// Tries the primary model then falls back through FALLBACK_MODELS if
// the primary is not found (404) or temporarily unavailable (503).
async function callWithFallbacks(modelFactory, prompt) {
 const primaryModel = resolveModel();
 const tried = [];

 // First try: primary model with streaming disabled for speed.
 let lastErr = null;
 for (const modelName of [primaryModel, ...FALLBACK_MODELS]) {
  if (tried.includes(modelName)) continue; // deduplicate
  tried.push(modelName);
  try {
  const model = modelFactory(modelName);
  const result = await model.generateContent(prompt);
  return result;
  } catch (err) {
  lastErr = err;
  const msg = err?.message || String(err);
  // Only fall back on 404 (model not found) or 503 (overloaded).
  // For other errors (quota 429, invalid key 400, etc.) we don't
  // want to waste API calls on every fallback.
  if (/404|not found|unknown model|is not found|503|overloaded|unavailable/i.test(msg)) {
   console.warn(`[Gemini] Model "${modelName}" unavailable (${msg.slice(0, 100)}), trying next fallback...`);
   continue;
  }
  // For non-retryable errors, surface immediately.
  break;
  }
 }
 // All models failed — surface the last error so mapGeminiError can translate it.
 throw lastErr;
}

// ponytail: surface real cause (bad model vs bad key vs quota) instead of generic 502
function mapGeminiError(err, fallbackCode = "ANALYSIS_ERROR") {
  if (err instanceof GeminiServiceError) return err;
  const msg = err?.message || String(err);
  if (/404|not found|unknown model|is not found/i.test(msg))
  return new GeminiServiceError(`Gemini model not found. Contact support to update the model name. Details: ${msg.slice(0, 200)}`, 502, "MODEL_NOT_FOUND");
  if (/400|invalid.*key|API key|API_KEY/i.test(msg))
  return new GeminiServiceError(`Invalid Gemini API key. Get one from Google AI Studio (starts with AIza). Details: ${msg.slice(0, 200)}`, 502, "INVALID_API_KEY");
  if (/429|quota|rate limit|exhausted/i.test(msg))
  return new GeminiServiceError("Gemini quota exceeded. Try again later.", 429, "QUOTA_EXCEEDED");
  if (/503|overloaded|unavailable/i.test(msg))
  return new GeminiServiceError("Gemini service temporarily overloaded. Try again in a few seconds.", 503, "SERVICE_UNAVAILABLE");
  return new GeminiServiceError(`AI service error: ${msg.slice(0, 300)}`, 502, fallbackCode);
}

export async function callGemini(prompt, options = {}) {
  try {
  const client = getClient();
  const modelName = resolveModel(options.model);

  const timeoutMs = options.timeout || parseInt(process.env.GEMINI_TIMEOUT_MS || "120000");

  const result = await Promise.race([
  callWithFallbacks(
  (name) => client.getGenerativeModel({ model: name }),
  prompt
  ),
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
  } catch (err) {
  throw mapGeminiError(err, "GEMINI_ERROR");
  }
}

export async function analyzeCropImage({ buffer, mimeType }) {
  if (!buffer) throw new GeminiServiceError("Image buffer is required.", 400, "MISSING_IMAGE");

  // ponytail: rich shape matches Android DiseaseAnalysis, old fields kept for compat
  const prompt = `You are an expert agricultural AI. Analyze this crop image and respond ONLY with valid JSON in this exact format (no markdown, no extra text):
  {"cropName":"crop name","diseaseName":"disease name or Healthy","isHealthy":false,"confidence":0-100,"severity":"healthy|mild|moderate|severe|critical","symptoms":["s1"],"possibleCauses":["c1"],"treatment":["t1"],"recommendedPesticide":["p1"],"recommendedFertilizer":["f1"],"organicTreatment":["o1"],"preventiveMeasures":["m1"],"description":"brief description","cropsAffected":["crop1"]}`;

  const imagePart = { inlineData: { mimeType: mimeType || "image/jpeg", data: buffer.toString("base64") } };

  try {
  const client = getClient();
  const modelName = resolveModel();

  const result = await Promise.race([
  callWithFallbacks(
  (name) => client.getGenerativeModel({ model: name }),
  [prompt, imagePart]
  ),
  new Promise((_, reject) =>
  setTimeout(() => reject(new GeminiServiceError("Analysis timed out.", 504, "TIMEOUT")), parseInt(process.env.GEMINI_VISION_TIMEOUT_MS || "60000"))
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
  throw mapGeminiError(err, "ANALYSIS_ERROR");
  }
}
