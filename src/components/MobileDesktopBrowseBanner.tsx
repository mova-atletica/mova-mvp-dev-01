"use client";

const IOS_GLASS_ICON = "/images/brand/mova-ios-glass.png";

interface MobileDesktopBrowseBannerProps {
  isAuthenticated: boolean;
  onCreateAccount: () => void;
}

/** Non-sticky mobile notice under the home tools header. Desktop analysis; iOS soon. */
export default function MobileDesktopBrowseBanner({
  isAuthenticated,
  onCreateAccount,
}: MobileDesktopBrowseBannerProps) {
  return (
    <div
      className="mb-6 flex items-center gap-3 rounded-lg px-3 py-3 sm:px-3.5"
      style={{
        border: "1px solid color-mix(in srgb, var(--border-secondary) 80%, transparent)",
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--card-bg) 88%, transparent), color-mix(in srgb, var(--foreground) 4%, var(--card-bg)))",
        boxShadow: "0 8px 24px color-mix(in srgb, var(--foreground) 6%, transparent)",
      }}
      role="status"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={IOS_GLASS_ICON}
        alt=""
        width={44}
        height={44}
        className="h-11 w-11 shrink-0 object-contain"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium leading-snug text-[color:var(--foreground)]">
          Beta on desktop web · iOS soon
        </p>
        {!isAuthenticated ? (
          <p className="mt-0.5 text-[11px] leading-snug text-[color:var(--muted-foreground)]">
            Account to join iOS waitlist
          </p>
        ) : null}
      </div>
      {!isAuthenticated ? (
        <button
          type="button"
          onClick={onCreateAccount}
          className="shrink-0 rounded-lg px-3 py-2 text-[11px] font-semibold transition-opacity hover:opacity-90"
          style={{
            background: "var(--primary-button-bg)",
            color: "var(--primary-button-text)",
            border: "2px solid var(--primary-button-border)",
          }}
        >
          Create free account
        </button>
      ) : null}
    </div>
  );
}
