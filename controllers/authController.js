const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const CompleteProfile = require("../models/CompleteProfile");
const ProviderDetails = require("../models/providerDetailsModel");
const Services = require("../models/serviceModel")
const path = require("path");
const mongoose = require("mongoose");
const Notification = require("../models/notificationModel");
const Service = require("../models/serviceModel");
const Booking = require("../models/BookingSchema");
const Review = require("../models/Review");
const moment = require("moment");
// Register User
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, businessName } = req.body;
    const { role } = req.params; // Role passed in the route parameter

    // Validate role
    if (!["Client", "Provider"].includes(role)) {
      return res.status(400).json({ message: "Invalid role. Please select either 'Client' or 'Provider'." });
    }

  // Check if user already exists with the same email and role
const existingUser = await User.findOne({ email, role });
if (existingUser) {
  // Check if the profile is incomplete
  const incompleteProfile = await CompleteProfile.findOne({ userId: existingUser._id });
  const incompleteProviderDetails = await ProviderDetails.findOne({ userId: existingUser._id });

  if (!incompleteProfile || !incompleteProviderDetails) {
    return res.status(200).json({
      message: "You already started the application. Redirecting to the next step.",
      redirect: !incompleteProfile ? "CompleteProfile" : "UploadDocuments",
      user: {
        id: existingUser._id,
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role,
        phone: existingUser.phone,
        profileImage: existingUser.profileImage,
        businessName: existingUser.businessName,
      },
    });
  } else {
    return res.status(400).json({
      message: "You have already completed your application.",
    });
  }
}


    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Prepare profile image path if uploaded
    const profileImage = req.file ? req.file.path : null;

    // Create user object
    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      profileImage,
      role,
      businessName: role === "Provider" ? businessName : null,
    });

    // Save user to the database
    await user.save();

    // Generate JWT token
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // Return success response
    res.status(201).json({
      success: true,
      message: "User registered successfully!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        profileImage: user.profileImage,
        businessName: user.businessName,
      },
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.email) {
      return res.status(400).json({ message: "This email is already registered." });
    }
    res.status(500).json({ message: "An unexpected error occurred. Please try again later." });
    console.error("Error during registration:", error.message);
  }
};


exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      console.log("Missing fields: ", { email, password });
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`User not found for email: ${email}`);
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Debugging: Log the hashed password stored in the database
    console.log("Stored hashed password (from DB):", user.password);

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Plain text password:", password);
    console.log("Password comparison result:", isMatch);

    if (!isMatch) {
      console.log("Password mismatch for email:", email);
      return res.status(400).json({
        success: false,
        message: "Invalid credentials.",
      });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // Success response
    console.log("Login successful for email:", email);
    res.status(200).json({
      success: true,
      message: "Login successful!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};


// Generate OTP
const generateOTP = () => {
  const otp = Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit OTP
  return otp.toString();
};

// Transporter for sending emails
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER, // Your email
    pass: process.env.EMAIL_PASS, // Your email password
  },
});
// Step 1: Request Password Reset
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Generate OTP and expiration time (Now 60 seconds)
    const otp = generateOTP();
    const otpExpires = Date.now() + 60 * 1000; // OTP valid for **60 seconds**

    // Update the user with OTP and expiration
    user.resetPasswordOTP = otp;
    user.resetPasswordExpires = otpExpires;
    await user.save();

    // Email with OTP
    const mailOptions = {
      from: `"Opaleka Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "🔑 Reset Your Password - OTP Verification",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #1a237e;">Reset Your Password</h2>
          <p>Dear ${user.name},</p>
          <p>We received a request to reset your password. Use the OTP below to proceed:</p>
          <h3 style="background-color: #1a237e; color: white; padding: 10px; text-align: center;">${otp}</h3>
          <p><strong>Note:</strong> This OTP is valid for <b>60 seconds</b>.</p>
          <p>If you did not request a password reset, please ignore this email or contact our support team.</p>
          <p>Best Regards,</p>
          <p><strong>Opaleka Team</strong></p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    // Respond with success message and user role
    res.status(200).json({
      success: true,
      message: "OTP sent to your email.",
      role: user.role, // Include user role in response
    });
  } catch (error) {
    console.error("Error sending OTP:", error.message);
    res.status(500).json({ success: false, message: "Could not send OTP. Try again later." });
  }
};


// Step 2: Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Validate input
    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP, and new password are required.",
      });
    }

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Verify OTP and expiration
    if (user.resetPasswordOTP !== otp || user.resetPasswordExpires < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP is invalid or expired.",
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password and clear OTP fields
    user.password = hashedPassword;
    user.resetPasswordOTP = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (error) {
    console.error("Error resetting password:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not reset password. Try again later.",
    });
  }
};

exports.completeProfile = async (req, res) => {
  try {
    const {
      email,
      businessAddress,
      town,
      yearsOfExperience,
      services,
      operatingHours,
      socialLinks,
      description,
    } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }

    console.log("Received email:", email);

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Parse and validate `services`
    let parsedServices = [];
    try {
      parsedServices = typeof services === "string" ? JSON.parse(services) : services;
    } catch (error) {
      return res.status(400).json({ success: false, message: "Invalid services format." });
    }

    // Parse and normalize `operatingHours`
    let normalizedOperatingHours = {};
    try {
      const parsedOperatingHours =
        typeof operatingHours === "string" ? JSON.parse(operatingHours) : operatingHours;

      normalizedOperatingHours = Object.entries(parsedOperatingHours || {}).reduce(
        (acc, [day, hours]) => {
          acc[day] = {
            start: hours.isClosed ? null : hours.start || null,
            end: hours.isClosed ? null : hours.end || null,
            isClosed: hours.isClosed || false,
          };
          return acc;
        },
        {}
      );
    } catch (error) {
      return res.status(400).json({ success: false, message: "Invalid operatingHours format." });
    }

    // Parse and validate `socialLinks`
    let parsedSocialLinks = {};
    try {
      parsedSocialLinks = typeof socialLinks === "string" ? JSON.parse(socialLinks) : socialLinks;
    } catch (error) {
      return res.status(400).json({ success: false, message: "Invalid socialLinks format." });
    }

    const images = req.files?.map((file) => file.path);

    // Check if the profile already exists
    let profile = await CompleteProfile.findOne({ userId: user._id });

    if (profile) {
      // Update existing profile
      profile.businessAddress = businessAddress;
      profile.town = town;
      profile.yearsOfExperience = yearsOfExperience;
      profile.services = parsedServices.map((service) => ({
        ...service,
        priceType: service.priceType || "hourly", // Default to 'hourly' if not specified
      }));
      profile.operatingHours = normalizedOperatingHours;
      profile.socialLinks = parsedSocialLinks;
      profile.description = description || "No description provided.";

      if (images && images.length > 0) {
        profile.images = images;
      }

      await profile.save();

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully.",
        profile,
      });
    } else {
      // Create a new profile if one does not exist
      profile = new CompleteProfile({
        userId: user._id,
        businessAddress,
        town,
        yearsOfExperience,
        services: parsedServices.map((service) => ({
          ...service,
          priceType: service.priceType || "hourly", // Default to 'hourly' if not specified
        })),
        operatingHours: normalizedOperatingHours,
        socialLinks: parsedSocialLinks,
        images,
        description,
      });

      await profile.save();

      return res.status(201).json({
        success: true,
        message: "Profile completed successfully.",
        profile,
      });
    }
  } catch (error) {
    console.error("Error completing profile:", error.message || error);
    return res.status(500).json({ success: false, message: "Failed to complete profile." });
  }
};
exports.uploadDocuments = async (req, res) => {
  try {
    console.log("=== UPLOAD DOCUMENTS REQUEST ===");
    console.log("Body:", req.body);
    console.log("File:", req.file);
    console.log("Headers:", req.headers);

    const { email } = req.body;

    // Validate email
    if (!email) {
      console.error("❌ Email missing from request");
      return res.status(400).json({ 
        success: false, 
        message: "Email is required." 
      });
    }

    console.log("📧 Email received:", email);

    // ✅ Check if file is uploaded FIRST
    if (!req.file) {
      console.error("❌ No file in request");
      return res.status(400).json({
        success: false,
        message: "No file uploaded. Please select a document.",
      });
    }

    console.log("📄 File received:", req.file.originalname, req.file.size, "bytes");

    // Check if the user exists and is a Provider
    const user = await User.findOne({ email });
    if (!user) {
      console.error("❌ User not found for email:", email);
      return res.status(404).json({
        success: false,
        message: "User not found with this email address.",
      });
    }

    console.log("✅ User found:", user.name, "Role:", user.role);

    if (user.role !== "Provider") {
      console.error("❌ User is not a Provider. Role:", user.role);
      return res.status(400).json({
        success: false,
        message: "This email is not registered as a Provider.",
      });
    }

    // Check if the profile is completed
    const completeProfile = await CompleteProfile.findOne({ userId: user._id });
    if (!completeProfile) {
      console.error("❌ CompleteProfile not found for user:", user._id);
      return res.status(400).json({
        success: false,
        message: "Please complete your profile before uploading documents.",
        redirect: "CompleteProfile",
      });
    }

    console.log("✅ CompleteProfile found");

    // Normalize document path
    const document = {
      idDocument: {
        name: req.file.originalname,
        path: req.file.path,
      },
    };

    console.log("📁 Document info:", document);

    // Create or update ProviderDetails with document
    let providerDetails = await ProviderDetails.findOne({ userId: user._id });
    if (!providerDetails) {
      console.log("📝 Creating new ProviderDetails");
      providerDetails = new ProviderDetails({
        userId: user._id,
        documents: document,
      });
    } else {
      console.log("📝 Updating existing ProviderDetails");
      providerDetails.documents = document;
    }
    
    await providerDetails.save();
    console.log("✅ ProviderDetails saved successfully");

    // ✅ Fetch user & profile details for the email
    const profileData = {
      name: user.name,
      email: user.email,
      phone: user.phone || "Not provided",
      businessAddress: completeProfile.businessAddress || "Not provided",
      town: completeProfile.town || "Not provided",
      yearsOfExperience: completeProfile.yearsOfExperience || "Not specified",
      services: completeProfile.services?.map(s => s.name).join(", ") || "No services listed",
      description: completeProfile.description || "No description provided",
    };

    console.log("📋 Profile data prepared for email");

    // ✅ Email setup with explicit configuration for better compatibility
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // Use STARTTLS
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false // Accept self-signed certificates
      },
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    console.log("📧 Preparing to send email...");

    // ✅ Email content
    const mailOptions = {
      from: `"Opaleka Applications" <${process.env.EMAIL_USER}>`,
      to: "gewersdeon61@gmail.com",
      subject: "📄 New Provider Application Submitted",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border-radius: 8px; background-color: #f9f9f9;">
          <h2 style="color: #1a237e;">New Provider Application Submitted</h2>
          <p><strong>Name:</strong> ${profileData.name}</p>
          <p><strong>Email:</strong> ${profileData.email}</p>
          <p><strong>Phone:</strong> ${profileData.phone}</p>
          <p><strong>Business Address:</strong> ${profileData.businessAddress}</p>
          <p><strong>Town:</strong> ${profileData.town}</p>
          <p><strong>Years of Experience:</strong> ${profileData.yearsOfExperience}</p>
          <p><strong>Services Offered:</strong> ${profileData.services}</p>
          <p><strong>Description:</strong> ${profileData.description}</p>
          <p style="margin-top: 20px; font-size: 14px; color: #555;">The attached document contains the applicant's verification file.</p>
        </div>
      `,
      attachments: [
        {
          filename: req.file.originalname,
          path: req.file.path,
        },
      ],
    };

    // Send email (with error handling)
    try {
      const emailResult = await transporter.sendMail(mailOptions);
      console.log("✅ Email sent successfully!");
      console.log("Email response:", emailResult.response);
      console.log("Message ID:", emailResult.messageId);
      console.log("Sent to:", mailOptions.to);
    } catch (emailError) {
      console.error("⚠️⚠️⚠️ EMAIL SENDING FAILED ⚠️⚠️⚠️");
      console.error("Error code:", emailError.code);
      console.error("Error message:", emailError.message);
      console.error("Error command:", emailError.command);
      console.error("Full error:", JSON.stringify(emailError, null, 2));
      
      // Check specific error types
      if (emailError.code === 'EAUTH') {
        console.error("🔐 Authentication failed - Check EMAIL_USER and EMAIL_PASS");
      } else if (emailError.code === 'ETIMEDOUT' || emailError.code === 'ECONNECTION') {
        console.error("🌐 Network/connection error - Check internet connection");
      }
      
      // Don't fail the whole request if email fails
    }

    // ✅ Return success response
    console.log("✅ Upload completed successfully");
    console.log("=== END UPLOAD DOCUMENTS ===");
    
    return res.status(200).json({
      success: true,
      message: "Document uploaded successfully.",
      document,
    });

  } catch (error) {
    console.error("❌❌❌ CRITICAL ERROR in uploadDocuments ❌❌❌");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    // More detailed error response
    return res.status(500).json({ 
      success: false, 
      message: "Failed to upload document.",
      error: error.message, // ✅ Always send error message for debugging
      errorDetails: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
exports.verifyDocuments = async (req, res) => {
  try {
    const { email, verificationStatus, adminNotes } = req.body;

    // Validation
    if (!["Verified", "Rejected"].includes(verificationStatus)) {
      return res.status(400).json({ success: false, message: "Invalid verification status." });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user || user.role !== "Provider") {
      return res.status(404).json({ success: false, message: "Provider not found or invalid role." });
    }

    // Update provider details
    const providerDetails = await ProviderDetails.findOneAndUpdate(
      { userId: user._id },
      { verificationStatus, adminNotes: adminNotes || null },
      { new: true }
    );

    if (!providerDetails) {
      return res.status(404).json({ success: false, message: "Provider details not found." });
    }

    // Email configuration
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Email content
    const emailSubject = verificationStatus === "Verified" 
      ? "Your Documents Have Been Verified" 
      : "Your Documents Were Rejected";

    // HTML Email Body
    const htmlBody = verificationStatus === "Verified" ? `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9; border-radius: 8px; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a237e; text-align: center; margin: 0 0 20px 0;">🎉 Congratulations! Your Account is Verified</h2>
        <p style="margin: 0 0 15px 0;">Dear ${user.name},</p>
        <p style="margin: 0 0 15px 0;">We are pleased to inform you that your documents have been <strong style="color: #27AE60;">successfully verified</strong>.</p>
        
        <h3 style="color: #1a237e; margin: 20px 0 15px 0;">🚀 Your Free Trial is Now Active</h3>
        <p style="margin: 0 0 15px 0;">
          As a new provider on <strong>Opaleka</strong>, you are now on a 
          <strong style="color: #27AE60;">free trial</strong>. This means you can 
          <strong>start receiving client requests immediately</strong> at no cost. 
          Your free trial will continue <strong>until you receive your first booking.</strong>
        </p>
  
        <h3 style="color: #1a237e; margin: 20px 0 15px 0;">🔄 What Happens After Your First Booking?</h3>
        <p style="margin: 0 0 15px 0;">
          Once you complete your first service booking, your account status will change from 
          <strong>Free Plan</strong> to <strong style="color: #E67E22;">Unpaid</strong>. 
          To continue receiving bookings, you must <strong>activate your account</strong> by paying 
          <strong style="color: #E74C3C;">NAD 180</strong> every 30 days.
        </p>
  
        <h3 style="color: #1a237e; margin: 20px 0 15px 0;">💡 Important Information</h3>
        <ul style="margin: 0 0 15px 0; padding-left: 20px;">
          <li style="margin-bottom: 8px;">✅ Your <strong>Free Plan</strong> allows you to receive <strong>your first service request</strong>.</li>
          <li style="margin-bottom: 8px;">✅ After your <strong>first booking</strong>, payment of <strong>NAD 180</strong> is required.</li>
          <li style="margin-bottom: 8px;">❌ If payment is not made, your <strong>profile will be hidden</strong> from clients.</li>
        </ul>
  
        <p style="margin: 30px 0 15px 0; font-size: 14px; color: #555;">
          If you have any questions, please contact our support team.
        </p>
  
        <div style="text-align: center; margin-top: 40px; color: #777;">
          <p style="margin: 0; font-size: 14px;">Best Regards,</p>
          <p style="margin: 0; font-size: 14px;"><strong>The Opaleka Team</strong></p>
        </div>
      </div>
    ` : `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #fff3f3; border-radius: 8px; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #E74C3C; text-align: center; margin: 0 0 20px 0;">⚠️ Important: Application Rejected</h2>
        <p style="margin: 0 0 15px 0;">Dear ${user.name},</p>
        <p style="margin: 0 0 15px 0;">We were unable to verify your documents. Reason for rejection:</p>
  
        <div style="background-color: #ffe6e6; padding: 15px; border-left: 5px solid #E74C3C; margin: 10px 0;">
          <strong>Reason:</strong> ${adminNotes || "No additional details provided."}
        </div>
  
        <h3 style="color: #1a237e; margin: 20px 0 15px 0;">📌 What You Can Do</h3>
        <ul style="margin: 0 0 15px 0; padding-left: 20px;">
          <li style="margin-bottom: 8px;">🔍 <strong>Review documents</strong> for requirements</li>
          <li style="margin-bottom: 8px;">📄 <strong>Re-upload valid documents</strong></li>
          <li style="margin-bottom: 8px;">💬 Contact support if you believe this is an error</li>
        </ul>
  
        <p style="margin: 30px 0 15px 0; font-size: 14px; color: #555;">
          Complete the steps to get verified and start receiving requests.
        </p>
  
        <div style="text-align: center; margin-top: 40px; color: #777;">
          <p style="margin: 0; font-size: 14px;">Best Regards,</p>
          <p style="margin: 0; font-size: 14px;"><strong>The Opaleka Team</strong></p>
        </div>
      </div>
    `;

    // Plain text version
    const textBody = verificationStatus === "Verified" 
      ? `Congratulations ${user.name}! Your Opaleka account has been verified. You can now receive client requests. After your first booking, a payment of NAD 180 will be required every 30 days to maintain your account.`
      : `Important: Your application was rejected. Reason: ${adminNotes || "No details provided"}. Please review your documents and re-submit.`;

    // Mail options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: emailSubject,
      html: htmlBody,    // HTML version
      text: textBody     // Plain text fallback
    };

    // Send email
    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: `Provider documents ${verificationStatus.toLowerCase()} successfully.`,
    });

  } catch (error) {
    console.error("Error verifying documents:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to verify documents.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getPendingProviders = async (req, res) => {
  try {
    // Find all providers with pending verification status
    const pendingProviders = await ProviderDetails.find({ 
      verificationStatus: "Pending" 
    }).populate({
      path: 'userId',
      model: 'User',
      select: 'name email profileImage' // Only select needed fields from User model
    });

    // Transform the data to match frontend needs
    const formattedProviders = pendingProviders.map(provider => ({
      id: provider._id,
      name: provider.userId.name,
      email: provider.userId.email,
      profileImage: provider.userId.profileImage,
      documents: provider.documents,
      submissionDate: provider.createdAt,
      specializations: provider.specializations,
      experience: provider.experience,
      // Add any other relevant fields you want to send to frontend
    }));

    res.status(200).json({
      success: true,
      message: "Pending providers fetched successfully",
      providers: formattedProviders,
      count: formattedProviders.length
    });

  } catch (error) {
    console.error("Error fetching pending providers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending providers",
      error: error.message
    });
  }
};

// Optional: Add a search endpoint for pending providers
exports.searchPendingProviders = async (req, res) => {
  try {
    const { query } = req.query;

    // Create search regex
    const searchRegex = new RegExp(query, 'i');

    // Find users that match the search query and have pending verification
    const pendingProviders = await ProviderDetails.find({ 
      verificationStatus: "Pending" 
    }).populate({
      path: 'userId',
      model: 'User',
      match: {
        $or: [
          { name: searchRegex },
          { email: searchRegex }
        ]
      },
      select: 'name email profileImage'
    });

    // Filter out null populated users and format response
    const formattedProviders = pendingProviders
      .filter(provider => provider.userId) // Remove entries where populate returned null
      .map(provider => ({
        id: provider._id,
        name: provider.userId.name,
        email: provider.userId.email,
        profileImage: provider.userId.profileImage,
        documents: provider.documents,
        submissionDate: provider.createdAt,
        specializations: provider.specializations,
        experience: provider.experience
      }));

    res.status(200).json({
      success: true,
      message: "Pending providers search completed",
      providers: formattedProviders,
      count: formattedProviders.length
    });

  } catch (error) {
    console.error("Error searching pending providers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search pending providers",
      error: error.message
    });
  }
};

exports.updatePaymentStatus = async (req, res) => {
  try {
    const { email, amountPaid } = req.body;

    // Validate payment amount
    if (amountPaid <= 0) {
      return res.status(400).json({ success: false, message: "Invalid payment amount." });
    }

    // Find the provider
    const user = await User.findOne({ email });
    if (!user || user.role !== "Provider") {
      return res.status(404).json({ success: false, message: "Provider not found or invalid role." });
    }

    // Fetch provider details
    const providerDetails = await ProviderDetails.findOne({ userId: user._id });
    if (!providerDetails) {
      return res.status(404).json({ success: false, message: "Provider details not found." });
    }

    // Check payment status and act accordingly
    if (amountPaid < 180) {
      // Send email for insufficient payment
      const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const emailSubject = "Payment Received - Insufficient Amount";
      const emailBody = `Dear ${user.name},\n\nWe have received your payment of NAD ${amountPaid}. Unfortunately, this amount does not meet the required NAD 180 to activate your account.\n\nPlease complete the remaining payment of NAD ${
        180 - amountPaid
      } to activate your account.\n\nBest regards,\nThe Team`;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: [email, "gewersdeon61@gmail.com"], // Send to both provider and admin
        subject: emailSubject,
        text: emailBody,
      };

      await transporter.sendMail(mailOptions);

      return res.status(200).json({
        success: true,
        message: "Payment received but insufficient. Email notification sent.",
      });
    }

    // If payment is sufficient, update the database
    providerDetails.paidAmount += amountPaid;
    providerDetails.isPaid = true; // Mark as paid
    await providerDetails.save();

    // Send email for successful payment
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const emailSubject = "✅ Payment Confirmation - Your Account is Now Active!";

    const emailBody = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #00AEEF;">Payment Confirmed! ✅</h2>
        <p>Dear ${user.name},</p>
        <p>We have successfully received your payment of <strong>NAD ${amountPaid}</strong>. Your account is now active, and you can start receiving client bookings.</p>
        <p>Make sure your profile and service listings are up to date for the best experience.</p>
        <p><a href="https://opaleka.com/dashboard" style="background-color: #00AEEF; color: white; padding: 10px; text-decoration: none;">Go to Dashboard</a></p>
        <p>Thank you for choosing Opaleka!</p>
        <p>Best Regards,</p>
        <p><strong>Opaleka Team</strong></p>
      </div>
    `;
    
    const mailOptions = {
      from: `"Opaleka Billing" <${process.env.EMAIL_USER}>`,
      to: [email, "gewersdeon61@gmail.com"],
      subject: emailSubject,
      html: emailBody,
    };
 

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: "Payment received and account activated. Email notification sent.",
      providerDetails,
    });
  } catch (error) {
    console.error("Error updating payment status:", error);
    res.status(500).json({ success: false, message: "Failed to update payment status." });
  }
};
exports.getUserDetails = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      console.error("req.user is undefined or missing 'id':", req.user);
      return res.status(400).json({
        success: false,
        message: "Invalid user details.",
      });
    }

    const user = await User.findById(req.user.id).lean(); // Use lean() for plain object
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found." 
      });
    }

    // Include profileImage in the response
    const userDetails = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage
    };

    res.status(200).json({
      success: true,
      user: userDetails,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user details.",
    });
  }
};

// Logout Endpoint
exports.logout = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1]; // Extract the token

  if (!token) {
    return res.status(400).json({ success: false, message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify token

    // Add token to blacklist
    blacklist.add(token);

    return res.status(200).json({
      success: true,
      message: "User logged out successfully",
    });
  } catch (error) {
    console.error("Error during logout:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};


exports.updateProfilePicture = async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      console.error("No file uploaded.");
      return res.status(400).json({
        success: false,
        message: "No file uploaded.",
      });
    }

    console.log("Received userId:", userId);
    console.log("Uploaded file details:", file);

    const user = await User.findById(userId);
    if (!user) {
      console.error("User not found:", userId);
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const filePath = path.join("uploads", file.filename);
    user.profileImage = filePath; // Save relative path to the database
    await user.save();

    console.log("Profile picture updated successfully:", filePath);
    return res.status(200).json({
      success: true,
      message: "Profile picture updated successfully.",
      profileImage: filePath,
    });
  } catch (error) {
    console.error("Error updating profile picture:", error.message || error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile picture.",
    });
  }
};
exports.getUserDetails1 = async (req, res) => {
  try {
    const userId = req.user.id;

    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    // Get user details (excluding password)
    const user = await User.findById(userId).select("-password").lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    // Get complete profile details
    let completeProfile = await CompleteProfile.findOne({ userId })
      .select("businessAddress town yearsOfExperience services operatingHours socialLinks images")
      .lean();

    // Ensure images array exists & format URLs correctly
    if (completeProfile && completeProfile.images) {
      completeProfile.images = completeProfile.images.map((img) =>
        img.startsWith("http") ? img : `https://service-booking-backend-eb9i.onrender.com/${img.replace(/\\/g, "/")}`
      );
    } else {
      completeProfile = {
        businessAddress: "",
        town: "",
        yearsOfExperience: "",
        services: [],
        operatingHours: {},
        socialLinks: {},
        images: [],
      };
    }

    // Construct final response
    const response = {
      success: true,
      user: {
        ...user,
        completeProfile,
        businessName: user.businessName || "",
      },
    };

    // Log response for debugging
    console.log("User Details Response:", JSON.stringify(response, null, 2));

    res.status(200).json(response);
  } catch (error) {
    console.error("Error in getUserDetails1:", error);
    res.status(500).json({ message: "Server error" });
  }
};


exports.updateUserDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    // Fetch user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found." 
      });
    }
// Check if the email is being updated and already exists
if (updates.email && updates.email !== user.email) {
  const emailExists = await User.findOne({ email: updates.email });
  if (emailExists) {
    return res.status(400).json({
      success: false,
      message: "The email address is already in use by another account.",
    });
  }
}

   // Handle password update if provided
if (updates.oldPassword && updates.newPassword) {
  // Verify old password
  const isValidPassword = await bcrypt.compare(updates.oldPassword, user.password);
  if (!isValidPassword) {
    // Return error for incorrect current password
    return res.status(400).json({
      success: false,
      message: "Current password is incorrect."
    });
  }
  
  // Hash new password
  const salt = await bcrypt.genSalt(10);
  updates.password = await bcrypt.hash(updates.newPassword, salt);
  
  // Remove old and new password from updates object
  delete updates.oldPassword;
  delete updates.newPassword;
}

    // Update basic user fields
    const allowedUpdates = ['name', 'email', 'phone', 'password'];
    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) {
        user[field] = updates[field];
      }
    });

    // If the user is a provider and completeProfile updates are provided
    if (user.role === "Provider" && updates.completeProfile) {
      let completeProfile = await CompleteProfile.findOne({ userId: userId });

      if (completeProfile) {
        const profileUpdates = updates.completeProfile;
        
        // Update allowed provider fields
        const allowedProfileUpdates = [
          'businessAddress',
          'town',
          'yearsOfExperience',
          'services',
          'operatingHours',
          'socialLinks'
        ];

        allowedProfileUpdates.forEach((field) => {
          if (profileUpdates[field] !== undefined) {
            completeProfile[field] = profileUpdates[field];
          }
        });

        await completeProfile.save();
      } else {
        // Create new complete profile if it doesn't exist
        completeProfile = new CompleteProfile({
          userId: userId,
          ...updates.completeProfile
        });
        await completeProfile.save();
      }
    }

    // Save user updates
    await user.save();

    res.status(200).json({
      success: true,
      message: "User details updated successfully.",
      user: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profileImage: user.profileImage,
        completeProfile: await CompleteProfile.findOne({ userId: userId })
      }
    });
  } catch (error) {
    console.error("Error updating user details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user details.",
      error: error.message
    });
  }
};



exports.sendNotification = async (req, res) => {
  try {
    const { title, message, audience, userId } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required.",
      });
    }

    let users = [];

    // Determine recipients based on audience
    switch (audience) {
      case "Specific":
        if (!userId) {
          return res.status(400).json({
            success: false,
            message: "User ID or email is required for specific notifications.",
          });
        }

        // Check if the userId is an email or ObjectId
        const query = userId.includes("@")
          ? { email: userId }
          : { _id: userId };

        const user = await User.findOne(query);
        if (!user) {
          return res.status(404).json({
            success: false,
            message: "User not found.",
          });
        }
        users.push(user);
        break;

      case "All":
        users = await User.find();
        break;

      case "Client":
        users = await User.find({ role: "Client" });
        break;

      case "Provider":
        users = await User.find({ role: "Provider" });
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid audience type.",
        });
    }

    // Send notifications
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    for (const user of users) {
      // Save notification to database
      const notification = new Notification({
        userId: user._id,
        title,
        message,
      });
      await notification.save();

      // Send email notification
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: title,
        text: message,
      };
      await transporter.sendMail(mailOptions);
    }

    res.status(200).json({
      success: true,
      message: `Notification sent to ${
        audience === "Specific" ? "the user" : audience.toLowerCase()
      } successfully.`,
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send notification. Please try again later.",
    });
  }
};


exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .select("title message createdAt");

    res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications. Please try again later.",
    });
  }
};

exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Query parameter is required.",
      });
    }

    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: "i" } }, // Case-insensitive search by name
        { email: { $regex: query, $options: "i" } }, // Case-insensitive search by email
      ],
    }).select("id name email role");

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search users. Please try again later.",
    });
  }
};

exports.markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    if (!notificationId) {
      return res.status(400).json({ success: false, message: "Notification ID is required." });
    }

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found." });
    }

    notification.read = true;
    await notification.save();

    res.status(200).json({ success: true, message: "Notification marked as read." });
  } catch (error) {
    console.error("Error in markNotificationAsRead:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};



// Fetch the count of unread notifications for a user
exports.getUnreadNotificationCount = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const unreadCount = await Notification.countDocuments({
      userId,
      read: false,
    });

    res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching unread notification count:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unread notification count",
      error: error.message,
    });
  }
};


exports.uploadService = async (req, res) => {
  try {
    const { name, category, icon, color, description, imageUrl } = req.body;

    // Validate input
    if (!name || !category || !icon || !color || !description || !imageUrl) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Create and save the service
    const service = new Service({
      name,
      category,
      icon,
      color,
      description,
      imageUrl,
    });

    await service.save();

    res.status(201).json({
      success: true,
      message: "Service uploaded successfully.",
      service,
    });
  } catch (error) {
    console.error("Error uploading service:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload service.",
    });
  }
};

exports.getServices = async (req, res) => {
  try {
    const { category } = req.query; // Get the category from query params

    let query = {};
    if (category) {
      query.category = category; // Filter by category if provided
    }

    const services = await Service.find(query); // Fetch all or filtered services

    res.status(200).json({
      success: true,
      message: "Services retrieved successfully.",
      services,
    });
  } catch (error) {
    console.error("Error fetching services:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch services.",
    });
  }
};


exports.getCategories = async (req, res) => {
  try {
    // Use MongoDB's distinct method to fetch unique categories from the Service collection
    const categories = await Service.distinct("category");

    if (!categories || categories.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No categories found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Categories retrieved successfully.",
      categories,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories.",
    });
  }
};

exports.getVerifiedProviders = async (req, res) => {
  try {
    const { serviceName, location, sortBy } = req.query; // ✅ Get sortBy from request

    if (!serviceName) {
      return res.status(400).json({
        success: false,
        message: "Service name is required."
      });
    }

    // Query for verified providers (Free or Paid, but NOT unpaid)
    const verifiedProviders = await ProviderDetails.find({
      verificationStatus: "Verified",
      $or: [
        { paymentStatus: "Free" },
        { paymentStatus: "Paid", paidAmount: { $gt: 0 } }
      ],
    }).populate({
      path: "userId",
      model: "User",
      select: "name profileImage email"
    });

    // Fetch corresponding CompleteProfile records (filtering by service name)
    const completeProfiles = await CompleteProfile.find({
      userId: { $in: verifiedProviders.map(provider => provider.userId._id) },
      "services.name": serviceName
    });

    // Fetch completed bookings and reviews
    const bookings = await Booking.find({
      providerId: { $in: verifiedProviders.map(provider => provider.userId._id) },
      status: "completed"
    });

    const reviews = await Review.find({
      providerId: { $in: verifiedProviders.map(provider => provider.userId._id) }
    });

    // Map bookings and reviews
    const bookingMap = bookings.reduce((map, booking) => {
      map[booking.providerId] = (map[booking.providerId] || 0) + 1;
      return map;
    }, {});

    const reviewMap = reviews.reduce((map, review) => {
      if (!map[review.providerId]) {
        map[review.providerId] = { total: 0, sum: 0 };
      }
      map[review.providerId].total += 1;
      map[review.providerId].sum += review.rating;
      return map;
    }, {});

    const profileMap = completeProfiles.reduce((map, profile) => {
      map[profile.userId.toString()] = {
        businessAddress: profile.businessAddress || "Address not provided",
        description: profile.description || "No description available.",
        town: profile.town || null
      };
      return map;
    }, {});

    // Filter providers based on location
    const filteredProviders = verifiedProviders.filter(provider => {
      const profile = profileMap[provider.userId._id.toString()];
      if (!profile) return false;
      
      if (location && profile.town) {
        return profile.town.toLowerCase().includes(location.toLowerCase());
      }
      return true;
    });

    // Sort Providers based on:
    // 1. Paid Plan (Paid > Free)
    // 2. Completed Bookings (More > Less)
    // 3. Average Rating (Higher > Lower)
    const sortedProviders = filteredProviders
      .map(provider => {
        // Find service price from the complete profile
        const matchingService = completeProfiles.find(profile =>
          profile.userId.toString() === provider.userId._id.toString()
        )?.services.find(service => service.name === serviceName);

        return {
          ...provider.toObject(),
          servicePrice: matchingService ? parseFloat(matchingService.price) : Infinity, // Default high if missing
        };
      })
      .sort((a, b) => {
        const aPaid = a.paymentStatus === "Paid" ? 1 : 0;
        const bPaid = b.paymentStatus === "Paid" ? 1 : 0;

        const aCompletedBookings = bookingMap[a.userId._id] || 0;
        const bCompletedBookings = bookingMap[b.userId._id] || 0;

        const aAvgRating =
          reviewMap[a.userId._id]?.total > 0
            ? reviewMap[a.userId._id].sum / reviewMap[a.userId._id].total
            : 0;

        const bAvgRating =
          reviewMap[b.userId._id]?.total > 0
            ? reviewMap[b.userId._id].sum / reviewMap[b.userId._id].total
            : 0;

        if (sortBy === "priceLow") return a.servicePrice - b.servicePrice; // ✅ Sort Low to High
        if (sortBy === "priceHigh") return b.servicePrice - a.servicePrice; // ✅ Sort High to Low
        if (sortBy === "ratingHigh") return bAvgRating - aAvgRating; // ✅ Sort by Rating High to Low

        return (
          bPaid - aPaid || // Paid Plans First
          bCompletedBookings - aCompletedBookings || // More Bookings First
          bAvgRating - aAvgRating // Higher Rating First
        );
      });

    const formattedProviders = sortedProviders.map(provider => {
      const profile = profileMap[provider.userId._id.toString()] || {};

      // Extract the price of the selected service (if it exists)
      const selectedService = completeProfiles.find(
        profile => profile.userId.toString() === provider.userId._id.toString()
      )?.services.find(service => service.name === serviceName);

      return {
        id: provider.userId._id,
        name: provider.userId.name,
        profileImage: provider.userId.profileImage || "default-profile.png",
        email: provider.userId.email,
        businessAddress: profile.businessAddress,
        description: profile.description,
        town: profile.town || "No location specified",
        completedBookings: bookingMap[provider.userId._id] || 0,
        avgRating:
          reviewMap[provider.userId._id]?.total > 0
            ? reviewMap[provider.userId._id].sum / reviewMap[provider.userId._id].total
            : 0,
        paymentStatus: provider.paymentStatus,
        servicePrice: selectedService ? selectedService.price : null, // ✅ Include price
        priceType: selectedService ? selectedService.priceType : "N/A", // ✅ Include price type
      };
    });

    return res.status(200).json({
      success: true,
      message: sortedProviders.length ? "Providers retrieved successfully." : "No providers found.",
      providers: formattedProviders
    });

  } catch (error) {
    console.error("Error fetching verified providers:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch verified providers.",
      error: error.message
    });
  }
};



exports.getProviderDetails = async (req, res) => {
  try {
    const { name, email } = req.query;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required.",
      });
    }

    // Fetch the user by name and email
    const user = await User.findOne({ name, email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Fetch provider details
    const providerDetails = await ProviderDetails.findOne({ userId: user._id });

    if (!providerDetails) {
      return res.status(404).json({
        success: false,
        message: "Provider details not found.",
      });
    }

    // Fetch complete profile
    const completeProfile = await CompleteProfile.findOne({ userId: user._id });

    if (!completeProfile) {
      return res.status(404).json({
        success: false,
        message: "Provider profile details not found.",
      });
    }

    // Construct response data
    const responseData = {
      _id: user._id, // ✅ ADD THIS
      name: user.name,
      profileImage: user.profileImage,
      verified: providerDetails.verificationStatus === "Verified",
      address: completeProfile.businessAddress,
      phone: user.phone,
      town: completeProfile.town || "Not provided",
      description: completeProfile.description || "No description provided.",
      yearsOfExperience: completeProfile.yearsOfExperience || "Not specified",
      businessName: user.businessName || "Not provided",
      services: completeProfile.services || [],
      operatingHours: completeProfile.operatingHours || {},
      socialLinks: completeProfile.socialLinks || {},
      images: completeProfile.images || [],
    };

    return res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("Error fetching provider details:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch provider details.",
    });
  }
};

exports.getProviderServiceDetails = async (req, res) => {
  try {
    const { name, email, serviceName } = req.query;

    console.log("Received query params:", { name, email, serviceName });

    if (!name || !email || !serviceName) {
      console.log("Missing required parameters.");
      return res.status(400).json({
        success: false,
        message: "Name, email, and service name are required.",
      });
    }

    const user = await User.findOne({ name, email });
    console.log("User found:", user);

    if (!user) {
      console.log("User not found for the provided name and email.");
      return res.status(404).json({
        success: false,
        message: "Provider not found.",
      });
    }

    const providerDetails = await ProviderDetails.findOne({ userId: user._id });
    console.log("Provider details found:", providerDetails);

    if (!providerDetails) {
      console.log("Provider details not found for the user.");
      return res.status(404).json({
        success: false,
        message: "Provider details not found.",
      });
    }

    const service = await Services.findOne({ name: serviceName });
    console.log("Service found in services model:", service);

    if (!service) {
      console.log(`Service "${serviceName}" not found in services model.`);
      return res.status(404).json({
        success: false,
        message: `Service "${serviceName}" not found.`,
      });
    }

    const completeProfile = await CompleteProfile.findOne({ userId: user._id });
    console.log("Complete profile found:", completeProfile);

    if (!completeProfile) {
      console.log("Complete profile not found for the user.");
      return res.status(404).json({
        success: false,
        message: "Provider profile details not found.",
      });
    }

    const offeredService = completeProfile.services.find(
      (s) => s.name === serviceName
    );
    console.log("Offered service found in complete profile:", offeredService);

    if (!offeredService) {
      console.log(
        `Provider does not offer the requested service "${serviceName}".`
      );
      return res.status(404).json({
        success: false,
        message: `Provider does not offer the service "${serviceName}".`,
      });
    }

    const responseData = {
      providerId: user._id, // Include the providerId in the response
      providerName: user.name,
      providerEmail: user.email,
      profileImage: user.profileImage,
      serviceName: offeredService.name,
      price: offeredService.price,
      priceType: offeredService.priceType,
      imageUrl: service.imageUrl,
    };

    console.log("Response data prepared:", responseData);

    res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("Error fetching provider service details:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch provider service details.",
    });
  }
};



exports.addCustomService = async (req, res) => {
  try {
    const { name, category, description } = req.body;

    // Validate request body
    if (!name || !category || !description) {
      console.error("Validation failed: Missing required fields.");
      return res.status(400).json({
        success: false,
        message: "Name, category, and description are required.",
      });
    }

    console.log("Request body:", { name, category, description });

    // Find an existing service with the same category
    const existingService = await Service.findOne({ category });
    console.log("Existing service found:", existingService);

    if (!existingService) {
      console.error(`No existing service found with category "${category}".`);
      return res.status(404).json({
        success: false,
        message: `No existing service found with category "${category}".`,
      });
    }

    // Create a new service using existing service details
    const newService = new Service({
      name,
      category,
      description,
      icon: existingService.icon, // Reuse icon
      color: existingService.color, // Reuse color
      imageUrl: existingService.imageUrl, // Reuse imageUrl
    });

    console.log("New service to be saved:", newService);

    // Save the new service
    const savedService = await newService.save();
    console.log("Saved service:", savedService);

    return res.status(201).json({
      success: true,
      message: "Custom service added successfully to the Services model.",
      data: savedService,
    });
  } catch (error) {
    console.error("Error adding custom service:", error.message);
    return res.status(500).json({
      success: false,
      message: "An error occurred while adding the custom service.",
    });
  }
};


exports.adminSearchToDelete = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required.",
      });
    }

    const searchRegex = new RegExp(query, "i"); // Case-insensitive search

    const users = await User.find({
      $or: [{ name: searchRegex }, { email: searchRegex }],
    }).select("_id name email role"); // Return only required fields

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Error in adminSearchToDelete:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to search for users.",
    });
  }
};


exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: `User with ID ${userId} has been deleted successfully.`,
    });
  } catch (error) {
    console.error("Error deleting user:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete user.",
    });
  }
};


exports.getClientsCount = async (req, res) => {
  try {
    const clientsCount = await User.countDocuments({ role: "Client" });

    res.status(200).json({
      success: true,
      message: "Clients count retrieved successfully.",
      count: clientsCount,
    });
  } catch (error) {
    console.error("Error fetching clients count:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve clients count.",
    });
  }
};


exports.getProvidersCount = async (req, res) => {
  try {
    const providersCount = await User.countDocuments({ role: "Provider" });

    res.status(200).json({
      success: true,
      message: "Providers count retrieved successfully.",
      count: providersCount,
    });
  } catch (error) {
    console.error("Error fetching providers count:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve providers count.",
    });
  }
};


exports.getFreeProvidersCount = async (req, res) => {
  try {
    const freeProvidersCount = await ProviderDetails.countDocuments({
      paymentStatus: "Free",
    });

    res.status(200).json({
      success: true,
      message: "Free providers count retrieved successfully.",
      count: freeProvidersCount,
    });
  } catch (error) {
    console.error("Error fetching free providers count:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve free providers count.",
    });
  }
};


exports.getAllUsersCount = async (req, res) => {
  try {
    // Count all users in the User collection
    const totalUsersCount = await User.countDocuments();

    res.status(200).json({
      success: true,
      message: "Total users count retrieved successfully.",
      count: totalUsersCount,
    });
  } catch (error) {
    console.error("Error fetching total users count:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve total users count.",
    });
  }
};


exports.deleteNotificationByUser = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    if (!notificationId) {
      return res.status(400).json({
        success: false,
        message: "Notification ID is required.",
      });
    }

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found or does not belong to the user.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting notification:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete notification.",
    });
  }
};


exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id; // Get the authenticated user's ID

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Delete the user's complete profile if it exists
    await CompleteProfile.deleteOne({ userId });

    // Delete the user's provider details if they exist
    await ProviderDetails.deleteOne({ userId });

    // Delete user notifications
    await Notification.deleteMany({ userId });

    // Finally, delete the user
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: "Your account has been deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting account:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete account.",
    });
  }
};


exports.getProviderReviews = async (req, res) => {
  try {
    let { providerId } = req.params;
    console.log("Fetching reviews for Provider ID:", providerId); // ✅ Log Provider ID

    // Ensure providerId is in the correct format (ObjectId)
    if (!mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({ success: false, message: "Invalid Provider ID format" });
    }

    providerId = new mongoose.Types.ObjectId(providerId);

    // Fetch reviews for the provider
    const reviews = await Review.find({ providerId })
      .populate({
        path: "userId",
        select: "name profileImage",
      })
      .sort({ createdAt: -1 });

      console.log("Fetched Reviews:", JSON.stringify(reviews, null, 2));


    if (!reviews.length) {
      console.warn(`No reviews found for provider ${providerId}`);
    }

    res.status(200).json({
      success: true,
      reviews: reviews.map((review) => ({
        ...review._doc, 
        review: String(review.review) // Convert to string before sending
      })),      
      reviewCount: reviews.length,
      averageRating: reviews.length
        ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
        : "0.0",
    });
  } catch (error) {
    console.error("Error fetching provider reviews:", error);
    res.status(500).json({ message: "Failed to fetch reviews" });
  }
};

exports.deleteService = async (req, res) => {
  try {
    const userId = req.user.id;
    const { serviceId } = req.params; // Get service ID from request parameters

    if (!userId || !serviceId) {
      return res.status(400).json({ success: false, message: "Invalid request. User ID and Service ID are required." });
    }

    const userProfile = await CompleteProfile.findOne({ userId });

    if (!userProfile) {
      return res.status(404).json({ success: false, message: "User profile not found." });
    }

    // Remove the service from the user's services array
    userProfile.services = userProfile.services.filter(service => service._id.toString() !== serviceId);

    await userProfile.save(); // Save updated profile

    res.status(200).json({ success: true, message: "Service deleted successfully.", services: userProfile.services });
  } catch (error) {
    console.error("Error deleting service:", error);
    res.status(500).json({ success: false, message: "Failed to delete service." });
  }
};


exports.addServiceToProvider = async (req, res) => {
  try {
    const { userId, name, category, description, price, priceType } = req.body;

    // Validate required fields
    if (!userId || !name || !category || !description || !price || !priceType) {
      return res.status(400).json({
        success: false,
        message: "All fields (userId, name, category, description, price, priceType) are required.",
      });
    }

    // Find existing service with the same name
    let existingService = await Service.findOne({ name });

    if (!existingService) {
      // Check if category exists
      const existingCategoryService = await Service.findOne({ category });

      if (!existingCategoryService) {
        return res.status(400).json({
          success: false,
          message: `Category '${category}' does not exist. Please choose a valid category.`,
        });
      }

      // Create a new custom service using details from an existing category
      existingService = new Service({
        name,
        category,
        description,
        icon: existingCategoryService.icon, // Use the same icon
        color: existingCategoryService.color, // Use the same color
        imageUrl: existingCategoryService.imageUrl, // Use the same image
      });

      await existingService.save();
    }

    // Find the provider's complete profile
    let completeProfile = await CompleteProfile.findOne({ userId });

    if (!completeProfile) {
      return res.status(404).json({
        success: false,
        message: "Provider profile not found. Please complete your profile first.",
      });
    }

    // Check if the service is already in the provider's profile
    const isServiceAlreadyAdded = completeProfile.services.some(
      (service) => service.name === existingService.name
    );

    if (isServiceAlreadyAdded) {
      return res.status(400).json({
        success: false,
        message: `Service '${name}' is already added to your profile.`,
      });
    }

    // Add the service to the provider's profile
    completeProfile.services.push({
      name: existingService.name,
      category: existingService.category,
      description: existingService.description,
      icon: existingService.icon,
      color: existingService.color,
      imageUrl: existingService.imageUrl,
      price,
      priceType,
    });

    await completeProfile.save();

    res.status(201).json({
      success: true,
      message: `Service '${name}' added successfully to the provider's profile.`,
      service: completeProfile.services,
    });
  } catch (error) {
    console.error("Error adding service to provider:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to add service. Please try again later.",
    });
  }
};


exports.addImage = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image uploaded.",
      });
    }

    // Find the user's complete profile
    let completeProfile = await CompleteProfile.findOne({ userId });

    if (!completeProfile) {
      return res.status(404).json({
        success: false,
        message: "User profile not found. Please complete your profile first.",
      });
    }

    // Add the new image path to the images array
    const imagePath = req.file.path;
    completeProfile.images.push(imagePath);
    await completeProfile.save();

    res.status(201).json({
      success: true,
      message: "Image added successfully.",
      images: completeProfile.images,
    });
  } catch (error) {
    console.error("Error adding image:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add image.",
    });
  }
};
exports.deleteImage = async (req, res) => {
  try {
      const userId = req.user.id;
      let { imagePath } = req.body;

      console.log("Received request to delete image:", imagePath);

      if (!imagePath) {
          return res.status(400).json({
              success: false,
              message: "Image path is required.",
          });
      }

      // Ensure uniform path format (convert to backslashes for Windows)
      imagePath = imagePath.replace(/\//g, '\\'); // Convert `/` to `\` for matching

      let completeProfile = await CompleteProfile.findOne({ userId });

      if (!completeProfile) {
          return res.status(404).json({
              success: false,
              message: "User profile not found.",
          });
      }

      console.log("Before deletion, images array:", completeProfile.images);

      // Ensure we are removing the correct image path
      completeProfile.images = completeProfile.images.filter(img => img !== imagePath);

      console.log("After deletion, images array:", completeProfile.images);

      // Save the updated profile
      await completeProfile.save();

      console.log("Image successfully removed from database.");

      res.status(200).json({
          success: true,
          message: "Image deleted successfully.",
          images: completeProfile.images,
      });
  } catch (error) {
      console.error("Error deleting image:", error);
      res.status(500).json({
          success: false,
          message: "Failed to delete image.",
      });
  }
};

const cron = require("node-cron");

exports.unpaidReminder = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find provider details
    const providerDetails = await ProviderDetails.findOne({ userId });

    if (!providerDetails || !["Free", "Unpaid"].includes(providerDetails.paymentStatus)) {
      return res.status(200).json({
        success: true,
        showReminder: false, // No reminder needed for paid users
      });
    }

    // ✅ Only show reminder without sending an email
    res.status(200).json({
      success: true,
      showReminder: true, // Show reminder but DO NOT send an email
      status: providerDetails.paymentStatus,
    });

  } catch (error) {
    console.error("Error in unpaid reminder:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process unpaid provider reminder.",
    });
  }
};

cron.schedule("0 8 * * 1", async () => {  // ✅ Runs at 08:00 UTC (which is 10:00 AM in Namibia)
  try {
    console.log("📩 Sending weekly unpaid reminders...");

    const unpaidProviders = await ProviderDetails.find({ 
      paymentStatus: { $in: ["Free", "Unpaid"] } 
    }).populate("userId", "email name");

    // ✅ Filter out entries where userId is null
    const validProviders = unpaidProviders.filter(provider => provider.userId !== null);

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    for (const provider of validProviders) {
      let emailSubject, emailBody;

      if (provider.paymentStatus === "Free") {
        emailSubject = "🚀 Your Free Trial is Active – Here's What You Need to Know!";
        emailBody = `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #1a237e;">🎉 Your Free Trial is Active</h2>
            <p>Dear ${provider.userId.name},</p>
            <p>You are currently on a <strong>free trial</strong> with Opaleka. This means:</p>
            <ul>
              <li>✔ You can <strong>receive one booking</strong> for free.</li>
              <li>✔ Your profile is visible to clients, but priority is given to paid providers.</li>
              <li>✔ To remain visible after your first booking, you need to activate your account.</li>
            </ul>
            
            <h3 style="color: #1a237e;">What’s Next?</h3>
            <p>To continue receiving bookings and gain full access to Opaleka’s features, ensure your account is active with a minimum payment of <strong>NAD 180</strong>.</p>

            <p>Best Regards,</p>
            <p><strong>Opaleka Team</strong></p>
          </div>
        `;
      } else {
        emailSubject = "⚠️ Your Profile is Currently Inactive – Action Required!";
        emailBody = `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #1a237e;">⚠️ Your Provider Profile is Inactive</h2>
            <p>Dear ${provider.userId.name},</p>
            <p>Your account status is currently <strong>unpaid</strong>, which means:</p>
            <ul>
              <li>❌ Your profile is <strong>hidden</strong> from clients.</li>
              <li>❌ You are not receiving any new bookings.</li>
              <li>✅ To restore visibility and resume bookings, a minimum payment of <strong>NAD 180</strong> is required.</li>
            </ul>

            <h3 style="color: #1a237e;">How to Proceed?</h3>
            <p>Once your payment is processed, your profile will be reactivated, and clients will be able to find and book your services immediately.</p>

            <p>Best Regards,</p>
            <p><strong>Opaleka Team</strong></p>
          </div>
        `;
      }

      const mailOptions = {
        from: `"Opaleka Billing" <${process.env.EMAIL_USER}>`,
        to: provider.userId.email,
        subject: emailSubject,
        html: emailBody,
      };

      await transporter.sendMail(mailOptions);
    }

    console.log("✅ Weekly reminders sent successfully!");
  } catch (error) {
    console.error("❌ Error sending weekly reminders:", error);
  }
});


exports.verifyPassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Compare provided password with stored hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Password is incorrect.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Password verified successfully.",
    });
  } catch (error) {
    console.error("Error verifying password:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify password.",
    });
  }
};

exports.updatePassword = async (req, res) => {
  try {
      const { userId } = req.params;
      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
          return res.status(400).json({ success: false, message: "Both old and new passwords are required." });
      }

      // Fetch user from DB
      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({ success: false, message: "User not found." });
      }

      // Verify old password
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
          return res.status(400).json({ success: false, message: "Incorrect current password." });
      }

      // Hash new password before saving
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);

      await user.save();

      res.json({ success: true, message: "Password updated successfully." });
  } catch (error) {
      console.error("Error updating password:", error);
      res.status(500).json({ success: false, message: "Internal server error." });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    // 1. Total users (Clients + Providers)
    const totalUsers = await User.countDocuments();

    // 2. Pending verifications
    const pendingVerifications = await ProviderDetails.countDocuments({
      verificationStatus: "Pending"
    });

    // 3. Active/visible providers (Verified + Free trial or Paid)
    const activeProviders = await ProviderDetails.countDocuments({
      verificationStatus: "Verified",
      $or: [
        { paymentStatus: "Free" },
        { paymentStatus: "Paid", paidAmount: { $gt: 0 } }
      ]
    });

    // 4. Notifications sent today
    const startOfDay = moment().startOf('day');
    const endOfDay = moment().endOf('day');

    const todayNotifications = await Notification.countDocuments({
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeProviders,
        pendingVerifications,
        todayNotifications
      }
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics"
    });
  }
};
