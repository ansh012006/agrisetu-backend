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

// ponytail: take user location so advice is region-specific (e.g. monsoon timing, mandi prices)
export async function askAssistant(question, context = "", location = null) {
  if (!question || !String(question).trim()) {
  const { GeminiServiceError } = await import("./gemini.js");
  throw new GeminiServiceError("Question is required.", 400, "MISSING_QUESTION");
  }

  let locationBlock = "";
  if (location) {
  const parts = [];
  if (location.state) parts.push(`State: ${location.state}`);
  if (location.district) parts.push(`District: ${location.district}`);
  if (location.village) parts.push(`Village: ${location.village}`);
  if (location.season) parts.push(`Season: ${location.season}`);
  if (parts.length > 0) locationBlock = `\n\nUser's location:\n${parts.join(", ")}\n`;
  }

  const prompt = `${AGRICULTURE_CONTEXT}${locationBlock}

${context ? `Farmer context:\n${context}\n` : ""}Farmer's question: ${question}

Provide a helpful, concise answer (2-4 sentences). Tailor the answer to the user's location when relevant (e.g. sowing windows, regional pests, local schemes).`;

  try {
  // ponytail: lite model for short chat answers; vision keeps full model
  const answer = await callGemini(prompt, { model: process.env.GEMINI_CHAT_MODEL || "gemini-3.8-flash" });
  return answer;
  } catch (err) {
  throw err;
  }
}
