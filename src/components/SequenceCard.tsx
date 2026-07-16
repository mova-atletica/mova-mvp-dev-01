"use client";

import { useRouter } from "next/navigation";
import type { ExerciseSequence } from "../data/exerciseSequences";

const LEVEL_COLORS = {
  beginner: { bg: "rgba(255,255,255,0.92)", text: "#085900" },
  intermediate: { bg: "rgba(255,255,255,0.92)", text: "#B54B00" },
  advanced: { bg: "rgba(255,255,255,0.92)", text: "#002CAA" },
} as const;

export default function SequenceCard({ sequence }: { sequence: ExerciseSequence }) {
  const router = useRouter();
  const levelStyle = LEVEL_COLORS[sequence.level];
  const bg = sequence.heroImage.startsWith("linear-gradient")
    ? sequence.heroImage
    : `url(${sequence.heroImage}) center/cover no-repeat`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/sequences/${sequence.slug}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/sequences/${sequence.slug}`);
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
          Sequence
        </span>
      </div>

      <div
        className="absolute right-3 top-3 z-10 rounded px-2 py-0.5 text-[10px] font-medium"
        style={{ backgroundColor: levelStyle.bg, color: levelStyle.text }}
      >
        {sequence.level.charAt(0).toUpperCase() + sequence.level.slice(1)}
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 p-4">
        <p className="text-[10px] font-medium uppercase tracking-wider text-white/70">
          by {sequence.author.name}
        </p>
        <h3 className="text-base font-semibold leading-tight text-white">{sequence.title}</h3>
        <p
          className="mt-1 text-xs text-white/75"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {sequence.description}
        </p>
        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-white/80">
          <span>
            {sequence.exerciseCount} exercises · {sequence.estimatedMinutes} min
          </span>
          <span className="rounded-md bg-white/95 px-2 py-0.5 font-medium text-neutral-800">
            {sequence.ctaLabel ?? "View"}
          </span>
        </div>
      </div>
    </div>
  );
}
