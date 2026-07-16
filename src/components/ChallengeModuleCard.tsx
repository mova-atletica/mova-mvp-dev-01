"use client";

import { useRouter } from "next/navigation";
import type { ChallengeModule } from "../data/challengeModules";

const DIFFICULTY_COLORS = {
  beginner: { bg: "rgba(255,255,255,0.92)", text: "#085900" },
  intermediate: { bg: "rgba(255,255,255,0.92)", text: "#B54B00" },
  advanced: { bg: "rgba(255,255,255,0.92)", text: "#002CAA" },
} as const;

interface ChallengeModuleCardProps {
  module: ChallengeModule;
  /** Wider card for challenge row vs default */
  variant?: "carousel" | "compact";
}

export default function ChallengeModuleCard({ module, variant = "carousel" }: ChallengeModuleCardProps) {
  const router = useRouter();
  const isComingSoon = module.badge === "Soon";
  const diffStyle = DIFFICULTY_COLORS[module.difficulty];

  const width = variant === "carousel" ? 280 : 240;
  const height = variant === "carousel" ? 200 : 168;

  const handleClick = () => {
    if (isComingSoon) return;
    router.push(`/challenges/${module.slug}`);
  };

  return (
    <div
      role="button"
      tabIndex={isComingSoon ? -1 : 0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (!isComingSoon && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          handleClick();
        }
      }}
      className={`relative flex-shrink-0 overflow-hidden rounded-lg transition-all duration-300 ${
        isComingSoon ? "cursor-default opacity-75" : "cursor-pointer hover:scale-[1.03]"
      }`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        background: module.gradient,
        borderRadius: "8px",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 55%, transparent 100%)",
        }}
      />

      <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5">
        <span
          className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ backgroundColor: "rgba(0,0,0,0.55)", color: "#fff" }}
        >
          Live
        </span>
        {module.badge ? (
          <span
            className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{
              backgroundColor: module.badge === "New" ? "#22c55e" : "rgba(255,255,255,0.25)",
              color: "#fff",
            }}
          >
            {module.badge}
          </span>
        ) : null}
      </div>

      <div
        className="absolute right-3 top-3 z-10 rounded px-2 py-0.5 text-[10px] font-medium"
        style={{ backgroundColor: diffStyle.bg, color: diffStyle.text }}
      >
        {module.difficulty.charAt(0).toUpperCase() + module.difficulty.slice(1)}
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 p-4">
        <p className="text-[10px] font-medium uppercase tracking-wider text-white/70">{module.subtitle}</p>
        <h3 className="text-lg font-semibold leading-tight text-white">{module.title}</h3>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs text-white/80">{module.primaryMetric}</span>
          {!isComingSoon ? (
            <span className="rounded-md bg-white/95 px-2.5 py-1 text-xs font-medium text-neutral-800">
              {module.ctaLabel}
            </span>
          ) : (
            <span className="text-xs text-white/60">{module.ctaLabel}</span>
          )}
        </div>
      </div>
    </div>
  );
}
