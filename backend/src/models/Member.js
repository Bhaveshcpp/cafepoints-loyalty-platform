const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // Normalized (digits only) before saving/querying — see normalizePhone()
    // in routes/staff.js — so "+91 98765-43210" and "9876543210" match.
    phone: { type: String, required: true, unique: true, index: true },
    referralCode: { type: String, unique: true, sparse: true, index: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "Member", default: null },
    // Only ever increases. Used to derive tier — never decremented, even on
    // redemption, so a member can't lose their tier by spending points.
    lifetimePoints: { type: Number, default: 0, min: 0 },
    // Spendable balance. Increases on purchase, decreases on redemption.
    // This field is only ever changed via atomic $inc operations (see
    // routes/staff.js) — never read, modified in JS, then written back —
    // to prevent race conditions from two counter transactions at once.
    currentBalance: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Member", memberSchema);
