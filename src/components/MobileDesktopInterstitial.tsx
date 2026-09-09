"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

const IOS_GLASS_ICON = "/images/brand/mova-ios-glass.png";

export type MobileDesktopInterstitialKind = "studio" | "coach";

interface MobileDesktopInterstitialProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: MobileDesktopInterstitialKind;
  isAuthenticated: boolean;
  onCreateAccount: () => void;
}

const COPY: Record<
  MobileDesktopInterstitialKind,
  { title: string; guestBody: string; signedInBody: string }
> = {
  studio: {
    title: "Motion Studio on desktop",
    guestBody:
      "Full video analysis runs best on desktop. iOS is coming soon — create a free account to join iOS waitlist.",
    signedInBody: "Full video analysis runs best on desktop. iOS is coming soon.",
  },
  coach: {  
    title: "Coach Studio on desktop",
    guestBody:
      "Partner video tools run best on desktop. iOS is coming soon — create a free account to join iOS waitlist.",
    signedInBody: "Partner video tools run best on desktop. iOS is coming soon.",
  },
};

/** Blocks Studio / Coach open on mobile web; points to desktop + account. */
export default function MobileDesktopInterstitial({
  open,
  onOpenChange,
  kind,
  isAuthenticated,
  onCreateAccount,
}: MobileDesktopInterstitialProps) {
  const copy = COPY[kind];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[400] bg-black/65" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[410] w-[min(calc(100vw-2rem),22rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[var(--card-bg)] p-5 text-[color:var(--foreground)] shadow-2xl outline-none"
          style={{ border: "1px solid var(--border-secondary)" }}
        >
          <div className="relative mb-4">
            <Dialog.Close
              className="absolute right-0 top-0 rounded p-1 text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)]"
              aria-label="Close"
            >
              <X size={18} />
            </Dialog.Close>
            <div className="flex justify-center pt-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={IOS_GLASS_ICON}
                alt=""
                width={52}
                height={52}
                className="h-[52px] w-[52px] object-contain"
              />
            </div>
          </div>
          <Dialog.Title className="text-base font-semibold leading-snug">
            {copy.title}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-relaxed text-[color:var(--muted-foreground)]">
            {isAuthenticated ? copy.signedInBody : copy.guestBody}
          </Dialog.Description>
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="mt-5 inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
              style={{
                background: "var(--primary-button-bg)",
                color: "var(--primary-button-text)",
                border: "2px solid var(--primary-button-border)",
              }}
            >
              Got it
            </button>
          ) : (
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onCreateAccount();
                }}
                className="inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
                style={{
                  background: "var(--primary-button-bg)",
                  color: "var(--primary-button-text)",
                  border: "2px solid var(--primary-button-border)",
                }}
              >
                Create free account
              </button>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="inline-flex w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_8%,transparent)]"
              >
                Not now
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
