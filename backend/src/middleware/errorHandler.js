export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.statusCode || 500;
  const payload = {
    error: err.message || "Internal server error",
  };

  if (err.code) {
    payload.code = err.code;
  }

  return res.status(status).json(payload);
}
