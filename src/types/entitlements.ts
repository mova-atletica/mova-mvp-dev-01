export type EntitlementStatus = "active" | "expiring" | "expired";

export interface UserProgramEntitlement {
  id: string;
  programSlug: string;
  programTitle: string;
  purchasedAt: string;
  expiresAt: string;
  durationDays: number;
  priceCents: number;
}

export interface PurchaseProgramInput {
  programSlug: string;
  programTitle: string;
  durationDays: number;
  priceCents: number;
}
