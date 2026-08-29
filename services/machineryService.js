import Machinery from "../models/Machinery.js";
import Booking from "../models/Booking.js";

export class MachineryError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.name = "MachineryError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const createMachinery = async (ownerId, data) => {
  const { name, category, rentPricePerDay, description, state, district } = data;
  if (!name || !category || !rentPricePerDay) {
    throw new MachineryError("name, category, and rentPricePerDay are required.", 400, "MISSING_FIELDS");
  }
  const machinery = await Machinery.create({
    owner: ownerId,
    name,
    category,
    rentPricePerDay,
    description: description || "",
    location: { state: state || "", district: district || "" },
    status: "available",
  });
  // Same fix as createListing in marketplaceService.js: the Android
  // Machinery model expects `owner` as a populated {name, location}
  // object, matching what browseMachinery already returns below - the
  // freshly-created document only has owner as a raw ObjectId, which
  // fails to parse on the client for the same reason.
  return Machinery.findById(machinery._id).populate("owner", "name location");
};

export const browseMachinery = async ({ category } = {}) => {
  const query = { status: "available" };
  if (category) query.category = category;
  return Machinery.find(query).sort({ createdAt: -1 }).populate("owner", "name location");
};

export const getMyMachinery = async (ownerId) => {
  // Same reasoning as createMachinery above: Gson parses this field
  // during JSON deserialization regardless of whether the UI displays
  // it, so an unpopulated ObjectId here would crash parsing the whole
  // list even though "my own machinery" never needs to show the
  // owner's own name back to themselves.
  return Machinery.find({ owner: ownerId }).sort({ createdAt: -1 }).populate("owner", "name location");
};

export const deactivateMachinery = async (machineryId, ownerId) => {
  const machinery = await Machinery.findById(machineryId);
  if (!machinery) throw new MachineryError("Machinery not found.", 404, "MACHINERY_NOT_FOUND");
  if (machinery.owner.toString() !== ownerId.toString()) {
    throw new MachineryError("You do not have access to this listing.", 403, "FORBIDDEN");
  }
  machinery.status = "inactive";
  await machinery.save();
  return Machinery.findById(machinery._id).populate("owner", "name location");
};

export const updateMachinery = async (machineryId, ownerId, data) => {
  const machinery = await Machinery.findById(machineryId);
  if (!machinery) throw new MachineryError("Machinery not found.", 404, "MACHINERY_NOT_FOUND");
  if (machinery.owner.toString() !== ownerId.toString()) {
    throw new MachineryError("You do not have access to this listing.", 403, "FORBIDDEN");
  }

  const { name, category, rentPricePerDay, description, state, district } = data;
  if (name !== undefined) machinery.name = name;
  if (category !== undefined) machinery.category = category;
  if (rentPricePerDay !== undefined) machinery.rentPricePerDay = rentPricePerDay;
  if (description !== undefined) machinery.description = description;
  if (state !== undefined) machinery.location.state = state;
  if (district !== undefined) machinery.location.district = district;

  await machinery.save();
  return Machinery.findById(machinery._id).populate("owner", "name location");
};

const datesOverlap = async (machineryId, startDate, endDate, excludeBookingId = null) => {
  const query = {
    machinery: machineryId,
    status: { $in: ["pending", "confirmed"] },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  };
  if (excludeBookingId) query._id = { $ne: excludeBookingId };
  return Booking.findOne(query);
};

/**
 * Conflict-free booking, honestly explained: this is NOT a database
 * transaction (MongoDB Atlas free tier supports them, but adding
 * session/transaction machinery is another category of thing that
 * could go subtly wrong in code that's never been run). Instead it
 * uses an insert-then-verify-rollback pattern: create the booking
 * optimistically, immediately re-check for any conflicting active
 * booking (excluding the one just created), and delete + reject if one
 * exists. Because MongoDB gives read-after-write consistency on the
 * same connection, a second concurrent request's conflict check will
 * see the first request's just-inserted booking - this closes the
 * realistic race window for this app's actual scale (a farmer booking
 * app, not a high-frequency trading system), even though it isn't the
 * textbook-strongest possible guarantee a full transaction would give.
 */
export const createBooking = async (farmerId, { machineryId, startDate, endDate }) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new MachineryError("Valid startDate and endDate are required.", 400, "INVALID_DATES");
  }
  if (end < start) {
    throw new MachineryError("endDate must be on or after startDate.", 400, "INVALID_DATE_RANGE");
  }
  if (start < new Date(new Date().toDateString())) {
    throw new MachineryError("startDate cannot be in the past.", 400, "PAST_DATE");
  }

  const machinery = await Machinery.findById(machineryId);
  if (!machinery) throw new MachineryError("Machinery not found.", 404, "MACHINERY_NOT_FOUND");
  if (machinery.status !== "available") {
    throw new MachineryError("This machinery is not currently available for booking.", 400, "NOT_AVAILABLE");
  }
  if (machinery.owner.toString() === farmerId.toString()) {
    throw new MachineryError("You cannot book your own machinery.", 400, "SELF_BOOKING");
  }

  const existingConflict = await datesOverlap(machineryId, start, end);
  if (existingConflict) {
    throw new MachineryError("This equipment is already booked for an overlapping date range. Choose different dates.", 409, "DATE_CONFLICT");
  }

  const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
  const totalPrice = Math.round(days * machinery.rentPricePerDay * 100) / 100;

  const booking = await Booking.create({
    farmer: farmerId,
    owner: machinery.owner,
    machinery: machinery._id,
    machineryName: machinery.name,
    startDate: start,
    endDate: end,
    rentPricePerDay: machinery.rentPricePerDay,
    totalPrice,
    status: "pending",
  });

  const conflictAfterInsert = await datesOverlap(machineryId, start, end, booking._id);
  if (conflictAfterInsert) {
    await Booking.deleteOne({ _id: booking._id });
    throw new MachineryError("This equipment was just booked by someone else for an overlapping date range. Choose different dates.", 409, "DATE_CONFLICT");
  }

  return Booking.findById(booking._id).populate("owner", "name").populate("farmer", "name");
};

export const getMyBookings = async (farmerId) => {
  // Same fix as getMyOrders/getReceivedOrders in marketplaceService.js:
  // Android's shared Booking model expects both `owner` and `farmer` as
  // populated objects regardless of which side is viewing, so both need
  // populating here even though this is "the farmer's own bookings."
  return Booking.find({ farmer: farmerId }).sort({ createdAt: -1 }).populate("owner", "name").populate("farmer", "name");
};

export const getReceivedBookings = async (ownerId) => {
  return Booking.find({ owner: ownerId }).sort({ createdAt: -1 }).populate("farmer", "name").populate("owner", "name");
};

export const updateBookingStatus = async (bookingId, ownerId, newStatus) => {
  if (!["confirmed", "cancelled"].includes(newStatus)) {
    throw new MachineryError("Status must be 'confirmed' or 'cancelled'.", 400, "INVALID_STATUS");
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) throw new MachineryError("Booking not found.", 404, "BOOKING_NOT_FOUND");
  if (booking.owner.toString() !== ownerId.toString()) {
    throw new MachineryError("You do not have access to this booking.", 403, "FORBIDDEN");
  }
  if (booking.status !== "pending") {
    throw new MachineryError(`This booking is already "${booking.status}" and cannot be changed.`, 400, "ALREADY_FINALIZED");
  }

  booking.status = newStatus;
  await booking.save();
  return Booking.findById(booking._id).populate("farmer", "name").populate("owner", "name");
};
