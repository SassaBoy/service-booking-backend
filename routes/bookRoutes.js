const express = require("express");
const { bookService, getPendingBookingsForProvider, getBookingsForProvider, acceptBooking, rejectBooking, deleteRejectedRecord, completeJob, deleteCompletedJob, getAllHistory, getCompletedHistory, getRejectedHistory, deletePendingRecord, deleteCompletedRecord, deleteRejectedHistory, cancelBooking } = require("../controllers/bookingController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Route to handle booking
router.post("/book-service", bookService);
router.get("/provider/bookings/:status", protect, getBookingsForProvider);
router.post('/accept/:bookingId', protect, acceptBooking);
router.post('/reject/:bookingId', protect, rejectBooking);
router.put('/rejected/:bookingId',protect, deleteRejectedRecord);
router.post('/complete/:bookingId',protect, completeJob);
router.put('/completed/:bookingId',protect, deleteCompletedJob);

router.get('/history/all', protect, getAllHistory);

// Route to fetch completed bookings
router.get('/history/completed', protect, getCompletedHistory);

// Route to fetch rejected bookings
router.get('/history/rejected', protect, getRejectedHistory);

router.put('/pending/:bookingId', protect, deletePendingRecord);

router.put('/completed/:bookingId', protect, deleteCompletedRecord);

router.put('/rejected/:bookingId', protect, deleteRejectedHistory);

router.put('/cancel/:bookingId', protect, cancelBooking);



module.exports = router;
