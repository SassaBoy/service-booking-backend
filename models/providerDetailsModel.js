const mongoose = require("mongoose");

const providerDetailsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  verificationStatus: {
    type: String,
    enum: ["Pending", "Verified", "Rejected"],
    default: "Pending",
  },
  adminNotes: { type: String },

  // Only ID Document is required
  documents: {
    idDocument: {
      name: { type: String, required: true },
      path: { type: String, required: true },
    },
  },

  paymentStatus: {
    type: String,
    enum: ["Free", "Unpaid", "Paid"],
    default: "Free",
  },
  paidAmount: { type: Number, default: 0 },
  freePlanExpiry: { type: Date, default: null },
  lastReminderDate: { type: Date, default: null },
});

module.exports = mongoose.model("ProviderDetails", providerDetailsSchema);
