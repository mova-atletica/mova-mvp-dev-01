"use client";

import { useEffect, useState } from "react";
import { listActivitySessions } from "./activitySessions";
import { createClient } from "./supabase/client";
import { PHASE_B_ENABLED } from "./productPhase";
import type { AccountActivityItem } from "../types/accountActivity";
import { useAccount } from "../contexts/MockAuthContext";

/**
 * Live activity for the signed-in user.
 * No global mock fallback — only tresbradley (or any user) sees rows that exist in Supabase.
 */
export function useAccountActivityFeed(): {
  items: AccountActivityItem[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const { isAuthenticated, profile } = useAccount();
  const [items, setItems] = useState<AccountActivityItem[]>([]);
  /** True until the first authenticated fetch settles (avoids empty-state flash). */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !profile) {
      setItems([]);
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
        setItems([]);
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
