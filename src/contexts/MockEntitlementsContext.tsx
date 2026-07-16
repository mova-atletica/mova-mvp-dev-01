"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { MOCK_ENTITLEMENTS } from "../data/mockEntitlements";
import {
  effectiveEntitlements,
  isEntitlementActive,
} from "../lib/entitlementAccess";
import { PHASE_B_ENABLED } from "../lib/productPhase";
import type { PurchaseProgramInput, UserProgramEntitlement } from "../types/entitlements";
import { useAccount } from "./MockAuthContext";

export { getEntitlementStatus } from "../lib/entitlementAccess";

const STORAGE_KEY = "mova-mock-entitlements-v1";

interface MockEntitlementsContextValue {
  entitlements: UserProgramEntitlement[];
  getEntitlement: (programSlug: string) => UserProgramEntitlement | undefined;
  purchaseProgram: (input: PurchaseProgramInput) => UserProgramEntitlement;
  hasActiveEntitlement: (programSlug: string) => boolean;
}

const MockEntitlementsContext = createContext<MockEntitlementsContextValue | null>(null);

function loadStored(): UserProgramEntitlement[] {
  if (!PHASE_B_ENABLED) return [];
  if (typeof window === "undefined") return MOCK_ENTITLEMENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return MOCK_ENTITLEMENTS;
    const parsed = JSON.parse(raw) as UserProgramEntitlement[];
    return parsed.length ? parsed : MOCK_ENTITLEMENTS;
  } catch {
    return MOCK_ENTITLEMENTS;
  }
}

function persist(items: UserProgramEntitlement[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function MockEntitlementsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAccount();
  const [rawEntitlements, setRawEntitlements] = useState<UserProgramEntitlement[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      setRawEntitlements([]);
      return;
    }
    setRawEntitlements(loadStored());
  }, [isAuthenticated, hydrated]);

  useEffect(() => {
    if (!hydrated || !isAuthenticated) return;
    persist(rawEntitlements);
  }, [rawEntitlements, hydrated, isAuthenticated]);

  const entitlements = useMemo(
    () => effectiveEntitlements(rawEntitlements),
    [rawEntitlements]
  );

  const getEntitlement = useCallback(
    (programSlug: string) => entitlements.find((e) => e.programSlug === programSlug),
    [entitlements]
  );

  const hasActiveEntitlement = useCallback(
    (programSlug: string) => isEntitlementActive(getEntitlement(programSlug)),
    [getEntitlement]
  );

  const purchaseProgram = useCallback((input: PurchaseProgramInput) => {
    const purchasedAt = new Date();
    const expiresAt = new Date(purchasedAt);
    expiresAt.setDate(expiresAt.getDate() + input.durationDays);

    const entry: UserProgramEntitlement = {
      id: `ent-${Date.now()}`,
      programSlug: input.programSlug,
      programTitle: input.programTitle,
      purchasedAt: purchasedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      durationDays: input.durationDays,
      priceCents: input.priceCents,
    };

    setRawEntitlements((prev) => [entry, ...prev]);
    return entry;
  }, []);

  const value = useMemo<MockEntitlementsContextValue>(
    () => ({
      entitlements,
      getEntitlement,
      purchaseProgram,
      hasActiveEntitlement,
    }),
    [entitlements, getEntitlement, purchaseProgram, hasActiveEntitlement]
  );

  return (
    <MockEntitlementsContext.Provider value={value}>{children}</MockEntitlementsContext.Provider>
  );
}

export function useEntitlements(): MockEntitlementsContextValue {
  const ctx = useContext(MockEntitlementsContext);
  if (!ctx) {
    throw new Error("useEntitlements must be used within MockEntitlementsProvider");
  }
  return ctx;
}
