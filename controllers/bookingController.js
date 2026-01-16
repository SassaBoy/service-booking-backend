const Notification = require("../models/notificationModel");
const User = require("../models/userModel");
const Booking = require("../models/BookingSchema"); // Import the Booking model
const nodemailer = require("nodemailer");
const { Op } = require('sequelize');
const ProviderDetails = require("../models/providerDetailsModel");
const moment = require("moment");

exports.bookService = async (req, res) => {
  try {
    const { userId, providerId, serviceName, date, time, price, address } = req.body;

    console.log("=== BOOKING REQUEST RECEIVED ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    // Identify missing fields
    const missingFields = [];
    if (!userId) missingFields.push("userId");
    if (!providerId) missingFields.push("providerId");
    if (!serviceName) missingFields.push("serviceName");
    if (!date) missingFields.push("date");
    if (!time) missingFields.push("time");
    if (!price) missingFields.push("price");
    if (!address) missingFields.push("address"); 

    if (missingFields.length > 0) {
      console.error("❌ Validation error: Missing fields -", missingFields.join(", "));
      return res.status(400).json({
        success: false,
        message: `Validation error: Missing fields - ${missingFields.join(", ")}.`,
      });
    }

    console.log("✅ All required fields present");

    // Check if the provider exists
    const provider = await User.findById(providerId);
    if (!provider) {
      console.error(`❌ Provider not found: providerId=${providerId}`);
      return res.status(404).json({
        success: false,
        message: "Service provider not found.",
      });
    }

    console.log(`✅ Provider found: ${provider.name} (${provider.email})`);

    // Check if the client exists
    const client = await User.findById(userId);
    if (!client) {
      console.error(`❌ Client not found: userId=${userId}`);
      return res.status(404).json({
        success: false,
        message: "Client not found.",
      });
    }

    console.log(`✅ Client found: ${client.name} (${client.email}, ${client.phone || 'No phone'})`);

    // Check if this is the provider's first booking
    const existingBookings = await Booking.find({ providerId });
    console.log(`📊 Existing bookings for provider: ${existingBookings.length}`);
    
    if (existingBookings.length === 0) {
      console.log(`🎯 First booking for provider ${providerId}. Updating payment status to "Unpaid".`);

      const updateResult = await ProviderDetails.findOneAndUpdate(
        { userId: providerId },
        { paymentStatus: "Unpaid" },
        { new: true }
      );
      
      if (updateResult) {
        console.log(`✅ Provider payment status updated to: ${updateResult.paymentStatus}`);
      } else {
        console.warn(`⚠️ Could not find ProviderDetails for userId: ${providerId}`);
      }
    }

    // Create the booking
    console.log("📝 Creating booking...");
    const booking = new Booking({
      userId,
      providerId,
      serviceName,
      date,
      time,
      price,
      address, 
      status: "pending",
    });

    await booking.save();
    console.log("✅ Booking saved:", booking._id);

    // Create a notification
    console.log("🔔 Creating notification...");
    const notification = new Notification({
      userId: providerId,
      title: "New Booking Received",
      message: JSON.stringify({
        serviceName,
        date,
        time,
        price,
        clientName: client.name,
        clientEmail: client.email,
        clientPhone: client.phone || "Not provided",
        address,
      }),
    });

    await notification.save();
    console.log("✅ Notification saved:", notification._id);

    // Send email notification to the provider
    console.log("📧 Preparing email...");
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Format date and time
    const formattedDate = moment(date).format("dddd, MMMM D, YYYY");
    const formattedTime = moment(time, "HH:mm").format("hh:mm A");

    console.log("📅 Formatted date:", formattedDate);
    console.log("⏰ Formatted time:", formattedTime);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: provider.email,
      subject: `New Booking Notification - ${serviceName}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #1a237e;">New Booking Received</h2>
          <p>Dear <strong>${provider.name}</strong>,</p>
          <p>You have received a new booking request from <strong>${client.name}</strong>. Please find the details below:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; border: 1px solid #e0e0e0; background-color: #f9f9f9; font-weight: bold;">Service</td>
              <td style="padding: 8px; border: 1px solid #e0e0e0;">${serviceName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e0e0e0; background-color: #f9f9f9; font-weight: bold;">Date</td>
              <td style="padding: 8px; border: 1px solid #e0e0e0;">${formattedDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e0e0e0; background-color: #f9f9f9; font-weight: bold;">Time</td>
              <td style="padding: 8px; border: 1px solid #e0e0e0;">${formattedTime}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e0e0e0; background-color: #f9f9f9; font-weight: bold;">Price</td>
              <td style="padding: 8px; border: 1px solid #e0e0e0;">N$${price}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e0e0e0; background-color: #f9f9f9; font-weight: bold;">Client Email</td>
              <td style="padding: 8px; border: 1px solid #e0e0e0;">${client.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e0e0e0; background-color: #f9f9f9; font-weight: bold;">Client Phone</td>
              <td style="padding: 8px; border: 1px solid #e0e0e0;">${client.phone || "Not provided"}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e0e0e0; background-color: #f9f9f9; font-weight: bold;">Client Address</td>
              <td style="padding: 8px; border: 1px solid #e0e0e0;">${address}</td>
            </tr>
          </table>
          <p>To view more details, please log in to your dashboard.</p>
          <p>Best regards,</p>
          <p><strong>Opaleka Team</strong></p>
        </div>
      `,
    };

    try {
      const emailResult = await transporter.sendMail(mailOptions);
      console.log("✅ Email sent successfully!");
      console.log("Email messageId:", emailResult.messageId);
      console.log("Sent to:", provider.email);
    } catch (emailError) {
      console.error("⚠️ Email sending failed:", emailError.message);
      console.error("Email error code:", emailError.code);
      // Don't fail the booking if email fails
    }

    console.log("=== BOOKING COMPLETED SUCCESSFULLY ===");

    return res.status(201).json({
      success: true,
      message: "Booking created, provider notified, and email sent.",
      booking: {
        id: booking._id,
        serviceName: booking.serviceName,
        date: booking.date,
        time: booking.time,
        status: booking.status,
      },
    });
  } catch (error) {
    console.error("❌❌❌ CRITICAL ERROR in bookService ❌❌❌");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    return res.status(500).json({
      success: false,
      message: "An error occurred while booking the service.",
      error: error.message, // Send actual error for debugging
      errorType: error.name,
    });
  }
};
exports.getBookingsForProvider = async (req, res) => {
  try {
    const { status } = req.params; // Extract the status from request parameters
    const providerId = req.user.id; // Get provider ID from authentication

    // Construct query
    const query = {
      providerId,
      status: status.toLowerCase(),
    };

    // ✅ If fetching 'completed' or 'rejected' bookings, exclude those deleted by the provider
    if (["completed", "rejected"].includes(status.toLowerCase())) {
      query.deletedByUsers = { $ne: providerId }; // Exclude deleted records for this provider
    }

    // Fetch bookings
    const bookings = await Booking.find(query)
      .populate("userId", "name email profileImage phone address");

    // Format the response
    const mappedBookings = bookings.map((booking) => ({
      id: booking._id,
      serviceName: booking.serviceName,
      clientName: booking.userId.name,
      email: booking.userId.email,
      phone: booking.userId.phone,
      date: booking.date,
      time: booking.time,
      price: booking.price,
      address: booking.address,
      profileImage: booking.userId.profileImage,
      createdAt: booking.createdAt,
    }));

    return res.status(200).json({
      success: true,
      message: `${status} bookings fetched successfully.`,
      bookings: mappedBookings,
    });

  } catch (error) {
    console.error("Error fetching bookings:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching bookings.",
    });
  }
};



exports.acceptBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Find the booking and update its status
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { status: "confirmed" },
      { new: true }
    ).populate("userId", "name email");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    // Format the date and time
    const formattedDate = moment(booking.date).format("dddd, MMMM D, YYYY"); // Example: "Saturday, January 26, 2025"
    const formattedTime = moment(booking.time, "HH:mm").format("hh:mm A"); // Example: "02:30 PM"

    // Send confirmation email to the client
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Opaleka Bookings" <${process.env.EMAIL_USER}>`,
      to: booking.userId.email,
      subject: `✅ Your Booking is Confirmed - ${booking.serviceName}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #1a237e;">Your Booking is Confirmed ✅</h2>
          <p>Dear <strong>${booking.userId.name}</strong>,</p>
          <p>We are pleased to inform you that your booking for <strong>${booking.serviceName}</strong> has been successfully confirmed.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; border: 1px solid #e0e0e0; background-color: #f9f9f9; font-weight: bold;">📅 Date</td>
              <td style="padding: 8px; border: 1px solid #e0e0e0;">${formattedDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e0e0e0; background-color: #f9f9f9; font-weight: bold;">⏰ Time</td>
              <td style="padding: 8px; border: 1px solid #e0e0e0;">${formattedTime}</td>
            </tr>
          </table>

          <p>For any questions or further assistance, feel free to contact your service provider.</p>
          <p>Thank you for choosing Opaleka! We hope you have a great experience. 😊</p>

          <p>Best Regards,</p>
          <p><strong>Opaleka Team</strong></p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      message: "Booking successfully accepted. A confirmation email has been sent to the client.",
      booking,
    });
  } catch (error) {
    console.error("Error accepting booking:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while accepting the booking.",
    });
  }
};




exports.rejectBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Find the booking and update its status
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { status: "rejected" },
      { new: true }
    ).populate("userId", "name email");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    // Format the date and time
    const formattedDate = moment(booking.date).format("dddd, MMMM D, YYYY"); // Example: "Saturday, January 26, 2025"
    const formattedTime = moment(booking.time, "HH:mm").format("hh:mm A"); // Example: "02:30 PM"

    // Send rejection email to the client
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Opaleka Support" <${process.env.EMAIL_USER}>`,
      to: booking.userId.email,
      subject: `⚠️ Booking Rejected - ${booking.serviceName}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #1a237e;">⚠️ Your Booking Request Has Been Rejected</h2>
          <p>Dear <strong>${booking.userId.name}</strong>,</p>
          <p>We regret to inform you that your booking request for <strong>${booking.serviceName}</strong> has been rejected.</p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; border: 1px solid #e0e0e0; background-color: #f9f9f9; font-weight: bold;">📅 Date</td>
              <td style="padding: 8px; border: 1px solid #e0e0e0;">${formattedDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e0e0e0; background-color: #f9f9f9; font-weight: bold;">⏰ Time</td>
              <td style="padding: 8px; border: 1px solid #e0e0e0;">${formattedTime}</td>
            </tr>
          </table>

          <p>We apologize for any inconvenience. If you have any questions, feel free to reach out to our support team.</p>
          <p>You may try booking another provider or rescheduling your appointment.</p>

          <p>Best Regards,</p>
          <p><strong>Opaleka Team</strong></p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      message: "Booking successfully rejected. An email has been sent to the client.",
      booking,
    });
    
  } catch (error) {
    console.error("Error rejecting booking:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while rejecting the booking.",
    });
  }
};
exports.deleteRejectedRecord = async (req, res) => {
  const { bookingId } = req.params;
  const providerId = req.user.id; // Ensure the provider ID is obtained from the auth middleware
  console.log(`Attempting to soft delete rejected record with ID: ${bookingId} by provider ${providerId}`);

  try {
    // ✅ Check if the booking exists
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      console.error(`Rejected booking with ID ${bookingId} not found.`);
      return res.status(404).json({
        success: false,
        message: 'Rejected booking not found or already deleted.',
      });
    }

    // ✅ Ensure the status is 'rejected' before deleting
    if (booking.status !== 'rejected') {
      console.error(`Booking ID ${bookingId} is not marked as rejected.`);
      return res.status(400).json({
        success: false,
        message: 'This booking is not marked as rejected and cannot be deleted.',
      });
    }

    // ✅ Soft delete by adding provider ID to `deletedByUsers`
    booking.deletedByUsers = booking.deletedByUsers || [];
    
    if (!booking.deletedByUsers.includes(providerId)) {
      booking.deletedByUsers.push(providerId);
      await booking.save();
    }

    console.log(`Rejected booking with ID ${bookingId} soft deleted successfully for provider ${providerId}.`);
    return res.status(200).json({
      success: true,
      message: 'Rejected booking removed from your list successfully.',
    });

  } catch (error) {
    console.error(`Error soft deleting rejected booking ID ${bookingId}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while deleting the rejected booking.',
      error: error.message,
    });
  }
};



exports.completeJob = async (req, res) => {
  const { bookingId } = req.params;

  try {
    // Mark the booking as completed and set pendingRating to true
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { status: "completed", pendingRating: true },
      { new: true }
    ).populate("userId", "name email").populate("providerId", "name email");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    const client = booking.userId;
    const provider = booking.providerId;

    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found." });
    }

    // Format date and time
    const formattedDate = moment(booking.date).format("dddd, MMMM D, YYYY"); // Example: "Saturday, January 26, 2025"
    const formattedTime = moment(booking.time, "HH:mm A"); // Example: "02:30 PM"

    // Create an in-app notification for the client
    const notification = new Notification({
      userId: client._id,
      title: "Job Completed",
      message: `Your booking for ${booking.serviceName} has been completed. You can now rate your provider.`,
    });

    await notification.save();

    // Send email notification to the client
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Opaleka Team" <${process.env.EMAIL_USER}>`,
      to: client.email,
      subject: `✅ Job Completed - ${booking.serviceName}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #1a237e;">✅ Your Job is Completed</h2>
          <p>Dear <strong>${client.name}</strong>,</p>
          <p>Your booking for <strong>${booking.serviceName}</strong> has been successfully completed.</p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; border: 1px solid #e0e0e0; background-color: #f9f9f9; font-weight: bold;">📅 Date</td>
              <td style="padding: 8px; border: 1px solid #e0e0e0;">${formattedDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e0e0e0; background-color: #f9f9f9; font-weight: bold;">⏰ Time</td>
              <td style="padding: 8px; border: 1px solid #e0e0e0;">${formattedTime}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e0e0e0; background-color: #f9f9f9; font-weight: bold;">👤 Provider</td>
              <td style="padding: 8px; border: 1px solid #e0e0e0;">${provider.name} (${provider.email})</td>
            </tr>
          </table>

          <p>We hope you had a great experience! Please take a moment to <strong>rate your service provider</strong>.</p>
          <p>Your feedback helps improve the quality of services on Opaleka.</p>

          <p>Best Regards,</p>
          <p><strong>Opaleka Team</strong></p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: "Job marked as completed, pending rating updated, email notification sent to the client.",
    });
  } catch (error) {
    console.error("Error completing job:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

exports.deleteCompletedJob = async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user.id; // Get authenticated user ID

  console.log(`Attempting to delete completed job with ID: ${bookingId} for user: ${userId}`);

  try {
    // ✅ Check if the booking exists
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      console.error(`Booking with ID ${bookingId} not found.`);
      return res.status(404).json({
        success: false,
        message: 'Completed job not found or already deleted.',
      });
    }

    // ✅ Ensure the status is 'completed' before soft deleting
    if (booking.status !== 'completed') {
      console.error(`Booking ID ${bookingId} is not marked as completed.`);
      return res.status(400).json({
        success: false,
        message: 'This job is not marked as completed and cannot be deleted.',
      });
    }

    // ✅ Soft delete by adding user ID to `deletedByUsers`
    if (!booking.deletedByUsers.includes(userId)) {
      booking.deletedByUsers.push(userId);
      await booking.save();
    }

    console.log(`Booking with ID ${bookingId} soft deleted for user ${userId}.`);
    return res.status(200).json({
      success: true,
      message: 'Completed job deleted for this user only.',
    });

  } catch (error) {
    console.error(`Error deleting completed booking ID ${bookingId}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while deleting the completed job.',
      error: error.message,
    });
  }
};

exports.getAllHistory = async (req, res) => {
  try {
    const clientId = req.user.id;
    console.log('Client ID:', clientId);

    const pendingHistory = await Booking.find({
      userId: clientId,
      status: 'pending',
      deletedByUsers: { $ne: clientId }, // Exclude deleted bookings for this user
    })
      .populate('providerId', 'name profileImage email phone')
      .select('serviceName providerId date time address price createdAt')
      .sort({ createdAt: -1 });

    console.log('🔥 Pending Bookings Found:', JSON.stringify(pendingHistory, null, 2));

    return res.status(200).json({ success: true, data: pendingHistory });

  } catch (error) {
    console.error('Error fetching pending history:', error);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
};

exports.getCompletedHistory = async (req, res) => {
  try {
    const clientId = req.user.id;
    console.log('Request received for completed history. User ID:', clientId);

    const completedBookings = await Booking.find({
      userId: clientId,
      status: 'completed',
      deletedByUsers: { $ne: clientId }, // Exclude deleted bookings for this user
    })
      .populate('providerId', 'name profileImage email phone createdAt')
      .sort({ createdAt: -1 });

    if (!completedBookings.length) {
      return res.status(200).json({ success: true, data: [] }); // Return empty instead of 404
    }

    res.status(200).json({ success: true, data: completedBookings });
  } catch (error) {
    console.error('Error fetching completed history:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};


exports.getRejectedHistory = async (req, res) => {
  try {
    const clientId = req.user.id;

    const rejectedHistory = await Booking.find({
      userId: clientId,
      status: 'rejected',
      deletedByUsers: { $ne: clientId }, // Exclude deleted bookings for this user
    })
      .populate('providerId', 'name profileImage email phone createdAt')
      .sort({ createdAt: -1 });

    if (!rejectedHistory.length) {
      return res.status(200).json({ success: true, data: [] });
    }

    res.status(200).json({ success: true, data: rejectedHistory });
  } catch (error) {
    console.error('Error fetching rejected history:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

exports.deletePendingRecord = async (req, res) => {
  const { bookingId } = req.params; // Extract the booking ID from the request parameters
  const clientId = req.user.id; // Get the client's ID from the authentication middleware

  console.log('Client ID:', clientId);
  console.log('Deleting pending record with ID:', bookingId);

  try {
    // Find the booking with the provided ID and ensure it's in "pending" status and belongs to the client
    const booking = await Booking.findOneAndDelete({
      _id: bookingId,
      userId: clientId,
      status: 'pending',
    });

    // If no booking was found
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Pending booking not found or not authorized to delete.',
      });
    }

    console.log('Deleted Booking:', booking);

    res.status(200).json({
      success: true,
      message: 'Pending booking deleted successfully.',
    });
  } catch (error) {
    console.error('Error deleting pending booking:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
};


exports.cancelBooking = async (req, res) => {
  const { bookingId } = req.params; // Extract the booking ID from the request parameters
  const clientId = req.user.id; // Get the client's ID from the authentication middleware

  console.log(`Cancelling booking with ID: ${bookingId} by user: ${clientId}`);

  try {
    // Find the booking and ensure it's in "pending" status before marking as "rejected"
    const booking = await Booking.findOneAndUpdate(
      { _id: bookingId, userId: clientId, status: 'pending' },
      { status: 'rejected' },
      { new: true }
    );

    if (!booking) {
      console.log(`Booking ID ${bookingId} not found or already processed.`);
      return res.status(404).json({
        success: false,
        message: 'Pending booking not found or already cancelled.',
      });
    }

    console.log(`Booking ID ${bookingId} successfully marked as rejected.`);

    res.status(200).json({
      success: true,
      message: 'Booking successfully cancelled.',
      booking,
    });

  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
};
exports.deleteCompletedRecord = async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user.id; // Get authenticated user ID

  try {
    const booking = await Booking.findOne({ _id: bookingId, status: 'completed' });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Completed booking not found or already deleted.',
      });
    }

    // Add user ID to `deletedByUsers` array instead of hard deleting
    if (!booking.deletedByUsers.includes(userId)) {
      booking.deletedByUsers.push(userId);
      await booking.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Booking deleted for this user only.',
    });
  } catch (error) {
    console.error('Error deleting completed booking:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while deleting the completed booking.',
    });
  }
};

exports.deleteRejectedHistory = async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user.id; // Authenticated user ID

  try {
    const booking = await Booking.findOne({ _id: bookingId, status: 'rejected' });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Rejected booking not found or already deleted.',
      });
    }

    // Soft delete by adding user ID to `deletedByUsers` array
    if (!booking.deletedByUsers.includes(userId)) {
      booking.deletedByUsers.push(userId);
      await booking.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Rejected booking deleted for this user only.',
    });
  } catch (error) {
    console.error('Error deleting rejected booking:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while deleting the rejected booking.',
    });
  }
};
