export class ApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (message, code = "BAD_REQUEST") =>
  new ApiError(400, message, code);

export const unauthorized = (message = "Please sign in to continue", code = "UNAUTHORIZED") =>
  new ApiError(401, message, code);

export const forbidden = (message = "You do not have access to this resource", code = "FORBIDDEN") =>
  new ApiError(403, message, code);

export const notFound = (message = "Not found", code = "NOT_FOUND") =>
  new ApiError(404, message, code);

export const conflict = (message, code = "CONFLICT") => new ApiError(409, message, code);
