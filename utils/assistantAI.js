import { GoogleGenerativeAI } from "@google/generative-ai";
import { GeminiServiceError } from "./gemini.js";

const TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 30000;

const SYSTEM_PROMPT =
  "You are AgriSetu's farmer assistant, helping Indian farmers with practical questions " +
  "about crops, farming techniques, government schemes, market prices, weather-related " +
  "farming decisions, and using this app. Answer in clear, simple language a farmer with " +
  "no technical background can follow. Keep answers concise - a few short paragraphs at " +
  "most, not an essay. If a question involves a specific pesticide dosage, medical " +
  "situation, or anything requiring in-person expert judgment, say so plainly and suggest " +
  "they consult their local agriculture officer or Krishi Vigyan Kendra rather than " +
  "guessing at specifics that could cause real harm if wrong.";

const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new GeminiServiceError("The AI service took too long to respond. Please try again.", 504, "TIMEOUT")), ms)
    ),
  ]);

/**
 * Deliberately stateless for this first version - each question is
 * answered independently, with no memory of earlier questions in the
 * same session. A real multi-turn conversation (remembering context
 * across questions) is a reasonable future improvement, but adds real
 * complexity (conversation storage, context-window management) that
 * isn't justified for a first working version of this feature.
 */
export const askAssistant = async (question) => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new GeminiServiceError("The AI assistant is not configured on the server (missing GEMINI_API_KEY).", 503, "NOT_CONFIGURED");
  }
  if (!question || !question.trim()) {
    throw new GeminiServiceError("A question is required.", 400, "MISSING_QUESTION");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
    systemInstruction: SYSTEM_PROMPT,
  });

  let result;
  try {
    result = await withTimeout(model.generateContent(question.trim()), TIMEOUT_MS);
  } catch (err) {
    if (err instanceof GeminiServiceError) throw err;

    const status = err?.status ?? err?.response?.status ?? err?.cause?.status;
    if (status === 429) {
      throw new GeminiServiceError("The AI assistant is receiving too many requests right now. Please try again in a moment.", 429, "RATE_LIMITED");
    }
    if (status === 401 || status === 403) {
      throw new GeminiServiceError("The AI assistant rejected the request. The API key may be invalid or lack permission.", 502, "AUTH_FAILED");
    }
    console.error("[Assistant] Unclassified error reaching the AI service:", err?.message || err, err?.cause || "");
    throw new GeminiServiceError("Could not reach the AI assistant. Please check your network connection and try again.", 502, "NETWORK_ERROR");
  }

  const answer = result?.response?.text()?.trim();
  if (!answer) {
    throw new GeminiServiceError("The AI assistant did not return an answer. Please try rephrasing your question.", 502, "EMPTY_RESPONSE");
  }

  return answer;
};
