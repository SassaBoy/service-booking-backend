const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  profileImage: {
    type: String,
    default: "uploads/default-profile.png", 
  },
  role: { type: String, enum: ["Client", "Provider"], required: true },
  businessName: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  resetPasswordOTP: { type: String },
  resetPasswordExpires: { type: Date },
  verificationOTP: { type: String },
  verificationExpires: { type: Date },
  isVerified: { type: Boolean, default: false },
});



module.exports = mongoose.model("User", userSchema);
