import express from "express";
import { body } from "express-validator";
import {
  createMachineryHandler,
  browseMachineryHandler,
  getMyMachineryHandler,
  deactivateMachineryHandler,
  createBookingHandler,
  getMyBookingsHandler,
  getReceivedBookingsHandler,
  updateBookingStatusHandler,
} from "../controllers/machineryController.js";
import { protect, authorize } from "../middleware/auth.js";
import { ROLES } from "../utils/roles.js";
import { MACHINERY_CATEGORIES } from "../models/Machinery.js";

const router = express.Router();

router.use(protect);

// Renting: farmers browse and book equipment.
router.get("/", authorize(ROLES.FARMER), browseMachineryHandler);
router.post(
  "/bookings",
  authorize(ROLES.FARMER),
  [
    body("machineryId").isMongoId().withMessage("A valid machinery listing is required"),
    body("startDate").notEmpty().withMessage("startDate is required"),
    body("endDate").notEmpty().withMessage("endDate is required"),
  ],
  createBookingHandler
);
router.get("/bookings/mine", authorize(ROLES.FARMER), getMyBookingsHandler);

// Listing: only machinery owners list and manage their own equipment.
router.get("/mine", authorize(ROLES.MACHINERY_OWNER), getMyMachineryHandler);
router.post(
  "/",
  authorize(ROLES.MACHINERY_OWNER),
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("category").isIn(MACHINERY_CATEGORIES).withMessage("Select a valid category"),
    body("rentPricePerDay").isFloat({ gt: 0 }).withMessage("Rent price must be greater than 0"),
  ],
  createMachineryHandler
);
router.patch("/:id/deactivate", authorize(ROLES.MACHINERY_OWNER), deactivateMachineryHandler);
router.get("/bookings/received", authorize(ROLES.MACHINERY_OWNER), getReceivedBookingsHandler);
router.patch("/bookings/:id/status", authorize(ROLES.MACHINERY_OWNER), updateBookingStatusHandler);

export default router;
