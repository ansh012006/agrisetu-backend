import Land from "../models/Land.js";

// @route   GET /api/lands
export const getLands = async (req, res, next) => {
  try {
    const lands = await Land.find({ farmer: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: lands.length, lands });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/lands
export const createLand = async (req, res, next) => {
  try {
    const { landName, areaValue, areaUnit, state, district, village, soilType, currentCrop, ownershipStatus, irrigationAvailable } = req.body;

    if (!landName || !areaValue) {
      return res.status(400).json({ success: false, message: "Land name and area are required." });
    }

    const land = await Land.create({
      farmer: req.user._id,
      landName,
      area: { value: Number(areaValue), unit: areaUnit || "acre" },
      location: { state: state || "", district: district || "", village: village || "" },
      soilType: soilType || "",
      currentCrop: currentCrop || "",
      ownershipStatus: ownershipStatus || "owned",
      irrigationAvailable: irrigationAvailable === true || irrigationAvailable === "true",
    });

    res.status(201).json({ success: true, land });
  } catch (error) {
    next(error);
  }
};
