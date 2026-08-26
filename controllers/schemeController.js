import GovernmentScheme from "../models/GovernmentScheme.js";

// @route   GET /api/schemes
export const getSchemes = async (req, res, next) => {
  try {
    const schemes = await GovernmentScheme.find({ isActive: true }).sort({ displayOrder: 1, name: 1 });
    res.status(200).json({ success: true, count: schemes.length, schemes });
  } catch (error) {
    next(error);
  }
};
