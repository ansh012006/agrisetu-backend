import express from "express";
import {
 createMachineryHandler,
 browseMachineryHandler,
 getMyMachineryHandler,
 deactivateMachineryHandler,
 updateMachineryHandler,
 createBookingHandler,
 getMyBookingsHandler,
 getReceivedBookingsHandler,
 updateBookingStatusHandler,
} from "../controllers/machineryController.js";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../utils/roles.js";

const router = express.Router();
router.use(authenticate);

router.post("/", authorize("farmer", "dealer", "buyer", "machinery_owner"), createMachineryHandler);
router.get("/", browseMachineryHandler);
router.get("/mine", authorize("farmer", "dealer", "buyer", "machinery_owner"), getMyMachineryHandler);
router.patch("/:id/deactivate", authorize("farmer", "dealer", "buyer", "machinery_owner"), deactivateMachineryHandler);
router.patch("/:id", authorize("farmer", "dealer", "buyer", "machinery_owner"), updateMachineryHandler);

router.post("/bookings", authorize("farmer", "dealer", "buyer", "machinery_owner"), createBookingHandler);
router.get("/bookings/mine", authorize("farmer", "dealer", "buyer", "machinery_owner"), getMyBookingsHandler);
router.get("/bookings/received", authorize("farmer", "dealer", "buyer", "machinery_owner"), getReceivedBookingsHandler);
router.patch("/bookings/:id/status", authorize("farmer", "dealer", "buyer", "machinery_owner"), updateBookingStatusHandler);

export default router;
