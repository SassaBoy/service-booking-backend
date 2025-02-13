const express = require("express");
const router = express.Router();
const {
  getTips,
  createTip,
  updateTip,
  deleteTip,
} = require("../controllers/tipsController");

// GET all tips
router.get("/", getTips);

// POST a new tip
router.post("/", createTip);

// PUT (update) a tip by ID
router.put("/:id", updateTip);

// DELETE a tip by ID
router.delete("/:id", deleteTip);

module.exports = router;
