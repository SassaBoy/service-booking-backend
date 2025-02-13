const mongoose = require("mongoose");

const TipSchema = new mongoose.Schema({
  icon: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  colors: {
    type: [String], // Array of strings for gradient colors
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Tip", TipSchema);
