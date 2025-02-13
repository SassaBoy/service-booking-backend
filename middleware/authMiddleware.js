const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

exports.protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, no token provided.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    req.user = user; // Attach user to request
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      console.error("JWT Token has expired:", error.expiredAt);
      return res.status(401).json({
        success: false,
        message: "Token expired. Please log in again.",
        logout: true, // Include a flag for automatic logout
      });
    }

    console.error("JWT Error:", error.message);
    res.status(401).json({
      success: false,
      message: "Not authorized. Invalid token.",
    });
  }
};
