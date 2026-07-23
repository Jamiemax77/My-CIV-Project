class ApiError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Wraps an async route handler so rejected promises reach Express's error middleware. */
function asyncHandler(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

module.exports = { ApiError, asyncHandler };
