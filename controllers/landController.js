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

// @route   PATCH /api/lands/:id
export const updateLand = async (req, res, next) => {
  try {
    const land = await Land.findById(req.params.id);
    if (!land) return res.status(404).json({ success: false, message: "Land not found." });
    if (land.farmer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "You do not have access to this land." });
    }

    const { landName, areaValue, areaUnit, state, district, village, soilType, currentCrop, ownershipStatus, irrigationAvailable } = req.body;

    if (landName !== undefined) land.landName = landName;
    if (areaValue !== undefined) land.area.value = Number(areaValue);
    if (areaUnit !== undefined) land.area.unit = areaUnit;
    if (state !== undefined) land.location.state = state;
    if (district !== undefined) land.location.district = district;
    if (village !== undefined) land.location.village = village;
    if (soilType !== undefined) land.soilType = soilType;
    if (currentCrop !== undefined) land.currentCrop = currentCrop;
    if (ownershipStatus !== undefined) land.ownershipStatus = ownershipStatus;
    if (irrigationAvailable !== undefined) land.irrigationAvailable = irrigationAvailable === true || irrigationAvailable === "true";

    await land.save();
    res.status(200).json({ success: true, land });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/lands/:id
export const deleteLand = async (req, res, next) => {
  try {
    const land = await Land.findById(req.params.id);
    if (!land) return res.status(404).json({ success: false, message: "Land not found." });
    if (land.farmer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "You do not have access to this land." });
    }
    await land.deleteOne();
    res.status(200).json({ success: true, message: "Land removed." });
  } catch (error) {
    next(error);
  }
};
