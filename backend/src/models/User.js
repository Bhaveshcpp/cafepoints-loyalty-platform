const mongoose = require("mongoose");

// Staff and admin accounts only. Café members are NOT User accounts —
// they're looked up by phone number at the counter (see Member.js) and
// never log in themselves.
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["staff", "admin"],
      default: "staff",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
