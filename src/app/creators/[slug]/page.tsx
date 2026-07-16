"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import ArchiveContentPage from "../../../components/ArchiveContentPage";
import ArchivePageHero from "../../../components/archive/ArchivePageHero";
import CreatorExerciseCarousel from "../../../components/CreatorExerciseCarousel";
import ProgramCarousel from "../../../components/ProgramCarousel";
import { getCreatorBySlug } from "../../../data/creators";
import { getProgramsByCreator, programToBrowseSummary } from "../../../data/programs";
import { creatorCatalogHasContent, getCreatorProgramCatalog } from "../../../lib/creatorCatalog";

export default function CreatorPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const creator = getCreatorBySlug(slug);
  const programs = getProgramsByCreator(slug).map(programToBrowseSummary);

  const catalog = useMemo(
    () => (creator ? getCreatorProgramCatalog(slug) : { exercises: [], programOnly: [] }),
    [creator, slug]
  );

  if (!creator) {
    return (
      <ArchiveContentPage>
        <div className="flex min-h-[40vh] flex-col items-center justify-center px-0 pb-16 pt-6 text-center">
          <h1 className="text-2xl font-light" style={{ color: "var(--section-title)" }}>
            Creator not found
          </h1>
          <Link href="/" className="mt-4 underline" style={{ color: "var(--foreground)" }}>
            Back to archive
          </Link>
        </div>
      </ArchiveContentPage>
    );
  }

  const freePrograms = programs.filter((p) => p.accessLevel === "free");
  const paidPrograms = programs.filter((p) => p.accessLevel === "paid");

  return (
    <ArchiveContentPage>
      <ArchivePageHero background={creator.heroImage} ariaLabel={creator.name}>
        <p className="text-xs uppercase tracking-wider text-white/70">Creator</p>
        <h1 className="mt-1 text-3xl font-light text-white">{creator.name}</h1>
        <p className="mt-2 text-sm text-white/85">{creator.tagline}</p>
      </ArchivePageHero>

      <p className="max-w-2xl text-base leading-relaxed" style={{ color: "var(--section-subtitle)" }}>
        {creator.bio}
      </p>

      <div className="flex flex-wrap gap-2">
        {creator.specialty.map((s) => (
          <span
            key={s}
            className="rounded-full px-3 py-1 text-xs capitalize"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
          >
            {s}
          </span>
        ))}
      </div>

      {paidPrograms.length > 0 ? (
        <ProgramCarousel title="Programs" programs={paidPrograms} />
      ) : null}

      {freePrograms.length > 0 ? (
        <ProgramCarousel title="Free programs" programs={freePrograms} />
      ) : null}

      {programs.length === 0 ? (
        <p style={{ color: "var(--section-subtitle)" }}>No programs published yet.</p>
      ) : null}

      {creatorCatalogHasContent(catalog) ? (
        <CreatorExerciseCarousel
          title="Program exercises"
          exercises={catalog.exercises}
          programExercises={catalog.programOnly}
        />
      ) : null}
    </ArchiveContentPage>
  );
}
