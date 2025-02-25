const mongoose = require("mongoose");

const completeProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  businessAddress: { type: String, required: true },
  town: { type: String, required: true },
  yearsOfExperience: { type: Number, required: true },
  description: { type: String, default: "No description provided." },
  services: [
    {
      name: { type: String, required: true },
      category: { type: String, required: true },
      price: { type: Number, required: true },
      priceType: { type: String, enum: ["hourly", "once-off"], required: true }, // Add priceType
    },
  ],  
  operatingHours: {
    Monday: { start: String, end: String, isClosed: Boolean },
    Tuesday: { start: String, end: String, isClosed: Boolean },
    Wednesday: { start: String, end: String, isClosed: Boolean },
    Thursday: { start: String, end: String, isClosed: Boolean },
    Friday: { start: String, end: String, isClosed: Boolean },
    Saturday: { start: String, end: String, isClosed: Boolean },
    Sunday: { start: String, end: String, isClosed: Boolean },
  },
  socialLinks: {
    website: { type: String },
    facebook: { type: String },
    instagram: { type: String },
    linkedin: { type: String },
    twitter: { type: String },
    tiktok: { type: String },
  },
  images: [{ type: String, required: true }], // Array of image file paths
});

module.exports = mongoose.model("CompleteProfile", completeProfileSchema);
