import type { EntitlementStatus, UserProgramEntitlement } from "../types/entitlements";
import type { Program } from "../types/programs";
import type { ProgramProgressState } from "../types/programs";

const EXPIRING_SOON_DAYS = 7;

export function getEntitlementStatus(entitlement: UserProgramEntitlement, now = Date.now()): EntitlementStatus {
  const expires = new Date(entitlement.expiresAt).getTime();
  if (expires <= now) return "expired";
  const daysLeft = Math.ceil((expires - now) / (24 * 60 * 60 * 1000));
  if (daysLeft <= EXPIRING_SOON_DAYS) return "expiring";
  return "active";
}

export function isEntitlementActive(entitlement: UserProgramEntitlement | null | undefined): boolean {
  if (!entitlement) return false;
  return getEntitlementStatus(entitlement) !== "expired";
}

export function daysUntilExpiry(entitlement: UserProgramEntitlement, now = Date.now()): number {
  const expires = new Date(entitlement.expiresAt).getTime();
  return Math.max(0, Math.ceil((expires - now) / (24 * 60 * 60 * 1000)));
}

export function formatExpiryDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Latest entitlement per program slug (newest purchase wins). */
export function effectiveEntitlements(all: UserProgramEntitlement[]): UserProgramEntitlement[] {
  const sorted = [...all].sort(
    (a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime()
  );
  const seen = new Set<string>();
  const result: UserProgramEntitlement[] = [];
  for (const ent of sorted) {
    if (seen.has(ent.programSlug)) continue;
    seen.add(ent.programSlug);
    result.push(ent);
  }
  return result;
}

export function getProgramDurationDays(program: Program): number {
  return program.durationDays ?? program.durationWeeks * 7;
}

export function isProgramAccessGranted(
  program: Program,
  entitlement: UserProgramEntitlement | null | undefined,
  progress: ProgramProgressState | null
): boolean {
  if (program.accessLevel === "free") return true;
  if (isEntitlementActive(entitlement)) return true;
  return progress?.enrolled === true;
}
