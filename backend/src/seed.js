/**
 * Seeds demo data: one admin, one staff account, a reward catalog, and
 * three members (one per tier) with enough transaction history to
 * demonstrate the earn/redeem/tier flow immediately.
 *
 * Usage: npm run seed   (from the backend/ folder)
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("./config/db");
const User = require("./models/User");
const Member = require("./models/Member");
const Reward = require("./models/Reward");
const Transaction = require("./models/Transaction");

const DEMO_PASSWORD = "password123";

async function seed() {
  await connectDB();

  await Promise.all([
    User.deleteMany({}),
    Member.deleteMany({}),
    Reward.deleteMany({}),
    Transaction.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const admin = await User.create({
    name: "Admin",
    email: "admin@demo.local",
    passwordHash,
    role: "admin",
  });

  const staff = await User.create({
    name: "Counter Staff",
    email: "staff@demo.local",
    passwordHash,
    role: "staff",
  });

  const rewards = await Reward.insertMany([
    { name: "Free Coffee", pointsCost: 100 },
    { name: "Free Pastry", pointsCost: 150 },
    { name: "Free Latte", pointsCost: 200 },
  ]);

  // One member per tier, with a matching transaction so the ledger
  // actually explains how they got there (not just a hardcoded balance).
  const bronzeMember = await Member.create({
    name: "Aarav Bronze",
    phone: "9000000001",
    referralCode: "CAFE-AARAV",
    lifetimePoints: 80,
    currentBalance: 80,
  });
  await Transaction.create({
    member: bronzeMember._id,
    type: "purchase",
    amountSpent: 80,
    pointsEarned: 80,
    balanceAfter: 80,
    staffUser: staff._id,
  });

  const silverMember = await Member.create({
    name: "Priya Silver",
    phone: "9000000002",
    referralCode: "CAFE-PRIYA",
    lifetimePoints: 620,
    currentBalance: 90, // has redeemed some already
  });
  await Transaction.create([
    {
      member: silverMember._id,
      type: "purchase",
      amountSpent: 620,
      pointsEarned: 620,
      balanceAfter: 620,
      staffUser: staff._id,
    },
    {
      member: silverMember._id,
      type: "redemption",
      reward: rewards[2]._id, // Free Latte, 200 pts
      pointsSpent: 200,
      balanceAfter: 420,
      staffUser: staff._id,
    },
    {
      member: silverMember._id,
      type: "redemption",
      reward: rewards[0]._id, // Free Coffee, 100 pts (x3, remaining shown below)
      pointsSpent: 330,
      balanceAfter: 90,
      staffUser: staff._id,
    },
  ]);

  const goldMember = await Member.create({
    name: "Vikram Gold",
    phone: "9000000003",
    referralCode: "CAFE-VIKRAM",
    lifetimePoints: 1600,
    currentBalance: 1450,
  });
  await Transaction.create([
    {
      member: goldMember._id,
      type: "purchase",
      amountSpent: 1200,
      pointsEarned: 1200, // earned at Bronze rate (1x) — lifetime was 0 before this
      balanceAfter: 1200,
      staffUser: staff._id,
    },
    {
      member: goldMember._id,
      type: "purchase",
      amountSpent: 400,
      pointsEarned: 400, // still Bronze rate (1x) — lifetime was 1200, below the 1500 Gold threshold
      balanceAfter: 1600, // this purchase pushes lifetime to 1600, crossing into Gold for next time
      staffUser: staff._id,
    },
    {
      member: goldMember._id,
      type: "redemption",
      reward: rewards[1]._id,
      pointsSpent: 150,
      balanceAfter: 1450,
      staffUser: staff._id,
    },
  ]);

  console.log("\nSeeded demo accounts (all use the same password):\n");
  console.log(`  Admin: admin@demo.local / ${DEMO_PASSWORD}`);
  console.log(`  Staff: staff@demo.local / ${DEMO_PASSWORD}\n`);
  console.log("Demo members (search by phone at the counter):\n");
  console.log(`  9000000001 — Aarav Bronze  (80 pts, Bronze)`);
  console.log(`  9000000002 — Priya Silver  (90 pts, 620 lifetime -> Silver)`);
  console.log(`  9000000003 — Vikram Gold   (1450 pts, 1600 lifetime -> Gold)\n`);

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
