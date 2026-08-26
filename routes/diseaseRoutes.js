import express from "express";
import multer from "multer";
import { analyzeDisease, getDiseaseHistory } from "../controllers/diseaseController.js";
import { protect, authorize } from "../middleware/auth.js";
import { ROLES } from "../utils/roles.js";

const router = express.Router();

// memoryStorage - the image only needs to reach Gemini as a base64
// buffer, never gets written to disk or served back, so there's no
// uploads/ directory to manage or clean up.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed."));
    }
    cb(null, true);
  },
});

router.use(protect, authorize(ROLES.FARMER));

router.post("/analyze", upload.single("cropImage"), analyzeDisease);
router.get("/history", getDiseaseHistory);

export default router;
