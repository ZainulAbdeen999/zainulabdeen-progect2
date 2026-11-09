import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

export function notFoundHandler(req, res, next) {
  next(
    new ApiError(
      404,
      `Route ${req.method} ${req.originalUrl} was not found`,
      "ROUTE_NOT_FOUND"
    )
  );
}

/**
 * One place for every error response.
 * Known ApiErrors keep their status; Mongo/JWT errors get a friendly message.
 */
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  let status = err.status || 500;
  let message = err.message || "Something went wrong";
  let code = err.code || "INTERNAL_ERROR";
  let details;

  if (err.name === "ValidationError") {
    status = 400;
    code = "VALIDATION_ERROR";
    details = Object.values(err.errors || {}).map((item) => item.message);
    message = details[0] || "Please check the information you entered";
  } else if (err.name === "CastError") {
    status = 400;
    code = "INVALID_ID";
    message = "That identifier is not valid";
  } else if (err.code === 11000) {
    status = 409;
    code = "DUPLICATE";
    const field = Object.keys(err.keyPattern || {})[0] || "value";
    message = `That ${field} is already in use`;
  } else if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    status = 401;
    code = "INVALID_TOKEN";
    message = "Your session has expired. Please sign in again.";
  } else if (err.type === "entity.parse.failed") {
    status = 400;
    code = "INVALID_JSON";
    message = "The request body is not valid JSON";
  }

  if (status >= 500) {
    console.error("[error]", err);
    if (env.isProduction) message = "Something went wrong on our side";
  }

  res.status(status).json({
    error: {
      message,
      code,
      ...(details ? { details } : {})
    }
  });
}
