import mongoose from "mongoose";

export class ApiError extends Error {
  constructor(message, statusCode, code) {
  super(message);
  this.statusCode = statusCode;
  this.code = code;
  }
}

export const successResponse = (res, data, statusCode = 200) => {
 res.status(statusCode).json({ success: true, ...data });
};

export const errorResponse = (res, message, statusCode = 400) => {
 res.status(statusCode).json({ success: false, message });
};

export const paginate = async (model, filter, page = 1, limit = 20) => {
 const skip = (page - 1) * limit;
 const [items, total] = await Promise.all([
 model.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
 model.countDocuments(filter),
 ]);
 return { items, total, page, limit, pages: Math.ceil(total / limit) };
};

export const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
