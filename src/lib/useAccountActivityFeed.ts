"use client";

import { useEffect, useState } from "react";
import { MOCK_ACCOUNT_ACTIVITY } from "../data/mockAccountActivity";
import { listActivitySessions } from "./activitySessions";
import { createClient } from "./supabase/client";
import { PHASE_B_ENABLED } from "./productPhase";
import type { AccountActivityItem } from "../types/accountActivity";
import { useAccount } from "../contexts/MockAuthContext";

function mockFallback(): AccountActivityItem[] {
  return PHASE_B_ENABLED
    ? MOCK_ACCOUNT_ACTIVITY
    : MOCK_ACCOUNT_ACTIVITY.filter((item) => item.kind !== "program");
}

/** Live activity for the signed-in user; mock fallback if logged out or fetch fails. */
export function useAccountActivityFeed(): {
  items: AccountActivityItem[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const { isAuthenticated, profile } = useAccount();
  const [items, setItems] = useState<AccountActivityItem[]>(mockFallback);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !profile) {
      setItems(mockFallback());
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const supabase = createClient();
    void listActivitySessions(supabase, { limit: 100 }).then(({ data, error: fetchError }) => {
      if (cancelled) return;
      setLoading(false);
      if (fetchError) {
        setError(fetchError);
        setItems(mockFallback());
        return;
      }
      setError(null);
      const filtered = PHASE_B_ENABLED ? data : data.filter((item) => item.kind !== "program");
      setItems(filtered);
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, profile?.id, tick]);

  return {
    items,
    loading,
    error,
    refresh: () => setTick((t) => t + 1),
  };
}
