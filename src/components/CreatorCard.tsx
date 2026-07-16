"use client";

import { useRouter } from "next/navigation";
import type { Creator } from "../data/creators";
import { getProgramsByCreator } from "../data/programs";

interface CreatorCardProps {
  creator: Creator;
}

export default function CreatorCard({ creator }: CreatorCardProps) {
  const router = useRouter();
  const programCount = getProgramsByCreator(creator.slug).length;
  const bg = creator.heroImage.startsWith("linear-gradient")
    ? creator.heroImage
    : `url(${creator.heroImage}) center/cover no-repeat`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/creators/${creator.slug}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/creators/${creator.slug}`);
        }
      }}
      className="relative flex-shrink-0 cursor-pointer overflow-hidden rounded-lg transition-all duration-300 hover:scale-[1.03]"
      style={{
        width: "260px",
        height: "200px",
        borderRadius: "8px",
        background: bg,
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.25) 55%, transparent 100%)",
        }}
      />

      <div className="absolute left-3 top-3 z-10">
        <span
          className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ backgroundColor: "rgba(0,0,0,0.55)", color: "#fff" }}
        >
          Creator
        </span>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 p-4">
        <h3 className="text-lg font-semibold leading-tight text-white">{creator.name}</h3>
        <p
          className="mt-1 text-xs text-white/80"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {creator.tagline}
        </p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[10px] capitalize text-white/70">
            {creator.specialty.slice(0, 2).join(" · ")}
          </span>
          <span className="rounded-md bg-white/95 px-2.5 py-1 text-xs font-medium text-neutral-800">
            {programCount > 0 ? `${programCount} programs` : "View profile"}
          </span>
        </div>
      </div>
    </div>
  );
}
