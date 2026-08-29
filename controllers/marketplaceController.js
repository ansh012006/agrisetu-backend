import { validationResult } from "express-validator";
import {
  createListing,
  browseListings,
  getMyListings,
  deactivateListing,
  updateListing,
  placeOrder,
  getMyOrders,
  getReceivedOrders,
  updateOrderStatus,
  MarketplaceError,
} from "../services/marketplaceService.js";

const handleMarketplaceError = (error, res, next) => {
  if (error instanceof MarketplaceError) {
    return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code });
  }
  next(error);
};

// @route   POST /api/marketplace/listings
export const createListingHandler = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    const listing = await createListing(req.user._id, req.body);
    res.status(201).json({ success: true, listing });
  } catch (error) {
    handleMarketplaceError(error, res, next);
  }
};

// @route   GET /api/marketplace/listings?category=&search=
export const browseListingsHandler = async (req, res, next) => {
  try {
    const { category, search } = req.query;
    const listings = await browseListings({ category, search });
    res.status(200).json({ success: true, count: listings.length, listings });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/marketplace/listings/mine
export const getMyListingsHandler = async (req, res, next) => {
  try {
    const listings = await getMyListings(req.user._id);
    res.status(200).json({ success: true, count: listings.length, listings });
  } catch (error) {
    next(error);
  }
};

// @route   PATCH /api/marketplace/listings/:id/deactivate
export const deactivateListingHandler = async (req, res, next) => {
  try {
    const listing = await deactivateListing(req.params.id, req.user._id);
    res.status(200).json({ success: true, listing });
  } catch (error) {
    handleMarketplaceError(error, res, next);
  }
};

// @route   PATCH /api/marketplace/listings/:id
export const updateListingHandler = async (req, res, next) => {
  try {
    const listing = await updateListing(req.params.id, req.user._id, req.body);
    res.status(200).json({ success: true, listing });
  } catch (error) {
    handleMarketplaceError(error, res, next);
  }
};

// @route   POST /api/marketplace/orders
export const placeOrderHandler = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    const { listingId, quantityOrdered } = req.body;
    const order = await placeOrder(req.user._id, { listingId, quantityOrdered: Number(quantityOrdered) });
    res.status(201).json({ success: true, order });
  } catch (error) {
    handleMarketplaceError(error, res, next);
  }
};

// @route   GET /api/marketplace/orders/mine
export const getMyOrdersHandler = async (req, res, next) => {
  try {
    const orders = await getMyOrders(req.user._id);
    res.status(200).json({ success: true, count: orders.length, orders });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/marketplace/orders/received
export const getReceivedOrdersHandler = async (req, res, next) => {
  try {
    const orders = await getReceivedOrders(req.user._id);
    res.status(200).json({ success: true, count: orders.length, orders });
  } catch (error) {
    next(error);
  }
};

// @route   PATCH /api/marketplace/orders/:id/status  { status }
export const updateOrderStatusHandler = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await updateOrderStatus(req.params.id, req.user._id, status);
    res.status(200).json({ success: true, order });
  } catch (error) {
    handleMarketplaceError(error, res, next);
  }
};
