import mongoose from "mongoose";

/*
 * Rider profile (added with the rider system).
 * Only accounts with role "rider" use these fields; customers and admins keep
 * an empty profile object, so existing users need no migration.
 */
const riderProfileSchema = new mongoose.Schema(
  {
    phone: { type: String, default: "", trim: true },
    vehicle: { type: String, default: "", trim: true },
    active: { type: Boolean, default: true }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: 80
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    role: {
      // "rider" was added so delivery staff can sign in to their own dashboard.
      type: String,
      enum: ["user", "admin", "rider"],
      default: "user"
    },
    // Profile used by the rider dashboard and the admin Riders page.
    riderProfile: { type: riderProfileSchema, default: () => ({}) },
    emailVerified: {
      type: Boolean,
      default: false
    },
    emailVerifiedAt: Date,
    passwordChangedAt: Date
  },
  { timestamps: true }
);

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    emailVerified: this.emailVerified,
    // Riders need their phone/vehicle/active flag in the client session.
    ...(this.role === "rider"
      ? {
          riderProfile: {
            phone: this.riderProfile?.phone || "",
            vehicle: this.riderProfile?.vehicle || "",
            active: this.riderProfile?.active !== false
          }
        }
      : {}),
    createdAt: this.createdAt
  };
};

export const User = mongoose.model("User", userSchema);
