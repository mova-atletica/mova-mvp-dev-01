"use client";

import { useMemo, useState } from "react";
import HomeArchiveClient from "../components/HomeArchiveClient";
import HomepageCanvasPortal from "../components/HomepageCanvasPortal";
import LibraryShell, { LibraryMobileFilterSection } from "../components/LibraryShell";
import ProgramCarousel from "../components/ProgramCarousel";
import { PROGRAM_BROWSE_LIST } from "../data/programs";
import {
  collectFilterOptions,
  EMPTY_HOME_FILTERS,
  hasActiveFilters,
  programMatchesFilters,
  type HomeFilterState,
} from "../lib/homeFilters";
import { ARCHIVE_CONTENT_LAYOUT_STYLE } from "../lib/archiveLayout";
import { PHASE_B_ENABLED } from "../lib/productPhase";

export default function Home() {
  const [filters, setFilters] = useState<HomeFilterState>(EMPTY_HOME_FILTERS);

  const filterOptions = useMemo(
    () => collectFilterOptions(PHASE_B_ENABLED ? PROGRAM_BROWSE_LIST : []),
    []
  );

  const filteredPrograms = useMemo(
    () => PROGRAM_BROWSE_LIST.filter((p) => programMatchesFilters(p, filters)),
    [filters]
  );

  const filtersActive = hasActiveFilters(filters);

  const programsForCarousel = useMemo(() => {
    if (!PHASE_B_ENABLED) return [];
    const base = filtersActive ? filteredPrograms : PROGRAM_BROWSE_LIST;
    return base.filter((p) => programMatchesFilters(p, filters));
  }, [filtersActive, filteredPrograms, filters]);

  const showProgramCarousel = PHASE_B_ENABLED && programsForCarousel.length > 0;
  const programCarouselTitle = filtersActive ? "Matching programs" : "Programs";
  const noResults = PHASE_B_ENABLED && filtersActive && !showProgramCarousel;

  return (
    <LibraryShell
      homepageCanvas
      filters={filters}
      onFiltersChange={setFilters}
      muscleGroupOptions={filterOptions.muscleGroups}
      equipmentOptions={filterOptions.equipment}
      showFilters={PHASE_B_ENABLED}
    >
      <HomepageCanvasPortal />
      <main className="homepage-canvas homepage-canvas-in-shell">
        <div className="homepage-canvas-backdrop homepage-canvas-backdrop--inline" aria-hidden>
          <div className="homepage-canvas-gradient" />
          <div className="homepage-canvas-noise" />
          <div className="homepage-canvas-dots" />
        </div>

        <div className="homepage-canvas-content">
          <HomeArchiveClient>
            {PHASE_B_ENABLED ? (
              <LibraryMobileFilterSection
                filters={filters}
                onFiltersChange={setFilters}
                muscleGroupOptions={filterOptions.muscleGroups}
                equipmentOptions={filterOptions.equipment}
              />
            ) : null}

            <div className="mx-auto pb-16" style={ARCHIVE_CONTENT_LAYOUT_STYLE}>
              {showProgramCarousel ? (
                <div className="mb-10">
                  <ProgramCarousel title={programCarouselTitle} programs={programsForCarousel} />
                </div>
              ) : null}

              {noResults ? (
                <div className="py-16 text-center">
                  <p className="text-xl" style={{ color: "var(--section-subtitle)" }}>
                    No programs match these filters.
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
            </div>
          </HomeArchiveClient>
        </div>
      </main>
    </LibraryShell>
  );
}
