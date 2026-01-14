const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const path = require("path");
const cors = require("cors");

dotenv.config();
connectDB();

const app = express();

/**
 * 🔹 CORS FIRST
 */
app.use(cors());

/**
 * 🔹 ROUTES THAT MAY USE MULTER
 * (MUST COME BEFORE body parsers)
 */
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use("/api/book", require("./routes/bookRoutes.js"));
app.use("/api/tips", require("./routes/tipsRoutes.js"));
app.use("/api", require("./routes/speechRoutes.js"));

/**
 * 🔹 STATIC FILES
 */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/**
 * 🔹 BODY PARSERS (LAST!)
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
