import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

export class GeminiServiceError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.name = "GeminiServiceError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

const TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 30000;

const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    cropName: { type: SchemaType.STRING },
    diseaseName: { type: SchemaType.STRING },
    isHealthy: { type: SchemaType.BOOLEAN },
    confidence: { type: SchemaType.NUMBER },
    severity: { type: SchemaType.STRING, enum: ["healthy", "mild", "moderate", "severe", "critical"] },
    symptoms: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    possibleCauses: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    treatment: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    recommendedPesticide: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    recommendedFertilizer: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    organicTreatment: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    preventiveMeasures: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  },
  required: ["cropName", "diseaseName", "isHealthy", "confidence", "severity"],
};

const PROMPT = `You are an agricultural expert analyzing a crop/leaf photo for a farmer.
Identify the crop, whether it shows disease/pest damage or is healthy, and if diseased,
the specific disease, your confidence (0-100), severity, visible symptoms, likely causes,
treatment steps, recommended pesticide/fertilizer categories (never exact spray
concentrations - always defer to the product label and a local expert), organic
alternatives, and preventive measures. If the image is unclear or not a plant, set
confidence low and explain in diseaseName.`;

const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new GeminiServiceError("The AI service took too long to respond. Please try again.", 504, "TIMEOUT")), ms)
    ),
  ]);

export const analyzeCropImage = async ({ buffer, mimeType }) => {
  // .trim() guards against a stray trailing space/newline from
  // copy-pasting the key into .env, which would otherwise be sent to
  // Google as part of the key and rejected as "invalid".
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new GeminiServiceError("AI disease analysis is not configured on the server (missing GEMINI_API_KEY).", 503, "NOT_CONFIGURED");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json", responseSchema },
  });

  let result;
  try {
    result = await withTimeout(
      model.generateContent([
        PROMPT,
        { inlineData: { data: buffer.toString("base64"), mimeType } },
      ]),
      TIMEOUT_MS
    );
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
    const text = result.response.text();
    parsed = JSON.parse(text);
  } catch (err) {
    throw new GeminiServiceError("The AI service returned an unexpected response. Please try again.", 502, "INVALID_RESPONSE");
  }

  if (!parsed.cropName || !parsed.diseaseName || typeof parsed.confidence !== "number") {
    throw new GeminiServiceError("The AI response was incomplete. Please try again with a clearer photo.", 502, "INCOMPLETE_RESPONSE");
  }

  return {
    ...parsed,
    confidence: Math.max(0, Math.min(100, parsed.confidence)),
    modelUsed: process.env.GEMINI_MODEL || "gemini-2.0-flash",
  };
};
