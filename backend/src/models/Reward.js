const mongoose = require("mongoose");

const rewardSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "Free Latte"
    pointsCost: { type: Number, required: true, min: 1 },
    // Retired rewards are deactivated, not deleted, so past Transaction
    // records referencing them still resolve to a real document.
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Reward", rewardSchema);
