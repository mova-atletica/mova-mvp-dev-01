"use client";

import { useRouter } from "next/navigation";
import type { MiniApp } from "../data/miniApps";
import { MINI_APP_CARD_SIZE } from "../lib/archiveLayout";

interface MiniAppCardProps {
  app: MiniApp;
}

export default function MiniAppCard({ app }: MiniAppCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(app.href);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className="relative cursor-pointer overflow-hidden rounded-lg transition-all duration-300 hover:scale-[1.02]"
      style={{
        width: `${MINI_APP_CARD_SIZE.width}px`,
        height: `${MINI_APP_CARD_SIZE.height}px`,
        flexShrink: 0,
        position: "relative",
        background: app.gradient,
        borderRadius: "8px",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 55%, transparent 100%)",
        }}
      />

      <div className="absolute left-3 top-3 z-10">
        <span
          className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{
            backgroundColor: app.kind === "studio" ? "#6366f1" : "rgba(0,0,0,0.55)",
            color: "#fff",
          }}
        >
          {app.badge}
        </span>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 p-4">
        <p className="text-[10px] font-medium uppercase tracking-wider text-white/70">{app.subtitle}</p>
        <h3 className="text-lg font-semibold leading-tight text-white">{app.title}</h3>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs text-white/80">{app.primaryMetric}</span>
          <span className="rounded-md bg-white/95 px-2.5 py-1 text-xs font-medium text-neutral-800">
            {app.ctaLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
