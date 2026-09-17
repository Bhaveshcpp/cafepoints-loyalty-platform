const TIERS = [
  { name: "Platinum", threshold: 5000, earnRate: 0.3 },
  { name: "Gold", threshold: 1500, earnRate: 1.5 },
  { name: "Silver", threshold: 500, earnRate: 1.25 },
  { name: "Bronze", threshold: 0, earnRate: 1 },
];

function getTier(lifetimePoints) {
  return TIERS.find((t) => lifetimePoints >= t.threshold) || TIERS[TIERS.length - 1];
}

function getNextTier(lifetimePoints) {
  const current = getTier(lifetimePoints);
  const index = TIERS.findIndex((t) => t.name === current.name);
  return index > 0 ? TIERS[index - 1] : null;
}

function pointsForPurchase(amountSpent, lifetimePoints) {
  const tier = getTier(lifetimePoints);
  return Math.round(amountSpent * tier.earnRate);
}

module.exports = { TIERS, getTier, getNextTier, pointsForPurchase };
