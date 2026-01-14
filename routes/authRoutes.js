const express = require("express");
const multer = require("multer");
const path = require("path");
const { registerUser, loginUser, getUserDetails,getCategories, updateProfilePicture,getUnreadNotificationCount,sendNotification,searchUsers,getNotifications, getUserDetails1,getVerifiedProviders, updateUserDetails, logout, requestPasswordReset, resetPassword, completeProfile, uploadDocuments, verifyDocuments, updatePaymentStatus, markNotificationAsRead, uploadService, getServices, getPendingProviders, searchPendingProviders, getProviderDetails, getProviderServiceDetails, addCustomService, adminSearchToDelete, deleteUser, getClientsCount, getProvidersCount, getFreeProvidersCount, getAllUsersCount, deleteNotificationByUser, deleteAccount, getProviderReviews, deleteService, addServiceToProvider, addImage, deleteImage, unpaidReminder, verifyPassword, updatePassword } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const User = require("../models/userModel");
const fs = require('fs');
const router = express.Router();

// Configure Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = fileTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only images (jpeg, jpg, png) are allowed."));
    }
  },
});

// Configure Multer for PDFs
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Directory for documents
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const uploadDocumentsMulter = multer({
  storage: documentStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const fileTypes = /pdf/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());

    if (extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed."));
    }
  },
});

// Upload Documents Route
router.post(
  "/upload-documents",
  uploadDocumentsMulter.single("idDocument"),
  uploadDocuments
);

// Register Route
router.post(
  "/register/:role",
  upload.single("profileImage"), // Handle image upload
  async (req, res, next) => {
    try {
      await registerUser(req, res); // Pass request to the controller
    } catch (error) {
      if (error instanceof multer.MulterError) {
        return res.status(400).json({ message: error.message });
      }
      next(error);
    }
  }
);



// Login Route
router.post("/login", async (req, res, next) => {
  try {
    await loginUser(req, res); // Pass the request to the login controller
  } catch (error) {
    next(error); // Pass errors to the error-handling middleware
  }
});


// Step 1: Request Password Reset
router.post("/forgot-password", async (req, res, next) => {
  try {
    await requestPasswordReset(req, res); // Handle the password reset request
  } catch (error) {
    next(error); // Pass errors to the error-handling middleware
  }
});

// Step 2: Reset Password
router.post("/reset-password", async (req, res, next) => {
  try {
    await resetPassword(req, res); // Handle resetting the password
  } catch (error) {
    next(error); // Pass errors to the error-handling middleware
  }
});


// Complete Profile Route
router.post(
  "/complete-profile",
  upload.array("images", 100), // Handle up to 5 image uploads
  async (req, res, next) => {
    try {
      await completeProfile(req, res); // Call the completeProfile controller
    } catch (error) {
      if (error instanceof multer.MulterError) {
        return res.status(400).json({ message: error.message });
      }
      next(error); // Pass other errors to the error-handling middleware
    }
  }
);


// Verify Documents Route (Admin Only)
router.post("/verify-documents",  async (req, res, next) => {
  try {
    await verifyDocuments(req, res);
  } catch (error) {
    next(error);
  }
});


// Update Payment Status Route (Admin Only)
router.post("/update-payment-status", async (req, res, next) => {
  try {
    await updatePaymentStatus(req, res); // Call the updatePaymentStatus controller
  } catch (error) {
    next(error); // Pass any errors to the error-handling middleware
  }
});



router.get("/user-details", protect, getUserDetails);


// Logout Route
router.post("/logout", logout);

const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Updated profile picture upload route
router.put(
  "/update-profile-picture/:userId",
  protect, // Auth first
  upload.single("profileImage"), // Multer handles the file AFTER auth
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded." });
      }

      // Call your controller
      await updateProfilePicture(req, res);
    } catch (error) {
      console.error("Profile picture upload error:", error);
      next(error);
    }
  }
);

// Get User Details
router.get("/get-user", protect, getUserDetails1);

// Update User Details
router.put("/update-user/:userId", protect, updateUserDetails);
// Search users
router.get("/search", searchUsers);

// Send notification
router.post("/send-notification", sendNotification);

// Fetch notifications
router.get("/notifications",protect, getNotifications);

router.put("/notifications/:notificationId/read",protect, markNotificationAsRead);

router.get("/notifications/unread-count", protect, getUnreadNotificationCount);

// Route to upload a service
router.post("/services", async (req, res, next) => {
  try {
    await uploadService(req, res); // Call the controller function
  } catch (error) {
    next(error); // Pass any errors to the error-handling middleware
  }
});

router.get("/categories", async (req, res, next) => {
  try {
    await getCategories(req, res);
  } catch (error) {
    next(error);
  }
});
// Route to fetch all services
router.get("/services", async (req, res, next) => {
  try {
    await getServices(req, res); // Call the controller function
  } catch (error) {
    next(error); // Pass any errors to the error-handling middleware
  }
});

// Get all pending providers
router.get('/pending-providers', getPendingProviders);

// Search pending providers
router.get('/search-pending-providers', searchPendingProviders);

router.get("/providers", getVerifiedProviders);

router.get("/providers/details", getProviderDetails);

router.get("/provider-service", getProviderServiceDetails);

router.post("/custom-service", addCustomService);

// Route to fetch the count of all active users
router.get("/active-users-count", async (req, res, next) => {
  try {
    const users = await User.countDocuments();
    res.status(200).json({
      success: true,
      message: "Active users count fetched successfully.",
      count: users,
    });
  } catch (error) {
    next(error); // Pass the error to error-handling middleware
  }
});


router.get("/search", adminSearchToDelete);
router.delete("/delete/:userId", deleteUser);

router.get("/clients-count", getClientsCount);
router.get("/providers-count", getProvidersCount);
router.get("/free-providers-count", getFreeProvidersCount);
router.get("/all-users-count", getAllUsersCount);

router.delete("/notifications/:notificationId", protect, deleteNotificationByUser);

// Delete Account Route
router.delete("/delete-account", protect, deleteAccount);

router.get('/:providerId/reviews', getProviderReviews);

router.delete("/delete-service/:serviceId", protect, deleteService);

router.post("/add-service", protect, async (req, res, next) => {
  try {
    await addServiceToProvider(req, res); // Call the controller function
  } catch (error) {
    next(error); // Pass errors to the error-handling middleware
  }
});

// Add Image Route
router.post("/images/add", protect, upload.single("image"), async (req, res, next) => {
  try {
    await addImage(req, res);
  } catch (error) {
    next(error);
  }
});

// Delete Image Route
router.delete("/images/delete", protect, async (req, res, next) => {
  try {
    await deleteImage(req, res);
  } catch (error) {
    next(error);
  }
});


router.get("/unpaid-reminder", protect, async (req, res, next) => {
  try {
    await unpaidReminder(req, res);
  } catch (error) {
    next(error);
  }
});

router.post("/verify-password", verifyPassword);

router.put("/update-password/:userId", updatePassword);

module.exports = router;
