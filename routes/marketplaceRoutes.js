import express from "express";
import { body } from "express-validator";
import {
  createListingHandler,
  browseListingsHandler,
  getMyListingsHandler,
  deactivateListingHandler,
  placeOrderHandler,
  getMyOrdersHandler,
  getReceivedOrdersHandler,
  updateOrderStatusHandler,
} from "../controllers/marketplaceController.js";
import { protect, authorize } from "../middleware/auth.js";
import { ROLES } from "../utils/roles.js";
import { LISTING_CATEGORIES, LISTING_UNITS } from "../models/Listing.js";

const router = express.Router();

router.use(protect);

// Browsing and buying: both farmer and buyer participate in the
// marketplace as buyers (a farmer might purchase another farmer's
// produce), so these routes accept either role.
router.get("/listings", authorize(ROLES.FARMER, ROLES.BUYER), browseListingsHandler);
router.post(
  "/orders",
  authorize(ROLES.FARMER, ROLES.BUYER),
  [
    body("listingId").isMongoId().withMessage("A valid listing is required"),
    body("quantityOrdered").isFloat({ gt: 0 }).withMessage("Quantity must be greater than 0"),
  ],
  placeOrderHandler
);
router.get("/orders/mine", authorize(ROLES.FARMER, ROLES.BUYER), getMyOrdersHandler);

// Selling: only farmers list and sell produce on this marketplace.
router.get("/listings/mine", authorize(ROLES.FARMER), getMyListingsHandler);
router.post(
  "/listings",
  authorize(ROLES.FARMER),
  [
    body("productName").trim().notEmpty().withMessage("Product name is required"),
    body("category").isIn(LISTING_CATEGORIES).withMessage("Select a valid category"),
    body("quantityAvailable").isFloat({ gt: 0 }).withMessage("Quantity must be greater than 0"),
    body("unit").isIn(LISTING_UNITS).withMessage("Select a valid unit"),
    body("pricePerUnit").isFloat({ gt: 0 }).withMessage("Price must be greater than 0"),
  ],
  createListingHandler
);
router.patch("/listings/:id/deactivate", authorize(ROLES.FARMER), deactivateListingHandler);
router.get("/orders/received", authorize(ROLES.FARMER), getReceivedOrdersHandler);
router.patch("/orders/:id/status", authorize(ROLES.FARMER), updateOrderStatusHandler);

export default router;
