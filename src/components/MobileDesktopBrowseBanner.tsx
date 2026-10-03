"use client";

import {
  MOVA_APP_STORE_ICON_SRC,
  MOVA_APP_STORE_URL,
} from "../lib/appStore";

type MobileDesktopBrowseBannerProps = {
  title?: string;
  body?: string;
  cta?: string;
  className?: string;
};

/** Non-sticky iOS App Store promo — home tools header + account profile. */
export default function MobileDesktopBrowseBanner({
  title = "Available on iOS",
  body = "Visualize your form on mobile. Free to download",
  cta = "Get the app",
  className = "mb-6",
}: MobileDesktopBrowseBannerProps) {
  return (
    <a
      href={MOVA_APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 no-underline transition-opacity hover:opacity-95 sm:px-3.5 ${className}`}
      style={{
        border: "1px solid color-mix(in srgb, var(--border-secondary) 80%, transparent)",
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--card-bg) 88%, transparent), color-mix(in srgb, var(--foreground) 4%, var(--card-bg)))",
        boxShadow: "0 8px 24px color-mix(in srgb, var(--foreground) 6%, transparent)",
      }}
      aria-label={`${title}. ${cta}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={MOVA_APP_STORE_ICON_SRC}
        alt=""
        width={44}
        height={44}
        className="h-11 w-11 shrink-0 rounded-[10px] object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium leading-snug text-[color:var(--foreground)]">
          {title}
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-[color:var(--muted-foreground)]">
          {body}
        </p>
      </div>
      <span
        className="shrink-0 rounded-lg px-3 py-2 text-[11px] font-semibold"
        style={{
          background: "var(--primary-button-bg)",
          color: "var(--primary-button-text)",
          border: "2px solid var(--primary-button-border)",
        }}
      >
        {cta}
      </span>
    </a>
  );
}
