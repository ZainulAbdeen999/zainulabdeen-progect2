import mongoose from "mongoose";

/**
 * Single-use tokens for email verification and password resets.
 * Only the SHA-256 hash of the token is stored, never the raw value.
 */
const tokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ["verify", "reset"],
      required: true
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true
    },
    expiresAt: {
      type: Date,
      required: true
    },
    usedAt: Date
  },
  { timestamps: true }
);

// MongoDB removes expired tokens automatically.
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Token = mongoose.model("Token", tokenSchema);
