const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true, // Ensure each booking can only have one review
    },
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
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      trim: true,
      maxlength: 1000, // Limit the review text to 1000 characters
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Ensure the review is unique for a combination of bookingId and userId
ReviewSchema.index({ bookingId: 1, userId: 1 }, { unique: true });

const Review = mongoose.model("Review", ReviewSchema);

module.exports = Review;
