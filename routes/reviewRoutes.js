const express = require("express");
const { submitReview, getProviderReviews, getPendingReviews, getLoggedInUser, getProviderReviewDetails, skipReview, getAllReviewsForProvider } = require("../controllers/reviewController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// POST: Submit a review
router.post("/submit", protect, submitReview);

// GET: Get all reviews for a specific provider

router.get("/bookings/pending-rating",protect, getPendingReviews);
// Replace existing routes with:
router.get("/provider/:providerId", protect, getProviderReviews);
router.get("/my-reviews", protect, getProviderReviews);
router.get("/provider/:providerId/details", getProviderReviewDetails);
// POST: Skip a review
router.post("/skip", protect, skipReview);
// GET: Fetch all reviews for a specific provider by providerId
router.get("/provider/:providerId/all-reviews", getAllReviewsForProvider);


module.exports = router;
