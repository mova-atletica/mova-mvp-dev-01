"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAccount } from "../../contexts/MockAuthContext";
import { PENDING_STUDIO_ACCESS_KEY } from "../../lib/proCheckoutIntent";

/**
 * After Stripe Checkout return (`/?pro=success`): refresh profile, strip query,
 * and re-open Studio when the user started checkout from a Studio gate.
 */
export default function ProCheckoutReturnHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { refreshProfile, hasProAccess, authLoading } = useAccount();
  const handledRef = useRef(false);

  useEffect(() => {
    const pro = searchParams.get("pro");
    if (!pro || handledRef.current || authLoading) return;

    handledRef.current = true;
    const next = new URLSearchParams(searchParams.toString());
    next.delete("pro");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);

    if (pro === "cancel") {
      return;
    }

    if (pro !== "success") return;

    void (async () => {
      // Paywall is already gone after full-page Checkout redirect; do not clear
      // pending Studio intent here (that lives in sessionStorage until Studio opens).
      for (let i = 0; i < 6; i++) {
        await refreshProfile();
        if (i < 5) await new Promise((r) => setTimeout(r, 400));
      }
    })();
  }, [authLoading, pathname, refreshProfile, router, searchParams]);

  useEffect(() => {
    if (authLoading || !hasProAccess) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(PENDING_STUDIO_ACCESS_KEY) !== "1") return;
    sessionStorage.removeItem(PENDING_STUDIO_ACCESS_KEY);
    window.dispatchEvent(new CustomEvent("mova:open-studio"));
  }, [authLoading, hasProAccess]);

  return null;
}
