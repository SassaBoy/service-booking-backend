const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    serviceName: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    address: {
      type: String,
      required: true, // Ensure address is mandatory
    },
    status: {
      type: String,
      enum: ["pending", "rejected", "confirmed", "completed"],
      default: "pending",
    },
    pendingRating: {
      type: Boolean,
      default: false, // Set to true only when status changes to 'completed'
    },
    skippedRating: {
      type: Boolean,
      default: false, // Indicates if the review for this booking has been skipped
    },
    deletedByUsers: {
      type: [mongoose.Schema.Types.ObjectId], // Stores IDs of users who "deleted" it
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Middleware to update the `updatedAt` field automatically
BookingSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Booking = mongoose.model("Booking", BookingSchema);

module.exports = Booking;
