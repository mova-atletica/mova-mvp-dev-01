"use client";

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LibraryShell, { LibraryMobileFilterSection } from "../../components/LibraryShell";
import ProgramCarousel from "../../components/ProgramCarousel";
import CreatorCarousel from "../../components/CreatorCarousel";
import { getFeaturedCreators } from "../../data/creators";
import { PROGRAM_BROWSE_LIST } from "../../data/programs";
import type { Exercise } from "../../data/exercises";
import {
  fetchCuratedSections,
  fetchExerciseById,
  fetchFeaturedContent,
  type CuratedSection,
  type FeaturedContent,
} from "../../lib/exerciseService";
import {
  collectFilterOptions,
  EMPTY_HOME_FILTERS,
  exerciseMatchesFilters,
  hasActiveFilters,
  programMatchesFilters,
  type HomeFilterState,
} from "../../lib/homeFilters";
import { ARCHIVE_CONTENT_LAYOUT_STYLE } from "../../lib/archiveLayout";

const ExerciseCarousel = lazy(() => import("../../components/ExerciseCarousel"));

const LIBRARY_PASSWORD = process.env.NEXT_PUBLIC_LIBRARY_PASSWORD || "ilovetoMovamyBody";

const LEVEL_COLORS = {
  beginner: { bg: "#FFFFFF", text: "#085900" },
  intermediate: { bg: "#FFFFFF", text: "#F87518" },
  advanced: { bg: "#FFFFFF", text: "#1D4ED8" },
  default: { bg: "#3B82F6", text: "#FFFFFF" },
} as const;

function getLevelBadgeStyle(level: string) {
  const levelKey = level.toLowerCase() as keyof typeof LEVEL_COLORS;
  return LEVEL_COLORS[levelKey] || LEVEL_COLORS.default;
}

function capitalizeFirst(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function LibraryMvpPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  const [filters, setFilters] = useState<HomeFilterState>(EMPTY_HOME_FILTERS);
  const [sections, setSections] = useState<CuratedSection[]>([]);
  const [featuredContent, setFeaturedContent] = useState<FeaturedContent | null>(null);
  const [featuredExercise, setFeaturedExercise] = useState<Exercise | null>(null);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [featuredVideoUrl, setFeaturedVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFeaturedHovered, setIsFeaturedHovered] = useState(false);
  const featuredVideoRef = useRef<HTMLVideoElement>(null);

  const featuredCreators = useMemo(() => getFeaturedCreators(), []);

  useEffect(() => {
    if (!authorized) return;

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [curatedSections, featured] = await Promise.all([
          fetchCuratedSections(),
          fetchFeaturedContent(),
        ]);
        if (cancelled) return;

        setSections(curatedSections);
        setFeaturedContent(featured);

        if (featured?.heroImage) {
          if (featured.heroImage.startsWith("http")) {
            setHeroImageUrl(featured.heroImage);
          } else {
            try {
              const signedUrlResponse = await fetch("/api/storage/signed-url", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileName: featured.heroImage }),
              });
              if (signedUrlResponse.ok) {
                const { signedUrl } = await signedUrlResponse.json();
                setHeroImageUrl(signedUrl);
              } else {
                setHeroImageUrl(featured.heroImage);
              }
            } catch {
              setHeroImageUrl(featured.heroImage);
            }
          }
        }

        if (featured?.exerciseId) {
          const exercise = await fetchExerciseById(featured.exerciseId);
          if (!cancelled) setFeaturedExercise(exercise);
        }
      } catch {
        if (!cancelled) setError("Failed to load content");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authorized]);

  useEffect(() => {
    if (!featuredExercise?.referenceVideoUrl) {
      setFeaturedVideoUrl(null);
      return;
    }
    const url = featuredExercise.referenceVideoUrl;
    if (url.startsWith("http") || url.startsWith("blob:")) {
      setFeaturedVideoUrl(url);
      return;
    }
    fetch("/api/storage/signed-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: url }),
    })
      .then((res) => res.json())
      .then((data) => setFeaturedVideoUrl(data.signedUrl ?? null))
      .catch(() => setFeaturedVideoUrl(null));
  }, [featuredExercise?.referenceVideoUrl]);

  const allExercises = useMemo(
    () => sections.flatMap((section) => section.exercises),
    [sections]
  );

  const filterOptions = useMemo(
    () => collectFilterOptions(PROGRAM_BROWSE_LIST, allExercises),
    [allExercises]
  );

  const filtersActive = hasActiveFilters(filters);

  const filteredPrograms = useMemo(
    () => PROGRAM_BROWSE_LIST.filter((p) => programMatchesFilters(p, filters)),
    [filters]
  );

  const filteredSections = useMemo(
    () =>
      sections
        .map((section) => ({
          ...section,
          exercises: section.exercises.filter((ex) => exerciseMatchesFilters(ex, filters)),
        }))
        .filter((section) => section.exercises.length > 0),
    [sections, filters]
  );

  const showPrograms = filteredPrograms.length > 0;
  const showCreators = !filtersActive || filters.content === "all";
  const showExercises = filters.content !== "programs" && filteredSections.length > 0;
  const noResults =
    filtersActive &&
    filteredPrograms.length === 0 &&
    filteredSections.length === 0;

  if (!authorized) {
    return (
      <main
        className="flex min-h-[70vh] items-start justify-center px-4"
        style={{ backgroundColor: "var(--background)" }}
      >
        <div className="w-full max-w-md">
          <div className="rounded-lg p-8 text-center">
            <h1 className="mb-2 text-3xl font-light" style={{ color: "var(--section-title)" }}>
              Motion Library (MVP)
            </h1>
            <p className="mb-8 text-lg" style={{ color: "var(--section-subtitle)" }}>
              Enter password to access the full exercise archive
            </p>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter password"
              className="mb-4 w-full rounded-lg border px-4 py-3"
              style={{
                backgroundColor: "var(--input-bg)",
                color: "var(--input-text)",
                border: "1px solid var(--input-border)",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") setAuthorized(passwordInput === LIBRARY_PASSWORD);
              }}
            />
            <button
              type="button"
              onClick={() => setAuthorized(passwordInput === LIBRARY_PASSWORD)}
              className="mb-6 w-full rounded-lg px-6 py-3 font-medium transition-colors"
              style={{
                backgroundColor: "var(--button-bg)",
                color: "var(--button-text)",
                border: "1px solid var(--button-border)",
              }}
            >
              Access Library
            </button>
            <div className="border-t pt-6" style={{ borderColor: "var(--border)" }}>
              <p className="mb-4 text-sm" style={{ color: "var(--section-subtitle)" }}>
                Stay tuned for updates!
              </p>
              <a
                href="https://www.mova-atletica.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="mb-4 inline-block px-4 py-2 text-sm font-light"
                style={{
                  backgroundColor: "var(--primary-button-bg)",
                  color: "var(--primary-button-text)",
                  border: "1px solid var(--primary-button-border)",
                  borderRadius: "6px",
                }}
              >
                Learn more
              </a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <LibraryShell
      filters={filters}
      onFiltersChange={setFilters}
      muscleGroupOptions={filterOptions.muscleGroups}
      equipmentOptions={filterOptions.equipment}
      showFilters
    >
      <div style={{ backgroundColor: "var(--background)" }}>
        <div className="mx-auto space-y-8 pb-16 pt-12 md:pt-16 lg:pt-20" style={ARCHIVE_CONTENT_LAYOUT_STYLE}>
          <LibraryMobileFilterSection
            filters={filters}
            onFiltersChange={setFilters}
            muscleGroupOptions={filterOptions.muscleGroups}
            equipmentOptions={filterOptions.equipment}
          />

          <div>
            <h1 className="mb-2 mt-8 text-3xl font-light" style={{ color: "var(--section-title)" }}>
              Mova Archive
            </h1>
            <p className="text-base" style={{ color: "var(--section-subtitle)" }}>
              Discover curated exercises with biomechanical analysis and real-time feedback.
            </p>
          </div>

          {loading ? (
            <p className="py-16 text-center text-xl font-thin" style={{ color: "var(--foreground)" }}>
              Loading motion library…
            </p>
          ) : null}

          {error ? (
            <div className="py-16 text-center">
              <p className="text-xl" style={{ color: "var(--error, #b91c1c)" }}>
                {error}
              </p>
              <button
                type="button"
                className="mt-4 rounded-lg px-4 py-2 text-sm"
                style={{
                  backgroundColor: "var(--button-bg)",
                  color: "var(--button-text)",
                  border: "1px solid var(--button-border)",
                }}
                onClick={() => window.location.reload()}
              >
                Try again
              </button>
            </div>
          ) : null}

          {!loading && !error && featuredContent ? (
            <div
              className="relative overflow-hidden rounded-lg"
              style={{
                height: "min(57vh, 28rem)",
                background: "linear-gradient(to right, var(--surface), var(--surface-hover))",
              }}
              onMouseEnter={() => {
                setIsFeaturedHovered(true);
                featuredVideoRef.current?.play().catch(() => {});
              }}
              onMouseLeave={() => {
                setIsFeaturedHovered(false);
                if (featuredVideoRef.current) {
                  featuredVideoRef.current.pause();
                  featuredVideoRef.current.currentTime = 0;
                }
              }}
            >
              <button
                type="button"
                className="absolute inset-0 z-[1]"
                aria-label={featuredContent.title}
                onClick={() => {
                  if (featuredContent.exerciseId) {
                    router.push(`/exercises/${featuredContent.exerciseId}`);
                  }
                }}
              />
              {featuredVideoUrl && isFeaturedHovered ? (
                <video
                  ref={featuredVideoRef}
                  src={featuredVideoUrl}
                  className="absolute inset-0 h-full w-full object-cover"
                  muted
                  loop
                  playsInline
                />
              ) : null}
              {heroImageUrl && (!isFeaturedHovered || !featuredVideoUrl) ? (
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${heroImageUrl})`,
                    filter: "brightness(0.7)",
                  }}
                />
              ) : null}
              <div
                className="pointer-events-none absolute inset-0 z-[5]"
                style={{
                  background:
                    "linear-gradient(to right, var(--featured-overlay), var(--featured-overlay-light), var(--featured-overlay-transparent))",
                }}
              />
              <div className="relative z-10 flex h-full items-center px-8 py-6 md:px-14">
                <div className="max-w-md">
                  {featuredExercise?.level ? (
                    <div
                      className="mb-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium"
                      style={{
                        backgroundColor: getLevelBadgeStyle(featuredExercise.level).bg,
                        color: getLevelBadgeStyle(featuredExercise.level).text,
                      }}
                    >
                      {capitalizeFirst(featuredExercise.level)}
                    </div>
                  ) : null}
                  <h2
                    className="mb-3 text-3xl font-bold leading-tight md:text-4xl"
                    style={{ color: "var(--featured-title)" }}
                  >
                    {featuredContent.title}
                  </h2>
                  <p
                    className="mb-6 text-base leading-relaxed"
                    style={{ color: "var(--featured-description)" }}
                  >
                    {featuredContent.description}
                  </p>
                  {featuredContent.exerciseId ? (
                    <button
                      type="button"
                      onClick={() => router.push(`/exercises/${featuredContent.exerciseId}`)}
                      className="rounded-lg px-6 py-3 text-sm font-medium"
                      style={{
                        backgroundColor: "#eef0f1",
                        color: "#353839",
                        border: "1px solid #F3F3F4",
                      }}
                    >
                      Learn More
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {!loading && !error ? (
            <>
              {showPrograms ? (
                <ProgramCarousel
                  title={filtersActive ? "Matching programs" : "Programs"}
                  programs={filteredPrograms}
                />
              ) : null}

              {showCreators ? (
                <CreatorCarousel title="Creators" creators={featuredCreators} />
              ) : null}

              {showExercises
                ? filteredSections.map((section) => (
                    <div key={section.id}>
                      <Suspense
                        fallback={
                          <p className="text-sm" style={{ color: "var(--muted)" }}>
                            Loading {section.title}…
                          </p>
                        }
                      >
                        <ExerciseCarousel title={section.title} exercises={section.exercises} />
                      </Suspense>
                    </div>
                  ))
                : null}

              {noResults ? (
                <div className="py-16 text-center">
                  <p className="text-xl" style={{ color: "var(--section-subtitle)" }}>
                    No exercises or programs match these filters.
                  </p>
                  <button
                    type="button"
                    className="mt-4 rounded-lg px-4 py-2 text-sm"
                    style={{
                      backgroundColor: "var(--button-bg)",
                      color: "var(--button-text)",
                      border: "1px solid var(--button-border)",
                    }}
                    onClick={() => setFilters(EMPTY_HOME_FILTERS)}
                  >
                    Clear filters
                  </button>
                </div>
              ) : null}

              {!filtersActive && sections.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-xl" style={{ color: "var(--section-subtitle)" }}>
                    No curated exercises found
                  </p>
                  <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
                    Check that the Prisma DB and curated-sections API are available locally.
                  </p>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </LibraryShell>
  );
}
