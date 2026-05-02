import type { SubscriptionTier } from "@/features/auth/model/types";

export const FREE_HISTORY_LIMIT = 8;
export const PRO_HISTORY_LIMIT = 48;
export const PREMIUM_LIVE_LABEL = "Priority invite lane";

export function getHistoryLimitForTier(tier: SubscriptionTier | null | undefined) {
  return tier === "pro" ? PRO_HISTORY_LIMIT : FREE_HISTORY_LIMIT;
}
