"use client";

import { useEffect, useRef, useState, lazy, Suspense } from "react";
import type { Exercise } from "../data/exercises";
import type { SessionExercise } from "../types/programs";
import CreatorProgramExerciseCard from "./CreatorProgramExerciseCard";

const ExerciseCard = lazy(() => import("./ExerciseCard"));

interface CreatorExerciseCarouselProps {
  title: string;
  exercises: Exercise[];
  programExercises: SessionExercise[];
}

export default function CreatorExerciseCarousel({
  title,
  exercises,
  programExercises,
}: CreatorExerciseCarouselProps) {
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);

  const totalCount = exercises.length + programExercises.length;

  const scroll = (direction: "left" | "right") => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollTo({
      left: carouselRef.current.scrollLeft + (direction === "left" ? -216 : 216),
      behavior: "smooth",
    });
  };

  const handleScroll = () => {
    if (!carouselRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    const hasOverflow = scrollWidth > clientWidth + 1;
    setShowLeftArrow(hasOverflow && scrollLeft > 0);
    setShowRightArrow(hasOverflow && scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    handleScroll();
    window.addEventListener("resize", handleScroll);
    return () => window.removeEventListener("resize", handleScroll);
  }, [totalCount]);

  if (totalCount === 0) return null;

  return (
    <div className="relative">
      <div className="px-2">
        <h2 className="mb-2 text-2xl font-regular" style={{ color: "var(--section-title)" }}>
          {title}
        </h2>
        <div className="h-1 w-16 rounded-full" style={{ backgroundColor: "var(--section-accent)" }} />
      </div>

      <div className="group relative">
        {showLeftArrow ? (
          <button
            type="button"
            onClick={() => scroll("left")}
            className="absolute left-2 top-1/2 z-50 -translate-y-1/2 rounded-full p-3 opacity-0 shadow-lg backdrop-blur-sm transition-all group-hover:opacity-100"
            style={{ backgroundColor: "var(--carousel-arrow-bg)", color: "var(--carousel-arrow-text)" }}
            aria-label="Scroll left"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        ) : null}

        {showRightArrow ? (
          <button
            type="button"
            onClick={() => scroll("right")}
            className="absolute right-2 top-1/2 z-50 -translate-y-1/2 rounded-full p-3 opacity-0 shadow-lg backdrop-blur-sm transition-all group-hover:opacity-100"
            style={{ backgroundColor: "var(--carousel-arrow-bg)", color: "var(--carousel-arrow-text)" }}
            aria-label="Scroll right"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : null}

        <div
          ref={carouselRef}
          onScroll={handleScroll}
          className="scrollbar-hide flex gap-4 overflow-x-auto px-2 pb-6"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none", paddingTop: "9px" }}
        >
          {exercises.map((exercise) => (
            <Suspense
              key={exercise.id}
              fallback={
                <div
                  className="flex-shrink-0 animate-pulse rounded-lg"
                  style={{ width: "200px", height: "355px", backgroundColor: "var(--surface-hover)" }}
                />
              }
            >
              <ExerciseCard exercise={exercise} />
            </Suspense>
          ))}
          {programExercises.map((item) => (
            <CreatorProgramExerciseCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
