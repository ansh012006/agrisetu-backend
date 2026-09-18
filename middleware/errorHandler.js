export const notFound = (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
};

export const errorHandler = (err, req, res, next) => {
  console.error(err);
  // Multer throws errors with their own `code` (e.g. LIMIT_FILE_SIZE).
  // Surface those as friendly 400s instead of the generic 500.
  if (err && err.name === "MulterError") {
    const message = err.code === "LIMIT_FILE_SIZE"
      ? "The image is too large. Please use an image smaller than 5 MB."
      : err.message || "Image upload failed.";
    return res.status(400).json({ success: false, message, code: err.code });
  }
  // Multer fileFilter rejection (e.g. non-image upload).
  if (err && err.message === "Only image files are allowed.") {
    return res.status(400).json({ success: false, message: err.message, code: "INVALID_FILE_TYPE" });
  }
  const statusCode = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
  const isProd = process.env.NODE_ENV === "production";
  res.status(statusCode).json({
    success: false,
    message: isProd && statusCode === 500 ? "Something went wrong on the server." : err.message,
  });
};
