const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true, // Ensure no duplicate service names
    },
    category: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      required: true, // Can be an icon name or URL
    },
    color: {
      type: String,
      required: true, // Hex color code for UI
    },
    description: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      required: true, // URL to the service image
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Service", serviceSchema);
