"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount } from "../../contexts/MockAuthContext";

/** Opens sign-in modal when landed with ?signin=1 (e.g. from /login redirect). */
export default function SignInQueryOpener() {
  const searchParams = useSearchParams();
  const { openSignIn, isAuthenticated, authLoading } = useAccount();

  useEffect(() => {
    if (authLoading || isAuthenticated) return;
    if (searchParams.get("signin") === "1" || searchParams.get("error") === "auth") {
      openSignIn();
    }
  }, [authLoading, isAuthenticated, openSignIn, searchParams]);

  return null;
}
