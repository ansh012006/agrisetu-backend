import mongoose from "mongoose";
import Machinery from "../models/Machinery.js";
import Booking from "../models/Booking.js";
import { ApiError } from "../utils/apiHelpers.js";

export class MachineryError extends ApiError {
  constructor(message, statusCode = 400, code = "MACHINERY_ERROR") {
  super(message, statusCode, code);
  this.name = "MachineryError";
  }
}

// ponytail: dual shape (rentalPricePerDay+rentPricePerDay, isActive+status) for Android compat
const toMachineryDTO = (m) => {
  if (!m) return m;
  const o = { ...m };
  o.rentPricePerDay = o.rentalPricePerDay ?? o.rentPricePerDay ?? 0;
  o.rentalPricePerDay = o.rentPricePerDay;
  o.status = o.isActive === false ? "inactive" : "available";
  return o;
};

const toBookingDTO = (b) => {
  if (!b) return b;
  const o = { ...b };
  const mach = o.machinery && typeof o.machinery === "object" ? o.machinery : null;
  o.machineryName = mach?.name || o.machineryName || "";
  o.rentPricePerDay = mach?.rentalPricePerDay ?? mach?.rentPricePerDay ?? o.rentPricePerDay ?? 0;
  if (o.renter && typeof o.renter === "object") o.farmer = { name: o.renter.name || "" };
  return o;
};

export async function createMachinery(ownerId, body) {
  const { name, category, description, brand, model, year, condition, rentalPricePerDay, rentPricePerDay, rentalPricePerHour, location, state, district, images } = body;
  const price = rentalPricePerDay ?? rentPricePerDay;
  if (!name || !category || !price) throw new MachineryError("Name, category, and rental price are required.", 400, "MISSING_FIELDS");
  const created = await Machinery.create({
  owner: ownerId,
  name,
  category,
  description: description || "",
  brand: brand || "",
  model: model || "",
  year: year ? Number(year) : undefined,
  condition: condition || "good",
  rentalPricePerDay: Number(price),
  rentalPricePerHour: Number(rentalPricePerHour) || 0,
  location: location || { state: state || "", district: district || "" },
  images: images || [],
  });
  return toMachineryDTO(created.toObject());
}

export async function browseMachinery({ category }) {
  const filter = { isActive: true };
  if (category) filter.category = new RegExp(category, "i");
  const list = await Machinery.find(filter).populate("owner", "name phone location").sort({ createdAt: -1 }).lean();
  return list.map(toMachineryDTO);
}

export async function getMyMachinery(ownerId) {
  const list = await Machinery.find({ owner: ownerId }).sort({ createdAt: -1 }).lean();
  return list.map(toMachineryDTO);
}

export async function deactivateMachinery(id, ownerId) {
  const m = await Machinery.findOne({ _id: id, owner: ownerId });
  if (!m) throw new MachineryError("Machinery not found.", 404, "NOT_FOUND");
  m.isActive = false;
  await m.save();
  return toMachineryDTO(m.toObject());
}

export async function updateMachinery(id, ownerId, body) {
  const m = await Machinery.findOne({ _id: id, owner: ownerId });
  if (!m) throw new MachineryError("Machinery not found.", 404, "NOT_FOUND");
  if (body.rentPricePerDay !== undefined && body.rentalPricePerDay === undefined) body.rentalPricePerDay = body.rentPricePerDay;
  const allowed = ["name", "description", "brand", "model", "year", "condition", "rentalPricePerDay", "rentalPricePerHour", "location", "images"];
  for (const key of allowed) { if (body[key] !== undefined) m[key] = body[key]; }
  await m.save();
  return toMachineryDTO(m.toObject());
}

export async function createBooking(renterId, { machineryId, startDate, endDate }) {
 if (!machineryId || !startDate || !endDate) throw new MachineryError("Machinery ID, start date, and end date are required.", 400, "MISSING_FIELDS");

 const machinery = await Machinery.findById(machineryId);
 if (!machinery) throw new MachineryError("Machinery not found.", 404, "NOT_FOUND");
 if (!machinery.isActive) throw new MachineryError("This machinery is no longer available.", 400, "INACTIVE");
 if (machinery.owner.toString() === renterId.toString()) throw new MachineryError("Cannot book your own machinery.", 400, "OWN_MACHINERY");

 const start = new Date(startDate);
 const end = new Date(endDate);
 if (isNaN(start) || isNaN(end)) throw new MachineryError("Invalid date format.", 400, "INVALID_DATE");
 if (start >= end) throw new MachineryError("End date must be after start date.", 400, "INVALID_DATE_RANGE");

 const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
 const totalPrice = days * Number(machinery.rentalPricePerDay);

  const booking = await Booking.create({
  machinery: machinery._id,
  owner: machinery.owner,
  renter: renterId,
  startDate: start,
  endDate: end,
  totalPrice,
  });

  const populated = await Booking.findById(booking._id).populate("machinery", "name category rentalPricePerDay").populate("owner", "name phone").populate("renter", "name phone").lean();
  return toBookingDTO(populated || booking.toObject());
}

export async function getMyBookings(renterId) {
  const list = await Booking.find({ renter: renterId }).populate("owner", "name phone").populate("renter", "name phone").populate("machinery", "name category rentalPricePerDay").sort({ createdAt: -1 }).lean();
  return list.map(toBookingDTO);
}

export async function getReceivedBookings(ownerId) {
  const list = await Booking.find({ owner: ownerId }).populate("renter", "name phone location").populate("owner", "name phone").populate("machinery", "name category rentalPricePerDay").sort({ createdAt: -1 }).lean();
  return list.map(toBookingDTO);
}

export async function updateBookingStatus(bookingId, ownerId, status) {
  const valid = ["pending", "confirmed", "cancelled", "completed"];
  if (!valid.includes(status)) throw new MachineryError("Invalid status.", 400, "INVALID_STATUS");
  const booking = await Booking.findOne({ _id: bookingId, owner: ownerId });
  if (!booking) throw new MachineryError("Booking not found.", 404, "NOT_FOUND");
  booking.status = status;
  await booking.save();
  const populated = await Booking.findById(booking._id).populate("machinery", "name category rentalPricePerDay").lean();
  return toBookingDTO(populated || booking.toObject());
}
