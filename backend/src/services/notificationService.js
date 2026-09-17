const OutboxEvent = require("../models/OutboxEvent");

/**
 * Local Notification Service adapter.
 * Production systems can replace this implementation with email/SMS/push delivery.
 * For this project, tier notifications are durably queued in the outbox.
 */
async function notifyTierChange({ member, fromTier, toTier, lifetimePoints, session }) {
  return OutboxEvent.create([{
    type: "MEMBER_TIER_CHANGED",
    payload: {
      memberId: String(member._id),
      memberName: member.name,
      phone: member.phone,
      fromTier,
      toTier,
      lifetimePoints,
      message: `Congratulations ${member.name}! You reached ${toTier}.`,
    },
  }], session ? { session } : undefined).then((rows) => rows[0]);
}

module.exports = { notifyTierChange };
