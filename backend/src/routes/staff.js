const express = require("express");
const mongoose = require("mongoose");
const crypto = require("crypto");
const { requireAuth, requireRole } = require("../middleware/auth");
const Member = require("../models/Member");
const Reward = require("../models/Reward");
const Transaction = require("../models/Transaction");
const QrCode = require("../models/QrCode");
const PointLot = require("../models/PointLot");
const { getTier, getNextTier, pointsForPurchase } = require("../utils/tiers");
const { notifyTierChange } = require("../services/notificationService");

const router = express.Router();
router.use(requireAuth, requireRole("staff", "admin"));
const normalizePhone = (x) => String(x || "").replace(/\D/g, "");
const TTL_DAYS = 90;
const expiresFrom = (date = new Date()) => new Date(date.getTime() + TTL_DAYS * 24 * 60 * 60 * 1000);

const serializeMember = (m) => {
  const t = getTier(m.lifetimePoints);
  const next = getNextTier(m.lifetimePoints);
  return {
    id: m._id,
    name: m.name,
    phone: m.phone,
    referralCode: m.referralCode,
    lifetimePoints: m.lifetimePoints,
    currentBalance: m.currentBalance,
    tier: t.name,
    nextTier: next?.name || null,
  };
};
const makeReferral = () => "CAFE-" + crypto.randomBytes(3).toString("hex").toUpperCase();

router.get("/members/lookup", async (req, res) => {
  const p = normalizePhone(req.query.phone);
  if (!p) return res.status(400).json({ error: "phone is required" });
  const m = await Member.findOne({ phone: p });
  if (!m) return res.status(404).json({ error: "No member with that phone number" });
  res.json(serializeMember(m));
});

router.get("/members", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const q = (req.query.q || "").trim();
  const filter = q ? { $or: [{ name: { $regex: q, $options: "i" } }, { phone: normalizePhone(q) || q }] } : {};
  const [members, total] = await Promise.all([
    Member.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(limit),
    Member.countDocuments(filter),
  ]);
  res.json({ members: members.map(serializeMember), page, totalPages: Math.max(1, Math.ceil(total / limit)), total });
});

router.post("/members", async (req, res) => {
  const { name, phone } = req.body;
  const p = normalizePhone(phone);
  if (!name || !p) return res.status(400).json({ error: "name and phone are required" });
  if (p.length < 7 || p.length > 15) return res.status(400).json({ error: "phone must contain 7-15 digits" });
  try { res.status(201).json(serializeMember(await Member.create({ name: String(name).trim(), phone: p, referralCode: makeReferral() }))); }
  catch (e) { res.status(e.code === 11000 ? 409 : 400).json({ error: e.code === 11000 ? "Phone already belongs to another member" : e.message }); }
});

router.patch("/members/:id", async (req, res) => {
  const update = {};
  if (req.body.name) update.name = String(req.body.name).trim();
  if (req.body.phone) update.phone = normalizePhone(req.body.phone);
  try {
    const m = await Member.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!m) return res.status(404).json({ error: "Member not found" });
    res.json(serializeMember(m));
  } catch (e) { res.status(e.code === 11000 ? 409 : 400).json({ error: e.code === 11000 ? "Phone already belongs to another member" : e.message }); }
});

router.delete("/members/:id", async (req, res) => {
  const m = await Member.findByIdAndDelete(req.params.id);
  if (!m) return res.status(404).json({ error: "Member not found" });
  await Promise.all([Transaction.deleteMany({ member: m._id }), QrCode.deleteMany({ member: m._id }), PointLot.deleteMany({ member: m._id })]);
  res.json({ message: "Member deleted" });
});

async function applyEarn({ memberId, points, amountSpent = 0, type = "purchase", staffUser, session }) {
  const m = await Member.findById(memberId).session(session);
  if (!m) throw Object.assign(new Error("Member not found"), { status: 404 });
  const oldTier = getTier(m.lifetimePoints).name;
  const earned = Math.max(0, Math.round(points));
  const updated = await Member.findByIdAndUpdate(m._id, { $inc: { lifetimePoints: earned, currentBalance: earned } }, { new: true, session });
  const tx = await Transaction.create([{ member: m._id, type, amountSpent, pointsEarned: earned, balanceAfter: updated.currentBalance, staffUser }], { session });
  if (earned > 0) {
    await PointLot.create([{ member: m._id, transaction: tx[0]._id, points: earned, remaining: earned, earnedAt: new Date(), expiresAt: expiresFrom(new Date()) }], { session });
  }
  const newTier = getTier(updated.lifetimePoints).name;
  if (oldTier !== newTier) await notifyTierChange({ member: updated, fromTier: oldTier, toTier: newTier, lifetimePoints: updated.lifetimePoints, session });
  return updated;
}

router.post("/members/:id/purchase", async (req, res) => {
  const amount = Number(req.body.amountSpent);
  if (!amount || amount <= 0) return res.status(400).json({ error: "amountSpent must be positive" });
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const m = await Member.findById(req.params.id).session(session);
      if (!m) throw Object.assign(new Error("Member not found"), { status: 404 });
      const earned = pointsForPurchase(amount, m.lifetimePoints);
      result = serializeMember(await applyEarn({ memberId: m._id, points: earned, amountSpent: amount, staffUser: req.user.sub, session }));
    });
    res.json(result);
  } catch (e) { res.status(e.status || 500).json({ error: e.message || "Purchase failed" }); }
  finally { await session.endSession(); }
});

async function spendPoints({ memberId, cost, reward, staffUser, session }) {
  const lots = await PointLot.find({ member: memberId, remaining: { $gt: 0 }, expiresAt: { $gt: new Date() } }).sort({ earnedAt: 1 }).session(session);
  let left = cost;
  for (const lot of lots) {
    if (!left) break;
    const use = Math.min(left, lot.remaining);
    lot.remaining -= use;
    await lot.save({ session });
    left -= use;
  }
  if (left > 0) throw Object.assign(new Error("Not enough tracked points for this reward"), { status: 400 });
  const updated = await Member.findOneAndUpdate({ _id: memberId, currentBalance: { $gte: cost } }, { $inc: { currentBalance: -cost } }, { new: true, session });
  if (!updated) throw Object.assign(new Error("Not enough points for this reward"), { status: 400 });
  await Transaction.create([{ member: updated._id, type: "redemption", reward: reward._id, pointsSpent: cost, balanceAfter: updated.currentBalance, staffUser }], { session });
  return updated;
}

router.post("/members/:id/redeem", async (req, res) => {
  const reward = await Reward.findOne({ _id: req.body.rewardId, active: true });
  if (!reward) return res.status(404).json({ error: "Reward not found or inactive" });
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => { result = serializeMember(await spendPoints({ memberId: req.params.id, cost: reward.pointsCost, reward, staffUser: req.user.sub, session })); });
    res.json(result);
  } catch (e) { res.status(e.status || 500).json({ error: e.message || "Redemption failed" }); }
  finally { await session.endSession(); }
});

router.get("/members/:id/transactions", async (req, res) => res.json(await Transaction.find({ member: req.params.id }).sort({ createdAt: -1 }).limit(50).populate("reward", "name").populate("staffUser", "name")));
router.get("/members/:id/verify", async (req, res) => {
  const m = await Member.findById(req.params.id); if (!m) return res.status(404).json({ error: "Member not found" });
  const tx = await Transaction.find({ member: m._id });
  const computed = tx.reduce((s, t) => s + (t.pointsEarned || 0) - (t.pointsSpent || 0), 0);
  res.json({ storedBalance: m.currentBalance, computedFromLedger: computed, matches: computed === m.currentBalance });
});
router.post("/members/:id/referral-code", async (req, res) => { const m = await Member.findById(req.params.id); if (!m) return res.status(404).json({ error: "Member not found" }); if (!m.referralCode) { m.referralCode = makeReferral(); await m.save(); } res.json({ referralCode: m.referralCode }); });
router.get("/rewards", async (req, res) => res.json(await Reward.find({ active: true }).sort({ pointsCost: 1 })));

router.post("/qr/earn", async (req, res) => {
  const { memberId, points } = req.body;
  if (!memberId || !Number(points) || Number(points) <= 0) return res.status(400).json({ error: "memberId and positive points are required" });
  const member = await Member.findById(memberId); if (!member) return res.status(404).json({ error: "Member not found" });
  const token = crypto.randomBytes(18).toString("hex"); const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await QrCode.create({ token, type: "earn", member: member._id, points: Number(points), expiresAt });
  res.json({ token, expiresAt, member: serializeMember(member) });
});

router.post("/qr/verify", async (req, res) => {
  const token = String(req.body.token || "").trim(); if (!token) return res.status(400).json({ error: "token is required" });
  const qr = await QrCode.findOne({ token }).populate("reward", "name pointsCost");
  if (!qr) return res.status(404).json({ error: "QR code not found" });
  if (qr.used) return res.status(409).json({ error: "This QR code has already been used" });
  if (qr.expiresAt < new Date()) return res.status(410).json({ error: "This QR code has expired" });
  if (qr.type === "earn") {
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        const updated = await applyEarn({ memberId: qr.member, points: qr.points, amountSpent: 0, type: "bonus", staffUser: req.user.sub, session });
        qr.used = true; await qr.save({ session });
        result = { message: "Loyalty points added", member: serializeMember(updated), points: qr.points };
      });
      return res.json(result);
    } catch (e) { return res.status(e.status || 500).json({ error: e.message }); }
    finally { await session.endSession(); }
  }
  qr.used = true; await qr.save();
  const m = await Member.findById(qr.member);
  res.json({ message: "Redemption QR verified", member: m ? { name: m.name, phone: m.phone, currentBalance: m.currentBalance } : null, reward: qr.reward, points: qr.points });
});

module.exports = router;
