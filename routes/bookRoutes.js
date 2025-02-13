const express = require("express");
const { bookService, getPendingBookingsForProvider, getBookingsForProvider, acceptBooking, rejectBooking, deleteRejectedRecord, completeJob, deleteCompletedJob, getAllHistory, getCompletedHistory, getRejectedHistory, deletePendingRecord, deleteCompletedRecord } = require("../controllers/bookingController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Route to handle booking
router.post("/book-service", bookService);
router.get("/provider/bookings/:status", protect, getBookingsForProvider);
router.post('/accept/:bookingId', protect, acceptBooking);
router.post('/reject/:bookingId', protect, rejectBooking);
router.delete('/rejected/:bookingId',protect, deleteRejectedRecord);
router.post('/complete/:bookingId',protect, completeJob);
router.delete('/completed/:bookingId',protect, deleteCompletedJob);

router.get('/history/all', protect, getAllHistory);

// Route to fetch completed bookings
router.get('/history/completed', protect, getCompletedHistory);

// Route to fetch rejected bookings
router.get('/history/rejected', protect, getRejectedHistory);

router.delete('/pending/:bookingId', protect, deletePendingRecord);

router.delete('/completed/:bookingId', protect, deleteCompletedRecord);


module.exports = router;
