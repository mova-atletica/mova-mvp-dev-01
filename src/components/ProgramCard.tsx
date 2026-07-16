"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ProgramBrowseSummary } from "../data/programs";
import { formatProgramPrice } from "../lib/programAccess";
import { getCreatorBySlug } from "../data/creators";

const LEVEL_COLORS = {
  beginner: { bg: "rgba(255,255,255,0.92)", text: "#085900" },
  intermediate: { bg: "rgba(255,255,255,0.92)", text: "#B54B00" },
  advanced: { bg: "rgba(255,255,255,0.92)", text: "#002CAA" },
} as const;

export default function ProgramCard({ program }: { program: ProgramBrowseSummary }) {
  const router = useRouter();
  const creator = getCreatorBySlug(program.creatorSlug);
  const levelStyle = LEVEL_COLORS[program.level];
  const bg = program.heroImage.startsWith("linear-gradient")
    ? program.heroImage
    : `url(${program.heroImage}) center/cover no-repeat`;
  const priceLabel =
    program.accessLevel === "free" ? "Free" : formatProgramPrice(program.priceCents) ?? "Paid";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/programs/${program.slug}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/programs/${program.slug}`);
        }
      }}
      className="relative flex-shrink-0 cursor-pointer overflow-hidden rounded-lg transition-all duration-300 hover:scale-[1.03]"
      style={{
        width: "240px",
        height: "320px",
        borderRadius: "8px",
        background: bg,
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)",
        }}
      />

      <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5">
        <span
          className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ backgroundColor: "rgba(0,0,0,0.55)", color: "#fff" }}
        >
          Program
        </span>
        <span
          className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{
            backgroundColor: program.accessLevel === "free" ? "rgba(34,197,94,0.85)" : "rgba(99,102,241,0.85)",
            color: "#fff",
          }}
        >
          {priceLabel}
        </span>
      </div>

      <div
        className="absolute right-3 top-3 z-10 rounded px-2 py-0.5 text-[10px] font-medium"
        style={{ backgroundColor: levelStyle.bg, color: levelStyle.text }}
      >
        {program.level.charAt(0).toUpperCase() + program.level.slice(1)}
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 p-4">
        <p className="text-[10px] font-medium uppercase tracking-wider text-white/70">
          {creator ? (
            <Link
              href={`/creators/${creator.slug}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:underline"
            >
              by {creator.name}
            </Link>
          ) : (
            <>by {program.creatorSlug}</>
          )}
        </p>
        <h3 className="text-base font-semibold leading-tight text-white">{program.title}</h3>
        <p
          className="mt-1 text-xs text-white/75"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {program.description}
        </p>
        <div className="mt-2 text-xs text-white/80">
          <span>
            {program.exerciseCount} exercises · {program.estimatedMinutes} min
          </span>
        </div>
      </div>
    </div>
  );
}
