const Review = require("../models/Review");
const Booking = require("../models/BookingSchema");
const User = require("../models/userModel")

/**
 * Submit a review for a service provider.
 * @param {Object} req - The request object containing bookingId, rating, and review.
 * @param {Object} res - The response object.
 */
const submitReview = async (req, res) => {
  const { bookingId, rating, review } = req.body;

  try {
    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5.",
      });
    }

    // Check if the booking exists and is eligible for review
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    if (!booking.pendingRating || booking.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "This booking is not eligible for a review.",
      });
    }

    // Check if a review already exists for this booking
    const existingReview = await Review.findOne({ bookingId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "A review for this booking already exists.",
      });
    }

    // Create and save the review
    const newReview = new Review({
      bookingId,
      userId: booking.userId,
      providerId: booking.providerId,
      rating,
      review,
    });

    const savedReview = await newReview.save();

    // Mark booking as no longer pending rating
   // Mark booking as no longer pending rating and save the change
await Booking.findByIdAndUpdate(bookingId, { pendingRating: false });


    res.status(201).json({
      success: true,
      message: "Review submitted successfully.",
      data: savedReview,
    });
  } catch (error) {
    console.error("Error submitting review:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while submitting the review.",
    });
  }
};

/**
 * Get all reviews for a specific service provider.
 * @param {Object} req - The request object containing providerId.
 * @param {Object} res - The response object.
 */

const getProviderReviews = async (req, res) => {
  try {
    const actualProviderId = req.user.id;

    const reviews = await Review.find({ providerId: actualProviderId })
      .populate("userId", "name profileImage") // Use 'profileImage' instead of 'avatar'
      .sort({ createdAt: -1 });

    const averageRating = reviews.length
      ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
      : 0;

    // Log each user's profileImage for debugging
    reviews.forEach((review) => {
      console.log("Profile Image URL:", review.userId.profileImage); // Logs the correct field
    });

    res.status(200).json({
      success: true,
      data: {
        reviews,
        averageRating: parseFloat(averageRating),
      },
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching reviews.",
    });
  }
};



const getLoggedInUser = async (req, res) => {
  try {
    // Assuming `req.user` contains the authenticated user's details, populated by a middleware
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error fetching logged-in user:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


const getPendingReviews = async (req, res) => {
  try {
    const bookings = await Booking.find({
      userId: req.user._id, // Fetch for the logged-in user
      status: "completed",
      pendingRating: true,
    }).populate("providerId", "name serviceName profileImage");

    res.status(200).json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    console.error("Error fetching pending reviews:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching pending reviews.",
    });
  }
};



const getProviderReviewDetails = async (req, res) => {
  try {
    const providerId = req.params.providerId;
    
    console.log("Incoming Provider ID:", providerId);
    
    const reviews = await Review.find({ providerId });
    
    console.log("Raw Reviews Found:", reviews);
    
    const reviewCount = reviews.length;
    
    console.log("Review Count:", reviewCount);
    
    const averageRating = reviewCount
      ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount).toFixed(1)
      : "0.0";
    
    console.log("Average Rating Calculation:", {
      totalSum: reviews.reduce((sum, review) => sum + review.rating, 0),
      reviewCount,
      averageRating
    });
    
    res.status(200).json({
      success: true,
      data: {
        reviewCount,
        averageRating: parseFloat(averageRating)
      }
    });
  } catch (error) {
    console.error("Error in getProviderReviewDetails:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching review details"
    });
  }
};

/**
 * Skip a review for a specific booking.
 * @param {Object} req - The request object containing bookingId.
 * @param {Object} res - The response object.
 */
const skipReview = async (req, res) => {
  const { bookingId } = req.body;

  try {
    // Find the booking to mark it as skipped
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    if (!booking.pendingRating || booking.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "This booking is not eligible to be skipped.",
      });
    }

   // Ensure skipping a review marks it as no longer pending
await Booking.findByIdAndUpdate(bookingId, { 
  pendingRating: false, 
  skippedRating: true 
});


    res.status(200).json({
      success: true,
      message: "Review skipped successfully.",
    });
  } catch (error) {
    console.error("Error skipping review:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while skipping the review.",
    });
  }
};

/**
 * Fetch all reviews for a specific provider by providerId.
 * @param {Object} req - The request object containing providerId in params.
 * @param {Object} res - The response object.
 */
const getAllReviewsForProvider = async (req, res) => {
  try {
    const { providerId } = req.params; // Get providerId from the URL params

    // Find all reviews for the given providerId
    const reviews = await Review.find({ providerId })
      .populate("userId", "name profileImage") // Populate the user's name and profile image
      .sort({ createdAt: -1 }); // Sort reviews by most recent first

    res.status(200).json({
      success: true,
      data: reviews, // Return the list of reviews
    });
  } catch (error) {
    console.error("Error fetching all reviews for provider:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching reviews.",
    });
  }
};

module.exports = {
  submitReview,
  getProviderReviews,
  getPendingReviews,
  getLoggedInUser,
  getProviderReviewDetails,
  skipReview,
  getAllReviewsForProvider,
};
