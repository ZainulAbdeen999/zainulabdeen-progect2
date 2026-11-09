import mongoose from "mongoose";

/*
 * Daily attendance (added with the admin Settings / payroll page).
 *
 * `dateKey` is a plain "YYYY-MM-DD" string instead of a Date so a day cannot
 * shift across time zones. One record per staff member per day.
 */
const ATTENDANCE_STATUSES = ["present", "half", "absent", "leave"];

const attendanceSchema = new mongoose.Schema(
  {
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StaffMember",
      required: true,
      index: true
    },
    dateKey: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date"]
    },
    status: {
      type: String,
      enum: ATTENDANCE_STATUSES,
      default: "present"
    },
    note: { type: String, default: "", trim: true, maxlength: 200 }
  },
  { timestamps: true }
);

// A staff member can only have one attendance row for a given day.
attendanceSchema.index({ staff: 1, dateKey: 1 }, { unique: true });

export { ATTENDANCE_STATUSES };
export const Attendance = mongoose.model("Attendance", attendanceSchema);
