import express from "express";
import {
 createListingHandler,
 browseListingsHandler,
 getMyListingsHandler,
 deactivateListingHandler,
 updateListingHandler,
 placeOrderHandler,
 getMyOrdersHandler,
 getReceivedOrdersHandler,
 updateOrderStatusHandler,
} from "../controllers/marketplaceController.js";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../utils/roles.js";

const router = express.Router();

router.use(authenticate);

router.post("/listings", authorize("farmer", "dealer", "buyer", "machinery_owner"), createListingHandler);
router.get("/listings", browseListingsHandler);
router.get("/listings/mine", authorize("farmer", "dealer", "buyer", "machinery_owner"), getMyListingsHandler);
router.patch("/listings/:id/deactivate", authorize("farmer", "dealer", "buyer", "machinery_owner"), deactivateListingHandler);
router.patch("/listings/:id", authorize("farmer", "dealer", "buyer", "machinery_owner"), updateListingHandler);

router.post("/orders", authorize("farmer", "dealer", "buyer", "machinery_owner"), placeOrderHandler);
router.get("/orders/mine", authorize("farmer", "dealer", "buyer", "machinery_owner"), getMyOrdersHandler);
router.get("/orders/received", authorize("farmer", "dealer", "buyer", "machinery_owner"), getReceivedOrdersHandler);
router.patch("/orders/:id/status", authorize("farmer", "dealer", "buyer", "machinery_owner"), updateOrderStatusHandler);

export default router;
