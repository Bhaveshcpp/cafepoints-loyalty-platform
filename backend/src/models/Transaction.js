const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true, index: true },
  type: { type: String, enum: ["purchase", "redemption", "bonus", "expiry"], required: true },
  amountSpent: { type: Number, default: null },
  pointsEarned: { type: Number, default: 0 },
  reward: { type: mongoose.Schema.Types.ObjectId, ref: "Reward", default: null },
  pointsSpent: { type: Number, default: 0 },
  balanceAfter: { type: Number, required: true },
  staffUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
}, { timestamps: true });

module.exports = mongoose.model("Transaction", transactionSchema);
