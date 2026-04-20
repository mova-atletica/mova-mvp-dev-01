"use client";

/**
 * Figma checkmark (checkmark.svg). Rendered ~40% smaller than a 16px control slot
 * (9.6×6.93px), inherits color via currentColor — use with text-[var(--accent)].
 */
export function EffectSelectedCheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={9.6}
      height={6.93}
      viewBox="0 0 18 13"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M1 7L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M17 1L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
