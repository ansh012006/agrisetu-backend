import Listing from "../models/Listing.js";
import Order from "../models/Order.js";

export class MarketplaceError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.name = "MarketplaceError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const createListing = async (sellerId, data) => {
  const { productName, category, quantityAvailable, unit, pricePerUnit, description } = data;
  if (!productName || !category || !quantityAvailable || !unit || !pricePerUnit) {
    throw new MarketplaceError("productName, category, quantityAvailable, unit, and pricePerUnit are all required.", 400, "MISSING_FIELDS");
  }
  const listing = await Listing.create({
    seller: sellerId,
    productName,
    category,
    quantityAvailable,
    unit,
    pricePerUnit,
    description: description || "",
    status: "active",
  });
  // The Android app's Listing model expects `seller` as a populated
  // {name, location} object, matching what browseListings already
  // returns below - the freshly-created document only has seller as a
  // raw ObjectId, which fails to parse on the client (Gson throws
  // "Expected BEGIN_OBJECT but was STRING") since the shared model
  // expects an object, not a bare ID string. Re-fetch populated before
  // returning - the same fix already proven necessary for
  // generateCoupon in couponService.js.
  return Listing.findById(listing._id).populate("seller", "name location");
};

export const browseListings = async ({ category, search } = {}) => {
  const query = { status: "active", quantityAvailable: { $gt: 0 } };
  if (category) query.category = category;
  if (search) query.productName = { $regex: search, $options: "i" };
  return Listing.find(query).sort({ createdAt: -1 }).populate("seller", "name location");
};

export const getMyListings = async (sellerId) => {
  // Populated for the same reason as createListing above: even though
  // "my own listings" never needs to DISPLAY the seller's name (it's
  // always the viewing farmer themselves), Gson still parses this field
  // during JSON deserialization regardless of whether the UI later
  // reads it - an unpopulated raw ObjectId here would crash parsing the
  // whole list, not just silently leave a field unused.
  return Listing.find({ seller: sellerId }).sort({ createdAt: -1 }).populate("seller", "name location");
};

export const deactivateListing = async (listingId, sellerId) => {
  const listing = await Listing.findById(listingId);
  if (!listing) throw new MarketplaceError("Listing not found.", 404, "LISTING_NOT_FOUND");
  if (listing.seller.toString() !== sellerId.toString()) {
    throw new MarketplaceError("You do not have access to this listing.", 403, "FORBIDDEN");
  }
  listing.status = "inactive";
  await listing.save();
  return Listing.findById(listing._id).populate("seller", "name location");
};

/**
 * The atomic guard: a single findOneAndUpdate with the stock check
 * built into its own filter, so MongoDB serializes concurrent orders
 * against the same listing rather than needing application-level
 * locking - the exact same pattern already proven for coupon quota
 * reservation in services/couponService.js reserveQuota(). A second
 * concurrent request's filter is evaluated against the
 * already-decremented quantity from the first, and correctly fails if
 * there's no longer enough stock.
 */
export const placeOrder = async (buyerId, { listingId, quantityOrdered }) => {
  if (!quantityOrdered || quantityOrdered <= 0) {
    throw new MarketplaceError("Quantity must be a positive number.", 400, "INVALID_QUANTITY");
  }

  const listing = await Listing.findById(listingId);
  if (!listing) throw new MarketplaceError("Listing not found.", 404, "LISTING_NOT_FOUND");
  if (listing.seller.toString() === buyerId.toString()) {
    throw new MarketplaceError("You cannot order your own listing.", 400, "SELF_ORDER");
  }

  const updatedListing = await Listing.findOneAndUpdate(
    { _id: listingId, status: "active", quantityAvailable: { $gte: quantityOrdered } },
    { $inc: { quantityAvailable: -quantityOrdered } },
    { new: true }
  );

  if (!updatedListing) {
    const current = await Listing.findById(listingId).lean();
    const remaining = current?.status === "active" ? current.quantityAvailable : 0;
    throw new MarketplaceError(
      `Not enough stock available. Requested ${quantityOrdered}, but only ${remaining} ${listing.unit} remain.`,
      409,
      "INSUFFICIENT_STOCK"
    );
  }

  if (updatedListing.quantityAvailable === 0) {
    updatedListing.status = "sold_out";
    await updatedListing.save();
  }

  const totalPrice = Math.round(quantityOrdered * listing.pricePerUnit * 100) / 100;

  const order = await Order.create({
    buyer: buyerId,
    seller: listing.seller,
    listing: listing._id,
    productName: listing.productName,
    quantityOrdered,
    unit: listing.unit,
    pricePerUnit: listing.pricePerUnit,
    totalPrice,
    status: "pending",
  });

  return Order.findById(order._id).populate("seller", "name").populate("buyer", "name");
};

export const getMyOrders = async (buyerId) => {
  return Order.find({ buyer: buyerId }).sort({ createdAt: -1 }).populate("seller", "name");
};

export const getReceivedOrders = async (sellerId) => {
  return Order.find({ seller: sellerId }).sort({ createdAt: -1 }).populate("buyer", "name");
};

/**
 * Only the seller can confirm or cancel an order against their own
 * listing. Cancelling restores the reserved stock back to the listing
 * (and reactivates it if it had gone sold_out) - the mirror image of
 * the atomic decrement in placeOrder above.
 */
export const updateOrderStatus = async (orderId, sellerId, newStatus) => {
  if (!["confirmed", "cancelled"].includes(newStatus)) {
    throw new MarketplaceError("Status must be 'confirmed' or 'cancelled'.", 400, "INVALID_STATUS");
  }

  const order = await Order.findById(orderId);
  if (!order) throw new MarketplaceError("Order not found.", 404, "ORDER_NOT_FOUND");
  if (order.seller.toString() !== sellerId.toString()) {
    throw new MarketplaceError("You do not have access to this order.", 403, "FORBIDDEN");
  }
  if (order.status !== "pending") {
    throw new MarketplaceError(`This order is already "${order.status}" and cannot be changed.`, 400, "ALREADY_FINALIZED");
  }

  if (newStatus === "cancelled") {
    await Listing.findOneAndUpdate(
      { _id: order.listing },
      { $inc: { quantityAvailable: order.quantityOrdered }, $set: { status: "active" } }
    );
  }

  order.status = newStatus;
  await order.save();
  return Order.findById(order._id).populate("buyer", "name");
};
