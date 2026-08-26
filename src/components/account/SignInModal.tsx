"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useAccount } from "../../contexts/MockAuthContext";
import { useTranslations } from "../../i18n/LocaleProvider";
import { PRIVACY_PATH, TERMS_PATH } from "../../lib/legalUrls";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

const TERMS_URL = TERMS_PATH;
const PRIVACY_URL = PRIVACY_PATH;

export default function SignInModal() {
  const {
    signInOpen,
    closeSignIn,
    dismissSignIn,
    signInWithMagicLink,
    verifyEmailOtp,
    authError,
    isAuthenticated,
  } = useAccount();
  const t = useTranslations();

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
      setLocalError(t("signInModal.linkExpired"));
    }
  }, [signInOpen, t]);

  // Close sign-in once authenticated (onboarding / paywall may open next).
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
    // Auth state change closes modal and may open onboarding or paywall.
  };

  return (
    <Dialog.Root
      open={signInOpen}
      onOpenChange={(open) => {
        if (!open) {
          if (isAuthenticated) closeSignIn();
          else dismissSignIn();
        }
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
                {sent ? t("signInModal.checkEmailTitle") : t("signInModal.tryForFreeTitle")}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                {sent ? t("signInModal.checkEmailBody") : t("signInModal.tryForFreeBody")}
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
                {t("signInModal.codeSentTo")}{" "}
                <span className="font-medium text-[color:var(--foreground)]">{email}</span>
              </p>
              <form onSubmit={handleVerifyCode} className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[color:var(--foreground)]">
                    {t("signInModal.codeLabel")}
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
                  {verifying ? t("signInModal.verifying") : t("signInModal.verifyCode")}
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
                {t("signInModal.differentEmail")}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSendCode} className="space-y-4">
              {errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null}
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[color:var(--foreground)]">
                  {t("signInModal.emailLabel")}
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("signInModal.emailPlaceholder")}
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
                {submitting ? t("signInModal.sending") : t("signInModal.sendCode")}
              </button>
            </form>
          )}

          <p className="mt-5 border-t border-[color:var(--border-secondary)] pt-4 text-center text-[10px] text-[color:var(--muted-foreground)]">
            {t("signInModal.legalPrefix")}{" "}
            <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className="underline">
              {t("signInModal.terms")}
            </a>{" "}
            {t("signInModal.legalAnd")}{" "}
            <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="underline">
              {t("signInModal.privacy")}
            </a>
            .
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
