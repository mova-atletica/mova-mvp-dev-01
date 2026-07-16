"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccount } from "../../contexts/MockAuthContext";

/**
 * /login keeps working for bookmarks and auth errors.
 * Opens the global Sign In modal and returns to the archive.
 */
function LoginRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openSignIn, isAuthenticated, authLoading } = useAccount();

  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) {
      router.replace("/account");
      return;
    }
    openSignIn();
    const error = searchParams.get("error");
    router.replace(error === "auth" ? "/?signin=1&error=auth" : "/");
  }, [authLoading, isAuthenticated, openSignIn, router, searchParams]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-[color:var(--muted-foreground)]">
      Opening sign in…
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-[color:var(--muted-foreground)]">
          Loading…
        </div>
      }
    >
      <LoginRedirectInner />
    </Suspense>
  );
}
