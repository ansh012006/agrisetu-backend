import { callGemini } from "./gemini.js";

const AGRICULTURE_CONTEXT = `You are AgriSetu AI, a helpful agricultural assistant for Indian farmers. You provide practical advice on:
- Crop selection and rotation
- Pest and disease management
- Weather-based farming decisions
- Government schemes (PM-KISAN, PMFBY, etc.)
- Market prices and selling strategies
- Sustainable farming practices
- Soil health and fertilizers
- Irrigation and water management

Be concise, practical, and use simple language. When mentioning government schemes, give accurate information.`;

export async function askAssistant(question, context = "") {
  if (!question || !String(question).trim()) {
  const { GeminiServiceError } = await import("./gemini.js");
  throw new GeminiServiceError("Question is required.", 400, "MISSING_QUESTION");
  }
  const prompt = `${AGRICULTURE_CONTEXT}

${context ? `Farmer context:\n${context}\n` : ""}Farmer's question: ${question}

Provide a helpful, concise answer (2-4 sentences):`;

  try {
  const answer = await callGemini(prompt);
  return answer;
  } catch (err) {
  throw err;
  }
}
