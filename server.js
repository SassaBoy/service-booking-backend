const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const path = require("path");
const cors = require("cors");


dotenv.config();
connectDB();

const app = express();
app.use(express.json());
app.use(cors());

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use("/api/book", require("./routes/bookRoutes.js"));
app.use("/api/tips", require("./routes/tipsRoutes.js"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use('/api', require("./routes/speechRoutes.js"));

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
