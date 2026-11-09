import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { forbidden, unauthorized } from "../utils/ApiError.js";

export const AUTH_COOKIE = "slicehouse_token";

export function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.cookieSecure,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/"
  };
}

/**
 * Read the JWT from the httpOnly cookie (or a Bearer header for API clients)
 * and attach the matching user. Never throws — protected routes call
 * requireAuth afterwards.
 */
export const attachUser = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const token = req.cookies?.[AUTH_COOKIE] || bearer;

  if (!token) return next();

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub);
    if (!user) return next();

    // Changing the password invalidates every token issued before the change.
    // Compare whole seconds: a token minted in the same second as the change
    // (the one sent back to keep this session signed in) must stay valid.
    if (
      user.passwordChangedAt &&
      payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)
    ) {
      return next();
    }

    req.user = user;
    req.tokenPayload = payload;
    return next();
  } catch {
    return next();
  }
});

export function requireAuth(req, res, next) {
  if (!req.user) return next(unauthorized());
  return next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) return next(unauthorized());
  if (req.user.role !== "admin") {
    return next(forbidden("Admin access required", "ADMIN_ONLY"));
  }
  return next();
}

/*
 * Rider guard (added with the rider system).
 * Riders can only reach the rider API; an inactive rider is rejected so the
 * admin can suspend an account without deleting its delivery history.
 */
export function requireRider(req, res, next) {
  if (!req.user) return next(unauthorized());
  if (req.user.role !== "rider") {
    return next(forbidden("Rider access required", "RIDER_ONLY"));
  }
  if (req.user.riderProfile?.active === false) {
    return next(
      forbidden("This rider account is inactive. Contact the store.", "RIDER_INACTIVE")
    );
  }
  return next();
}
