const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.statusCode || res.statusCode === 200 ? 500 : res.statusCode;
  console.error(`[ERROR] ${req.method} ${req.path} →`, err.message);

  res.status(statusCode).json({
    message: err.message || "Internal Server Error",
    // Stack only in development
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};

module.exports = errorMiddleware;
