export const notFound = (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
};

export const errorHandler = (err, req, res, next) => {
  console.error(err);
  const statusCode = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
  const isProd = process.env.NODE_ENV === "production";
  res.status(statusCode).json({
    success: false,
    message: isProd && statusCode === 500 ? "Something went wrong on the server." : err.message,
  });
};
