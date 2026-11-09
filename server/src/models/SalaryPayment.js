import mongoose from "mongoose";

/*
 * Salary payment (added with the admin Settings / payroll page).
 *
 * One running payment record per staff member per month ("YYYY-MM"). Partial
 * payments add to `amount`, so the page can always show paid vs. pending.
 */
const salaryPaymentSchema = new mongoose.Schema(
  {
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StaffMember",
      required: true,
      index: true
    },
    month: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}$/, "Use a YYYY-MM month"]
    },
    amount: {
      type: Number,
      required: true,
      min: [0, "Payment cannot be negative"]
    },
    // Snapshot of the days counted when this payment was recorded.
    daysPresent: { type: Number, default: 0, min: 0 },
    note: { type: String, default: "", trim: true, maxlength: 200 }
  },
  { timestamps: true }
);

salaryPaymentSchema.index({ staff: 1, month: 1 }, { unique: true });

export const SalaryPayment = mongoose.model("SalaryPayment", salaryPaymentSchema);
