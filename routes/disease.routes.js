import express from "express";
import multer from "multer";
import { authenticate } from "../middleware/auth.js";
import { analyzeDisease, getDiseaseHistory } from "../controllers/diseaseController.js";

const router = express.Router();
router.use(authenticate);

const storage = multer.memoryStorage();
const upload = multer({
 storage,
 limits: { fileSize: 5 * 1024 * 1024 },
 fileFilter: (req, file, cb) => {
 if (file.mimetype.startsWith("image/")) cb(null, true);
 else cb(new Error("Only image files are allowed."));
 },
});

router.post("/analyze", upload.single("cropImage"), analyzeDisease);
router.get("/history", getDiseaseHistory);

export default router;
