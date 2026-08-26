import { searchMandiPrices } from "../utils/mandiPrices.js";

// @route   GET /api/mandi/prices?commodity=&state=&district=
export const getPrices = async (req, res, next) => {
  try {
    const { commodity, state, district } = req.query;
    const result = await searchMandiPrices({ commodity, state, district });
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};
