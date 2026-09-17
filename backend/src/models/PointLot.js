const mongoose = require("mongoose");

const pointLotSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true, index: true },
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction", default: null },
  points: { type: Number, required: true, min: 1 },
  remaining: { type: Number, required: true, min: 0 },
  earnedAt: { type: Date, required: true, default: Date.now },
  expiresAt: { type: Date, required: true, index: true },
  expiredAt: { type: Date, default: null },
}, { timestamps: true });

pointLotSchema.index({ member: 1, earnedAt: 1 });
module.exports = mongoose.model("PointLot", pointLotSchema);
