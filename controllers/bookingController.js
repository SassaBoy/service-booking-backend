const Notification = require("../models/notificationModel");
const User = require("../models/userModel");
const Booking = require("../models/BookingSchema"); // Import the Booking model
const nodemailer = require("nodemailer");
const { Op } = require('sequelize');


exports.bookService = async (req, res) => {
  try {
    const { userId, providerId, serviceName, date, time, price, address } = req.body;


    console.log("Request body received:", req.body);

    // Identify missing fields
    const missingFields = [];
    if (!userId) missingFields.push("userId");
    if (!providerId) missingFields.push("providerId");
    if (!serviceName) missingFields.push("serviceName");
    if (!date) missingFields.push("date");
    if (!time) missingFields.push("time");
    if (!price) missingFields.push("price");
    if (!address) missingFields.push("address"); // Ensure address is required
    

    if (missingFields.length > 0) {
      console.error("Validation error: Missing fields -", missingFields.join(", "));
      return res.status(400).json({
        success: false,
        message: `Validation error: Missing fields - ${missingFields.join(", ")}.`,
      });
    }

    // Check if the provider exists
    const provider = await User.findById(providerId);
    if (!provider) {
      console.error(`Provider not found: providerId=${providerId}`);
      return res.status(404).json({
        success: false,
        message: "Service provider not found.",
      });
    }

    console.log(`Provider found: ${provider.name} (${provider.email})`);

    // Check if the client exists
    const client = await User.findById(userId);
    if (!client) {
      console.error(`Client not found: userId=${userId}`);
      return res.status(404).json({
        success: false,
        message: "Client not found.",
      });
    }

    console.log(`Client found: ${client.name} (${client.email}, ${client.phone})`);

    const booking = new Booking({
      userId,
      providerId,
      serviceName,
      date,
      time,
      price,
      address, // Include address in booking
      status: "pending", // Default status
    });
    

    await booking.save();
    console.log("Booking saved:", booking);

    const notification = new Notification({
      userId: providerId,
      title: "New Booking Received",
      message: JSON.stringify({
        serviceName: serviceName,
        date: date,
        time: time,
        price: price,
        clientName: client.name,
        clientEmail: client.email,
        clientPhone: client.phone,
        address: address, // ✅ Ensure the address is included in the notification message
      }),
    });
    

    await notification.save();
    console.log("Notification saved:", notification);

    // Send email notification to the provider
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: provider.email,
      subject: `New Booking Notification - ${serviceName}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #1a237e; color: #fff; padding: 20px;">
            <h2 style="margin: 0; font-size: 24px; text-align: center;">New Booking Received</h2>
          </div>
          <div style="padding: 20px;">
            <p style="margin: 0 0 15px;">Dear <strong>${provider.name}</strong>,</p>
            <p style="margin: 0 0 15px;">
              You have received a new booking request from <strong>${client.name}</strong>. Please find the details below:
            </p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 8px; border: 1px solid #e0e0e0; background-color: #f9f9f9; font-weight: bold;">Service</td>
                <td style="padding: 8px; border: 1px solid #e0e0e0;">${serviceName}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #e0e0e0; background-color: #f9f9f9; font-weight: bold;">Date</td>
                <td style="padding: 8px; border: 1px solid #e0e0e0;">${date}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #e0e0e0; background-color: #f9f9f9; font-weight: bold;">Time</td>
                <td style="padding: 8px; border: 1px solid #e0e0e0;">${time}</td>
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
  <td style="padding: 8px; border: 1px solid #e0e0e0;">${client.phone}</td>
</tr>
<tr>
  <td style="padding: 8px; border: 1px solid #e0e0e0; background-color: #f9f9f9; font-weight: bold;">Client Address</td>
  <td style="padding: 8px; border: 1px solid #e0e0e0;">${address}</td>
</tr>

            </table>
            <p style="margin: 0 0 15px;">
              To view more details, please log in to your dashboard.
            </p>
            <p style="margin: 0 0 15px;">Thank you for using our platform!</p>
            <p style="margin: 0 0 15px;">Best regards,</p>
            <p style="margin: 0 0 15px; font-weight: bold;">The Opaleka Team</p>
          </div>
          <div style="background-color: #f5f5f5; color: #888; text-align: center; padding: 10px; font-size: 12px;">
            <p style="margin: 0;">This email was sent automatically. Please do not reply.</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("Email sent to:", provider.email);

    return res.status(201).json({
      success: true,
      message: "Booking created, provider notified, and email sent.",
      booking,
    });
  } catch (error) {
    console.error("Error booking service:", error.message);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error occurred.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "An error occurred while booking the service.",
    });
  }
};

exports.getBookingsForProvider = async (req, res) => {
  try {
    const { status } = req.params; // Extract the status from the request parameters
    const providerId = req.user.id; // Get the provider's ID from the auth middleware

    // Fetch bookings with the given providerId and status
    const bookings = await Booking.find({
      providerId,
      status: status.toLowerCase(),
    }).populate("userId", "name email profileImage phone address"); // Populate user details, including phone

    const mappedBookings = bookings.map((booking) => {
      console.log("Booking Profile Image:", booking.userId.profileImage);
      return {
        id: booking._id,
        serviceName: booking.serviceName,
        clientName: booking.userId.name,
        email: booking.userId.email,
        phone: booking.userId.phone,
        date: booking.date,
        time: booking.time,
        address: booking.address, // Include address in response
        profileImage: booking.userId.profileImage,
      };
    });
    
    return res.status(200).json({
      success: true,
      message: `${status} bookings fetched successfully.`,
      bookings: mappedBookings,
    });
  } catch (error) {
    console.error(`Error fetching ${status} bookings:`, error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching bookings.",
    });
  }
};


const moment = require("moment");

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
  console.log('Deleting rejected record with ID:', bookingId);

  try {

     // Find the booking and update its status
     const booking = await Booking.findByIdAndDelete(
      bookingId,
      { status: 'rejected' },
      { new: true }
    );
    console.log('Query Result:', booking); // Log the query result

    if (!booking) {
      return res.status(400).json({ success: false, message: 'Rejected booking not found.' });
    }

 
    res.json({ success: true, message: 'Rejected booking deleted successfully.' });
  } catch (error) {
    console.error('Error deleting rejected booking:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
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
  console.log('Deleting completed job with ID:', bookingId);

  try {
    const booking = await Booking.findByIdAndDelete(
      bookingId,
      { status: 'completed' },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Completed job not found.' });
    }

    res.json({ success: true, message: 'Completed job deleted successfully.' });
  } catch (error) {
    console.error('Error deleting completed job:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

exports.getAllHistory = async (req, res) => {
  try {
    const clientId = req.user.id; // Ensure client is authenticated
    console.log('Client ID:', clientId);

    const pendingHistory = await Booking.find({ userId: clientId, status: 'pending' })
    .populate('providerId', 'name profileImage email phone')
    .select('serviceName providerId date time address') // Include address in response
    .sort({ createdAt: -1 });
  

    console.log('Pending History Found:', pendingHistory);

    if (!pendingHistory.length) {
      return res.status(404).json({ success: false, message: 'No pending history found.' });
    }

    res.status(200).json({ success: true, data: pendingHistory });
  } catch (error) {
    console.error('Error fetching pending history:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

exports.getCompletedHistory = async (req, res) => {
  try {
    const clientId = req.user.id;
    console.log('Request received for completed history. User ID:', clientId);

    // Fetch completed bookings and populate provider details
    const completedBookings = await Booking.find({ userId: clientId, status: 'completed' })
      .populate('providerId', 'name profileImage email phone')
      .sort({ createdAt: -1 });

    console.log('Completed Bookings:', completedBookings);

    if (!completedBookings || completedBookings.length === 0) {
      return res.status(404).json({ success: false, message: 'No completed history found.' });
    }

    res.status(200).json({ success: true, data: completedBookings });
  } catch (error) {
    console.error('Error fetching completed history:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};


// Fetch rejected bookings for the logged-in client
exports.getRejectedHistory = async (req, res) => {
  try {
    const clientId = req.user.id;
    const rejectedHistory = await Booking.find({ userId: clientId, status: 'rejected' }).sort({ createdAt: -1 });

    if (!rejectedHistory.length) {
      return res.status(404).json({ success: false, message: 'No rejected history found.' });
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



// Controller to delete a completed record
exports.deleteCompletedRecord = async (req, res) => {
  const { bookingId } = req.params; // Extract booking ID from the request parameters

  try {
    // Find and delete the booking with status 'completed' and matching ID
    const booking = await Booking.findOneAndDelete({ _id: bookingId, status: 'completed' });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Completed booking not found or already deleted.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Completed booking deleted successfully.',
    });
  } catch (error) {
    console.error('Error deleting completed booking:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while deleting the completed booking.',
    });
  }
};