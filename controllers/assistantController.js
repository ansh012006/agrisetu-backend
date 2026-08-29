import { askAssistant } from "../utils/assistantAI.js";
import { GeminiServiceError } from "../utils/gemini.js";

// @route   POST /api/assistant/ask
// @access  farmer
export const askAssistantHandler = async (req, res, next) => {
  try {
    const { question } = req.body;
    const answer = await askAssistant(question);
    res.status(200).json({ success: true, answer });
  } catch (error) {
    if (error instanceof GeminiServiceError) {
      return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code });
    }
    next(error);
  }
};
