const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const { signToken } = require("../utils/token");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many login attempts. Try again later." },
});

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || "").toLowerCase() });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    const token = signToken(user);
    res.cookie("token", token, { httpOnly: true, sameSite: "lax" });
    res.json({ id: user._id, name: user.name, role: user.role });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});

// Lets the frontend restore session state after a page refresh
router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.sub).select("-passwordHash");
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ id: user._id, name: user.name, role: user.role });
});

module.exports = router;
