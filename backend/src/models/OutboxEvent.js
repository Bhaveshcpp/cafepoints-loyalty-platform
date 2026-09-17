const mongoose = require("mongoose");

const outboxEventSchema = new mongoose.Schema({
  type: { type: String, required: true, index: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  status: { type: String, enum: ["pending", "sent"], default: "pending", index: true },
  createdAt: { type: Date, default: Date.now, index: true },
  sentAt: { type: Date, default: null },
}, { versionKey: false });

module.exports = mongoose.model("OutboxEvent", outboxEventSchema);
