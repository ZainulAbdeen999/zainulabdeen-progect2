import crypto from "node:crypto";

/** Create a random, URL-safe opaque token. */
export function createOpaqueToken() {
  return crypto.randomBytes(32).toString("hex");
}

/** Hash a token before storing or looking it up. */
export function hashToken(rawToken) {
  return crypto.createHash("sha256").update(String(rawToken)).digest("hex");
}

/** Cryptographically random order reference, e.g. SLH-20260407-8F3K. */
export function createOrderNumber() {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i += 1) {
    suffix += alphabet[crypto.randomInt(alphabet.length)];
  }
  return `SLH-${date}-${suffix}`;
}
