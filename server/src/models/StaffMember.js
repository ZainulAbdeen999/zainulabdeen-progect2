import mongoose from "mongoose";

/*
 * Staff member (added with the admin Settings / payroll page).
 *
 * Staff records are independent of login accounts: a chef or cashier does not
 * need an account to be paid. Rider staff can optionally link to their rider
 * User account (`userId`) so the payroll list and the delivery dashboard stay
 * in sync without merging the two concepts.
 */
const STAFF_ROLES = ["Manager", "Chef", "Cashier", "Waiter", "Rider", "Other"];

const staffMemberSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Staff name is required"],
      trim: true,
      maxlength: 80
    },
    phone: { type: String, default: "", trim: true, maxlength: 20 },
    role: {
      type: String,
      enum: STAFF_ROLES,
      default: "Other"
    },
    monthlySalary: {
      type: Number,
      default: 0,
      min: [0, "Salary cannot be negative"]
    },
    joinedAt: { type: Date, default: Date.now },
    active: { type: Boolean, default: true },
    // Optional link to a rider login account (role "rider").
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    notes: { type: String, default: "", trim: true, maxlength: 300 }
  },
  { timestamps: true }
);

staffMemberSchema.index({ name: 1, role: 1 });

export { STAFF_ROLES };
export const StaffMember = mongoose.model("StaffMember", staffMemberSchema);
