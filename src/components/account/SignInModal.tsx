"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useAccount } from "../../contexts/MockAuthContext";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

const TERMS_URL =
  "https://app.termly.io/policy-viewer/policy.html?policyUUID=fdbd3538-3be4-42d1-8c89-ba7676b7d238";
const PRIVACY_URL =
  "https://app.termly.io/policy-viewer/policy.html?policyUUID=4d4ccf3e-a802-44df-aa73-51822d5d7f9d";

export default function SignInModal() {
  const {
    signInOpen,
    closeSignIn,
    signInWithMagicLink,
    verifyEmailOtp,
    authError,
    isAuthenticated,
  } = useAccount();

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!signInOpen) {
      setSent(false);
      setEmail("");
      setCode("");
      setLocalError(null);
      setSubmitting(false);
      setVerifying(false);
      return;
    }
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "auth") {
      setLocalError("Sign-in link expired or invalid. Try again.");
    }
  }, [signInOpen]);

  // Close sign-in once authenticated (onboarding may open next).
  useEffect(() => {
    if (signInOpen && isAuthenticated) {
      closeSignIn();
    }
  }, [signInOpen, isAuthenticated, closeSignIn]);

  const errorMessage = localError || authError;

  const handleSendCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setLocalError(null);
    const { error } = await signInWithMagicLink(email.trim());
    setSubmitting(false);
    if (error) {
      setLocalError(error);
      return;
    }
    setSent(true);
    setCode("");
  };

  const handleVerifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = code.replace(/\D/g, "").slice(0, 6);
    if (trimmed.length !== 6) return;
    setVerifying(true);
    setLocalError(null);
    const { error } = await verifyEmailOtp(email.trim(), trimmed);
    setVerifying(false);
    if (error) {
      setLocalError(error);
      return;
    }
    // Auth state change closes modal and may open onboarding.
  };

  return (
    <Dialog.Root
      open={signInOpen}
      onOpenChange={(open) => {
        if (!open) closeSignIn();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[400] bg-black/65" />
        <Dialog.Content
          style={borderAllTheme}
          className="fixed left-1/2 top-1/2 z-[410] w-[min(calc(100vw-2rem),24rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[var(--card-bg)] p-5 shadow-2xl outline-none"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-base font-semibold text-[color:var(--foreground)]">
                {sent ? "Check your email" : "Sign In / Create Account"}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                {sent
                  ? "We sent a sign-in link and 6-digit code. Click the link or enter the code below."
                  : "Enter your email and we’ll send a 6-digit code. New here? This creates your account."}
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded p-1 text-[color:var(--muted-foreground)] hover:bg-[color:color-mix(in_srgb,var(--foreground)_8%,transparent)]">
              <X size={16} />
            </Dialog.Close>
          </div>

          {sent ? (
            <div className="space-y-4">
              {errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null}
              <p className="text-xs text-[color:var(--muted-foreground)]">
                Code sent to{" "}
                <span className="font-medium text-[color:var(--foreground)]">{email}</span>
              </p>
              <form onSubmit={handleVerifyCode} className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[color:var(--foreground)]">
                    6-digit code
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="w-full rounded-lg px-3 py-2.5 text-center font-mono text-lg tracking-[0.4em] outline-none"
                    style={{
                      ...borderAllTheme,
                      backgroundColor: "var(--background)",
                      color: "var(--foreground)",
                    }}
                    disabled={verifying}
                  />
                </label>
                <button
                  type="submit"
                  disabled={verifying || code.replace(/\D/g, "").length !== 6}
                  className="w-full rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                  style={{
                    background: "var(--primary-button-bg)",
                    color: "var(--primary-button-text)",
                    border: "2px solid var(--primary-button-border)",
                  }}
                >
                  {verifying ? "Verifying…" : "Verify code"}
                </button>
              </form>
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setCode("");
                  setLocalError(null);
                }}
                className="w-full text-center text-xs text-[color:var(--muted-foreground)] underline"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSendCode} className="space-y-4">
              {errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null}
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[color:var(--foreground)]">
                  Email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                  style={{
                    ...borderAllTheme,
                    backgroundColor: "var(--background)",
                    color: "var(--foreground)",
                  }}
                  disabled={submitting}
                />
              </label>
              <button
                type="submit"
                disabled={submitting || !email.trim()}
                className="w-full rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                style={{
                  background: "var(--primary-button-bg)",
                  color: "var(--primary-button-text)",
                  border: "2px solid var(--primary-button-border)",
                }}
              >
                {submitting ? "Sending…" : "Send code"}
              </button>
            </form>
          )}

          <p className="mt-5 border-t border-[color:var(--border-secondary)] pt-4 text-center text-[10px] text-[color:var(--muted-foreground)]">
            By continuing you agree to our{" "}
            <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className="underline">
              Terms
            </a>{" "}
            and{" "}
            <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="underline">
              Privacy Policy
            </a>
            .
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
