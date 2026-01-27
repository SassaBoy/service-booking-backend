const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const cors = require("cors");

// Load environment variables FIRST
console.log("=== Loading Environment Variables ===");
dotenv.config();

// DEBUG: Check if .env loaded correctly
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PORT:", process.env.PORT);
console.log("MONGO_URI loaded:", !!process.env.MONGO_URI);
console.log("MONGO_URI value:", process.env.MONGO_URI ? 
  process.env.MONGO_URI.replace(/mongodb\+srv:\/\/([^:]+):([^@]+)@/, 'mongodb+srv://$1:****@') : 
  'UNDEFINED');
console.log("JWT_SECRET loaded:", !!process.env.JWT_SECRET);
console.log("====================================\n");

// Try to load connectDB (comment out if it doesn't exist)
try {
  const connectDB = require("./config/db");
  connectDB();
} catch (error) {
  console.log("⚠️  No config/db.js found - looking for alternative connection...");
}

const app = express();
app.use(express.json());
app.use(cors());

// Add a simple test route
app.get("/", (req, res) => {
  res.json({ 
    message: "Opaleka API is running", 
    status: "success",
    timestamp: new Date().toISOString()
  });
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use("/api/book", require("./routes/bookRoutes.js"));
app.use("/api/tips", require("./routes/tipsRoutes.js"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use('/api', require("./routes/speechRoutes.js"));
app.use("/api/auth", require("./routes/authRoutes"));
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`\n✅ Server running on port ${PORT}`);
  console.log(`🌐 Test URL: http://localhost:${PORT}`);
  console.log(`📝 API Base: http://localhost:${PORT}/api`);
});
