/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
  console.error(err.stack || err.message);
  const status = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(status).json({
    success: false,
    message: err.message || "Server Error",
  });
};

module.exports = errorHandler;
