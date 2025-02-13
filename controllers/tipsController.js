const Tip = require("../models/Tip");

// Fetch all tips
exports.getTips = async (req, res) => {
  try {
    const tips = await Tip.find().sort({ createdAt: -1 }); // Fetch tips in descending order of creation
    res.status(200).json({ success: true, data: tips });
  } catch (error) {
    console.error("Error fetching tips:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch tips" });
  }
};

// Create a new tip
exports.createTip = async (req, res) => {
  try {
    const { icon, title, description, colors } = req.body;

    if (!icon || !title || !description || !colors) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const tip = new Tip({ icon, title, description, colors });
    await tip.save();
    res.status(201).json({ success: true, data: tip });
  } catch (error) {
    console.error("Error creating tip:", error.message);
    res.status(500).json({ success: false, message: "Failed to create tip" });
  }
};

// Update a tip
exports.updateTip = async (req, res) => {
  try {
    const { id } = req.params;
    const { icon, title, description, colors } = req.body;

    const updatedTip = await Tip.findByIdAndUpdate(
      id,
      { icon, title, description, colors },
      { new: true }
    );

    if (!updatedTip) {
      return res.status(404).json({ success: false, message: "Tip not found" });
    }

    res.status(200).json({ success: true, data: updatedTip });
  } catch (error) {
    console.error("Error updating tip:", error.message);
    res.status(500).json({ success: false, message: "Failed to update tip" });
  }
};

// Delete a tip
exports.deleteTip = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedTip = await Tip.findByIdAndDelete(id);

    if (!deletedTip) {
      return res.status(404).json({ success: false, message: "Tip not found" });
    }

    res.status(200).json({ success: true, message: "Tip deleted successfully" });
  } catch (error) {
    console.error("Error deleting tip:", error.message);
    res.status(500).json({ success: false, message: "Failed to delete tip" });
  }
};
