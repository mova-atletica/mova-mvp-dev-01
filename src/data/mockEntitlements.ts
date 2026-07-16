import type { UserProgramEntitlement } from "../types/entitlements";

/** Seed entitlements for UI preview — one active paid program. */
export const MOCK_ENTITLEMENTS: UserProgramEntitlement[] = [
  {
    id: "ent-mock-calisthenics",
    programSlug: "calisthenics-power",
    programTitle: "Calisthenics Power",
    purchasedAt: "2026-02-01T12:00:00Z",
    expiresAt: "2026-03-28T12:00:00Z",
    durationDays: 56,
    priceCents: 4900,
  },
  {
    id: "ent-mock-expired",
    programSlug: "calisthenics-power",
    programTitle: "Calisthenics Power",
    purchasedAt: "2025-10-01T12:00:00Z",
    expiresAt: "2025-11-26T12:00:00Z",
    durationDays: 56,
    priceCents: 4900,
  },
];
