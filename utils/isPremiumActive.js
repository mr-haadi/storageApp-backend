
export function isPremiumActive(subscription) {
  if (!subscription) return false;

  const PREMIUM_STATUSES = new Set([
    "active",
    "authenticated",
    "pending",
    "paused",
    "cancelled",
  ]);

  if (!PREMIUM_STATUSES.has(subscription.status)) return false;
  if (!subscription.currentEnd) return false;

  return new Date(subscription.currentEnd) > new Date();
}
