import mongoose from "mongoose";
import Listing from "../models/Listing.js";
import Order from "../models/Order.js";
import { ApiError } from "../utils/apiHelpers.js";

export class MarketplaceError extends ApiError {
  constructor(message, statusCode = 400, code = "MARKETPLACE_ERROR") {
  super(message, statusCode, code);
  this.name = "MarketplaceError";
  }
}

// ponytail: status alias for Android (expects status, DB uses isActive)
const toListingDTO = (l) => {
  if (!l) return l;
  const o = { ...l };
  // seller must be an object for Gson; unpopulated ObjectId strings crash the app
  if (typeof o.seller === "string") o.seller = { name: "" };
  if (o.isActive === false || o.quantityAvailable <= 0) o.status = "inactive";
  else o.status = o.status || "active";
  return o;
};

const populateListing = (id) =>
  Listing.findById(id).populate("seller", "name phone location").lean();

const toOrderDTO = (ord) => {
  if (!ord) return ord;
  const o = { ...ord };
  if (typeof o.buyer === "string") o.buyer = { name: "" };
  if (typeof o.seller === "string") o.seller = { name: "" };
  return o;
};

const populateOrder = (id) =>
  Order.findById(id).populate("buyer", "name phone").populate("seller", "name phone").populate("listing", "productName category").lean();

export async function createListing(sellerId, body) {
  const { productName, category, description, quantityAvailable, unit, pricePerUnit, images, location, state, district } = body;
  if (!productName || !category || !quantityAvailable || !pricePerUnit) {
  throw new MarketplaceError("Product name, category, quantity, and price are required.", 400, "MISSING_FIELDS");
  }
  const created = await Listing.create({
  seller: sellerId,
  productName,
  category,
  description: description || "",
  quantityAvailable: Number(quantityAvailable),
  unit: unit || "kg",
  pricePerUnit: Number(pricePerUnit),
  images: images || [],
  location: location || { state: state || "", district: district || "" },
  });
  return toListingDTO((await populateListing(created._id)) || created.toObject());
}

export async function browseListings({ category, search }) {
  const filter = { isActive: true };
  if (category) filter.category = new RegExp(category, "i");
  if (search) filter.productName = new RegExp(search, "i");
  const list = await Listing.find(filter).populate("seller", "name phone location").sort({ createdAt: -1 }).lean();
  return list.map(toListingDTO);
}

export async function getMyListings(sellerId) {
  const list = await Listing.find({ seller: sellerId }).populate("seller", "name phone location").sort({ createdAt: -1 }).lean();
  return list.map(toListingDTO);
}

export async function deactivateListing(listingId, sellerId) {
  const listing = await Listing.findOne({ _id: listingId, seller: sellerId });
  if (!listing) throw new MarketplaceError("Listing not found.", 404, "NOT_FOUND");
  listing.isActive = false;
  await listing.save();
  return toListingDTO((await populateListing(listing._id)) || listing.toObject());
}

export async function updateListing(listingId, sellerId, body) {
  const listing = await Listing.findOne({ _id: listingId, seller: sellerId });
  if (!listing) throw new MarketplaceError("Listing not found.", 404, "NOT_FOUND");

  const allowed = ["productName", "description", "quantityAvailable", "pricePerUnit", "images", "location"];
  for (const key of allowed) {
  if (body[key] !== undefined) listing[key] = body[key];
  }
  await listing.save();
  return toListingDTO((await populateListing(listing._id)) || listing.toObject());
}

export async function placeOrder(buyerId, { listingId, quantityOrdered }) {
 if (!listingId || !quantityOrdered) throw new MarketplaceError("Listing ID and quantity are required.", 400, "MISSING_FIELDS");

 const listing = await Listing.findById(listingId);
 if (!listing) throw new MarketplaceError("Listing not found.", 404, "NOT_FOUND");
 if (!listing.isActive) throw new MarketplaceError("This listing is no longer active.", 400, "INACTIVE");
 if (listing.seller.toString() === buyerId.toString()) throw new MarketplaceError("Cannot order your own listing.", 400, "OWN_LISTING");
 if (listing.quantityAvailable < Number(quantityOrdered)) throw new MarketplaceError("Insufficient quantity available.", 400, "INSUFFICIENT_QTY");

 listing.quantityAvailable -= Number(quantityOrdered);
 if (listing.quantityAvailable <= 0) listing.isActive = false;
 await listing.save();

  const totalPrice = Number(quantityOrdered) * Number(listing.pricePerUnit);
  const order = await Order.create({
  listing: listing._id,
  seller: listing.seller,
  buyer: buyerId,
  productName: listing.productName,
  quantityOrdered: Number(quantityOrdered),
  unit: listing.unit,
  pricePerUnit: Number(listing.pricePerUnit),
  totalPrice,
  });

  return toOrderDTO((await populateOrder(order._id)) || order.toObject());
}

export async function getMyOrders(buyerId) {
  const list = await Order.find({ buyer: buyerId }).populate("seller", "name phone").populate("buyer", "name phone").populate("listing", "productName category").sort({ createdAt: -1 }).lean();
  return list.map(toOrderDTO);
}

export async function getReceivedOrders(sellerId) {
  const list = await Order.find({ seller: sellerId }).populate("buyer", "name phone location").populate("seller", "name phone").populate("listing", "productName category").sort({ createdAt: -1 }).lean();
  return list.map(toOrderDTO);
}

export async function updateOrderStatus(orderId, sellerId, status) {
  const valid = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
  if (!valid.includes(status)) throw new MarketplaceError("Invalid status.", 400, "INVALID_STATUS");

  const order = await Order.findOne({ _id: orderId, seller: sellerId });
  if (!order) throw new MarketplaceError("Order not found.", 404, "NOT_FOUND");
  order.status = status;
  await order.save();
  return toOrderDTO((await populateOrder(order._id)) || order.toObject());
}
