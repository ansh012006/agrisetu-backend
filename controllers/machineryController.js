import { validationResult } from "express-validator";
import {
  createMachinery,
  browseMachinery,
  getMyMachinery,
  deactivateMachinery,
  createBooking,
  getMyBookings,
  getReceivedBookings,
  updateBookingStatus,
  MachineryError,
} from "../services/machineryService.js";

const handleMachineryError = (error, res, next) => {
  if (error instanceof MachineryError) {
    return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code });
  }
  next(error);
};

// @route   POST /api/machinery
export const createMachineryHandler = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    const machinery = await createMachinery(req.user._id, req.body);
    res.status(201).json({ success: true, machinery });
  } catch (error) {
    handleMachineryError(error, res, next);
  }
};

// @route   GET /api/machinery?category=
export const browseMachineryHandler = async (req, res, next) => {
  try {
    const machinery = await browseMachinery({ category: req.query.category });
    res.status(200).json({ success: true, count: machinery.length, machinery });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/machinery/mine
export const getMyMachineryHandler = async (req, res, next) => {
  try {
    const machinery = await getMyMachinery(req.user._id);
    res.status(200).json({ success: true, count: machinery.length, machinery });
  } catch (error) {
    next(error);
  }
};

// @route   PATCH /api/machinery/:id/deactivate
export const deactivateMachineryHandler = async (req, res, next) => {
  try {
    const machinery = await deactivateMachinery(req.params.id, req.user._id);
    res.status(200).json({ success: true, machinery });
  } catch (error) {
    handleMachineryError(error, res, next);
  }
};

// @route   POST /api/machinery/bookings
export const createBookingHandler = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    const { machineryId, startDate, endDate } = req.body;
    const booking = await createBooking(req.user._id, { machineryId, startDate, endDate });
    res.status(201).json({ success: true, booking });
  } catch (error) {
    handleMachineryError(error, res, next);
  }
};

// @route   GET /api/machinery/bookings/mine
export const getMyBookingsHandler = async (req, res, next) => {
  try {
    const bookings = await getMyBookings(req.user._id);
    res.status(200).json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/machinery/bookings/received
export const getReceivedBookingsHandler = async (req, res, next) => {
  try {
    const bookings = await getReceivedBookings(req.user._id);
    res.status(200).json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    next(error);
  }
};

// @route   PATCH /api/machinery/bookings/:id/status  { status }
export const updateBookingStatusHandler = async (req, res, next) => {
  try {
    const { status } = req.body;
    const booking = await updateBookingStatus(req.params.id, req.user._id, status);
    res.status(200).json({ success: true, booking });
  } catch (error) {
    handleMachineryError(error, res, next);
  }
};
