"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { FeaturedCarouselItem } from "../data/featuredCarousel";
import type { Program } from "../types/programs";
import type { Exercise } from "../data/exercises";
import { getCreatorBySlug } from "../data/creators";

import {
  ARCHIVE_CONTENT_LAYOUT_STYLE,
  ARCHIVE_HERO_CARD_CLASS,
  ARCHIVE_HERO_CARD_STYLE,
  ARCHIVE_HERO_PORTRAIT_CAROUSEL_STYLE,
  ARCHIVE_HERO_SECTION_CLASS,
  ARCHIVE_HERO_TALL_HEIGHT_STYLE,
  archiveHeroBackground,
} from "../lib/archiveLayout";

const AUTO_ADVANCE_MS = 5500;

/** Archive main-column horizontal inset (96% width, 2% side margins). */
const HERO_LAYOUT_STYLE = ARCHIVE_CONTENT_LAYOUT_STYLE;

const LEVEL_COLORS = {
  beginner: { bg: "#FFFFFF", text: "#085900" },
  intermediate: { bg: "#FFFFFF", text: "#F87518" },
  advanced: { bg: "#FFFFFF", text: "#1D4ED8" },
  default: { bg: "#3B82F6", text: "#FFFFFF" },
} as const;

function heroBackground(image: string): string {
  return archiveHeroBackground(image);
}

function levelStyle(level: string) {
  return LEVEL_COLORS[level as keyof typeof LEVEL_COLORS] ?? LEVEL_COLORS.default;
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      {direction === "left" ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      )}
    </svg>
  );
}

interface FeaturedHeroCarouselProps {
  items: FeaturedCarouselItem[];
  /** When true, omit outer section layout — for use inside ArchiveHeroSection. */
  embedded?: boolean;
  /** `portrait` — narrow column beside mini apps; `default` — full-width hero. */
  layout?: "default" | "portrait";
}

export default function FeaturedHeroCarousel({
  items,
  embedded = false,
  layout = "default",
}: FeaturedHeroCarouselProps) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const count = items.length;
  const safeIndex = count > 0 ? activeIndex % count : 0;

  const goTo = useCallback(
    (index: number) => {
      if (count === 0) return;
      setActiveIndex(((index % count) + count) % count);
    },
    [count]
  );

  const goNext = useCallback(() => goTo(safeIndex + 1), [goTo, safeIndex]);
  const goPrev = useCallback(() => goTo(safeIndex - 1), [goTo, safeIndex]);

  useEffect(() => {
    if (count <= 1 || paused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % count);
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  if (count === 0) return null;

  const isPortrait = layout === "portrait";
  const cardSizeStyle = isPortrait ? ARCHIVE_HERO_PORTRAIT_CAROUSEL_STYLE : ARCHIVE_HERO_TALL_HEIGHT_STYLE;

  const carouselBody = (
    <>
      <div
        className={ARCHIVE_HERO_CARD_CLASS}
        style={{
          ...cardSizeStyle,
          ...ARCHIVE_HERO_CARD_STYLE,
        }}
      >
        {items.map((item, index) => (
          <CarouselSlide
            key={slideKey(item)}
            item={item}
            isActive={index === safeIndex}
            onNavigate={router.push}
            compact={isPortrait}
          />
        ))}
      </div>

      {count > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={goPrev}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
            style={{
              backgroundColor: "var(--carousel-arrow-bg)",
              color: "var(--carousel-arrow-text)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--carousel-arrow-hover-bg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--carousel-arrow-bg)";
            }}
            aria-label="Previous featured item"
          >
            <ChevronIcon direction="left" />
          </button>

          <div className="flex items-center justify-center gap-2">
            {items.map((item, index) => (
              <button
                key={`dot-${slideKey(item)}`}
                type="button"
                className="h-2 shrink-0 rounded-full transition-all duration-300"
                style={{
                  width: index === safeIndex ? "1.5rem" : "0.5rem",
                  backgroundColor:
                    index === safeIndex
                      ? "var(--foreground)"
                      : "color-mix(in srgb, var(--foreground) 35%, transparent)",
                }}
                onClick={() => goTo(index)}
                aria-label={`Go to featured item ${index + 1}`}
                aria-current={index === safeIndex}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={goNext}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
            style={{
              backgroundColor: "var(--carousel-arrow-bg)",
              color: "var(--carousel-arrow-text)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--carousel-arrow-hover-bg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--carousel-arrow-bg)";
            }}
            aria-label="Next featured item"
          >
            <ChevronIcon direction="right" />
          </button>
        </div>
      ) : null}
    </>
  );

  if (embedded) {
    return (
      <div
        aria-label="Featured"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {carouselBody}
      </div>
    );
  }

  return (
    <section
      className={`mx-auto ${ARCHIVE_HERO_SECTION_CLASS}`}
      style={HERO_LAYOUT_STYLE}
      aria-label="Featured"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {carouselBody}
    </section>
  );
}

function slideKey(item: FeaturedCarouselItem): string {
  return item.kind === "program" ? `prog-${item.program.slug}` : `ex-${item.exercise.id}`;
}

function CarouselSlide({
  item,
  isActive,
  onNavigate,
  compact = false,
}: {
  item: FeaturedCarouselItem;
  isActive: boolean;
  onNavigate: (href: string) => void;
  compact?: boolean;
}) {
  if (item.kind === "program") {
    return (
      <ProgramSlide program={item.program} isActive={isActive} onNavigate={onNavigate} compact={compact} />
    );
  }
  return (
    <ExerciseSlide exercise={item.exercise} isActive={isActive} onNavigate={onNavigate} compact={compact} />
  );
}

function ProgramSlide({
  program,
  isActive,
  onNavigate,
  compact = false,
}: {
  program: Program;
  isActive: boolean;
  onNavigate: (href: string) => void;
  compact?: boolean;
}) {
  const level = levelStyle(program.level);
  const creator = getCreatorBySlug(program.creatorSlug);

  return (
    <SlideShell
      isActive={isActive}
      background={heroBackground(program.heroImage)}
      href={`/programs/${program.slug}`}
      onNavigate={onNavigate}
      badges={
        <>
          <Badge label="Program" accent />
          {program.isFeatured ? <Badge label="Featured" /> : null}
          {program.accessLevel === "free" ? (
            <Badge label="Free" />
          ) : (
            <Badge label="Paid" />
          )}
        </>
      }
      title={program.title}
      subtitle={creator ? `by ${creator.name}` : `${program.durationWeeks}-week program`}
      description={program.description}
      meta={
        <>
          <span
            className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium"
            style={{ backgroundColor: level.bg, color: level.text }}
          >
            {program.level.charAt(0).toUpperCase() + program.level.slice(1)}
          </span>
          <span className="text-sm" style={{ color: "var(--featured-tag-text)" }}>
            {program.exerciseCount} exercises · {program.estimatedMinutes} min
          </span>
        </>
      }
      tags={program.tags.slice(0, 4)}
      ctaLabel={program.ctaLabel ?? "View program"}
      compact={compact}
    />
  );
}

function ExerciseSlide({
  exercise,
  isActive,
  onNavigate,
  compact = false,
}: {
  exercise: Exercise;
  isActive: boolean;
  onNavigate: (href: string) => void;
  compact?: boolean;
}) {
  const level = levelStyle(exercise.level);

  return (
    <SlideShell
      isActive={isActive}
      background={heroBackground(exercise.image)}
      href={`/exercises/${exercise.id}`}
      onNavigate={onNavigate}
      badges={
        <>
          <Badge label="Exercise" accent />
          <Badge label="Featured" />
        </>
      }
      title={exercise.title}
      subtitle={`by ${exercise.author.name}`}
      description={exercise.description}
      meta={
        <>
          <span
            className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium"
            style={{ backgroundColor: level.bg, color: level.text }}
          >
            {exercise.level.charAt(0).toUpperCase() + exercise.level.slice(1)}
          </span>
          <span className="text-sm capitalize" style={{ color: "var(--featured-tag-text)" }}>
            {exercise.exerciseType}
          </span>
        </>
      }
      tags={exercise.tags.slice(0, 4)}
      ctaLabel="View Exercise"
      compact={compact}
    />
  );
}

function Badge({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <span
      className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={
        accent
          ? { backgroundColor: "#6366f1", color: "#fff" }
          : { backgroundColor: "var(--featured-tag-bg)", color: "var(--featured-tag-text)" }
      }
    >
      {label}
    </span>
  );
}

function SlideShell({
  isActive,
  background,
  href,
  onNavigate,
  badges,
  title,
  subtitle,
  description,
  meta,
  tags,
  ctaLabel,
  compact = false,
}: {
  isActive: boolean;
  background: string;
  href: string;
  onNavigate: (href: string) => void;
  badges: ReactNode;
  title: string;
  subtitle: string;
  description: string;
  meta: ReactNode;
  tags: string[];
  ctaLabel: string;
  compact?: boolean;
}) {
  return (
    <div
      className="absolute inset-0 h-full w-full overflow-hidden rounded-2xl transition-opacity duration-700 ease-in-out"
      style={{
        opacity: isActive ? 1 : 0,
        pointerEvents: isActive ? "auto" : "none",
        borderRadius: "1rem",
      }}
      aria-hidden={!isActive}
    >
      <div className="absolute inset-0 h-full w-full" style={{ background }} />
      <div
        className="absolute inset-0 h-full w-full"
        style={{
          background: compact
            ? "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.72) 100%)"
            : `linear-gradient(to right, var(--featured-overlay) 0%, var(--featured-overlay-light) 55%, var(--featured-overlay-transparent) 100%)`,
        }}
      />
      {!compact ? (
      <div
        className="absolute inset-0 h-full w-full"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 40%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      ) : null}

      {/* Full-width, full-height shaded overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          backgroundColor: compact ? "rgba(0, 0, 0, 0.18)" : "rgba(0, 0, 0, 0.28)",
          backdropFilter: compact ? "blur(4px)" : "blur(8px)",
          borderRadius: "1rem",
        }}
        aria-hidden
      />

      <div
        className={`absolute inset-0 z-20 flex h-full min-h-full ${compact ? "items-end" : "items-center"}`}
      >
        <div
          className={compact ? "w-full py-4" : "w-full max-w-xl py-6 sm:py-8"}
          style={
            compact
              ? { paddingLeft: "1rem", paddingRight: "1rem" }
              : {
                  paddingLeft: "clamp(2rem, 5vw, 3.5rem)",
                  paddingRight: "clamp(1.25rem, 3vw, 2rem)",
                }
          }
        >
          <div className={`inline-flex flex-wrap items-center gap-1.5 ${compact ? "mb-2" : "mb-4"}`}>
            {badges}
          </div>

          <h1
            className={`font-light leading-tight ${compact ? "mb-1 text-lg" : "mb-2 text-2xl md:text-3xl"}`}
            style={{ color: "var(--featured-title)" }}
          >
            {title}
          </h1>

          <p
            className={`font-medium ${compact ? "mb-2 text-xs" : "mb-3 text-sm md:text-base"}`}
            style={{ color: "var(--featured-description)" }}
          >
            {subtitle}
          </p>

          {!compact ? (
            <p
              className="mb-4 line-clamp-3 max-w-md text-base leading-relaxed md:text-lg"
              style={{ color: "var(--featured-description)", opacity: 0.95 }}
            >
              {description}
            </p>
          ) : null}

          {!compact ? <div className="mb-4 flex flex-wrap items-center gap-3">{meta}</div> : null}

          {!compact ? (
            <div className="mb-6 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full px-3 py-1 text-sm backdrop-blur-sm"
                  style={{
                    backgroundColor: "var(--featured-tag-bg)",
                    color: "var(--featured-tag-text)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => onNavigate(href)}
            className={`rounded-lg font-normal transition-all duration-200 ${compact ? "w-full px-3 py-2 text-xs" : "px-8 py-3 text-sm"}`}
            style={{
              backgroundColor: "var(--featured-secondary-button-bg)",
              color: "var(--featured-secondary-button-text)",
              border: "1px solid var(--featured-secondary-button-border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--featured-secondary-button-hover-bg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--featured-secondary-button-bg)";
            }}
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
