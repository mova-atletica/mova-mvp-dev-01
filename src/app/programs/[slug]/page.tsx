"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { CircleCheck } from "lucide-react";
import ArchiveContentPage from "../../../components/ArchiveContentPage";
import ArchivePageHero from "../../../components/archive/ArchivePageHero";
import ExerciseProgramStudioModal from "../../../components/exercise-studio/ExerciseProgramStudioModal";
import ProgramSessionBlock from "../../../components/ProgramSessionBlock";
import ProgramPurchaseModal from "../../../components/programs/ProgramPurchaseModal";
import { getCreatorBySlug } from "../../../data/creators";
import { getProgramBySlug } from "../../../data/programs";
import { getEntitlementStatus, useEntitlements } from "../../../contexts/MockEntitlementsContext";
import { useProgramProgress } from "../../../hooks/useProgramProgress";
import { useProgramWeekExercises } from "../../../hooks/useProgramWeekExercises";
import {
  daysUntilExpiry,
  formatExpiryDate,
  getProgramDurationDays,
} from "../../../lib/entitlementAccess";
import {
  formatProgramPrice,
  isProgramEnrolled,
  isWeekInteractive,
  isWeekLocked,
  isWeekSessionsComplete,
  weekFilmingGateSatisfied,
} from "../../../lib/programAccess";
import {
  buildProgramStudioContext,
  type ProgramStudioContext,
} from "../../../types/programStudio";

export default function ProgramPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const program = getProgramBySlug(slug);
  const creator = program ? getCreatorBySlug(program.creatorSlug) : undefined;

  const { getEntitlement, purchaseProgram } = useEntitlements();

  const { progress, toggleExercise, markRecorded, skipFilming, enroll, weekProgress } =
    useProgramProgress(program);

  const [activeWeek, setActiveWeek] = useState(1);
  const [studioOpen, setStudioOpen] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [studioContext, setStudioContext] = useState<ProgramStudioContext | null>(null);

  const { exercisesById, loading: exercisesLoading } = useProgramWeekExercises(
    program,
    activeWeek
  );

  const entitlement = program ? getEntitlement(program.slug) : undefined;
  const entitlementStatus = entitlement ? getEntitlementStatus(entitlement) : null;
  const enrolled =
    program && progress ? isProgramEnrolled(program, progress, entitlement) : false;

  const activeWeekData = useMemo(
    () => program?.weeks.find((w) => w.weekNumber === activeWeek),
    [program, activeWeek]
  );

  const openStudio = useCallback(
    (sessionId: string, sessionExerciseId: string) => {
      if (!program) return;
      const session = activeWeekData?.sessions.find((s) => s.id === sessionId);
      if (!session) return;
      const ctx = buildProgramStudioContext(program, activeWeek, session, sessionExerciseId);
      if (!ctx) return;
      setStudioContext(ctx);
      setStudioOpen(true);
    },
    [program, activeWeek, activeWeekData]
  );

  const navigateStudio = useCallback(
    (sessionExerciseId: string) => {
      if (!program || !studioContext) return;
      const session = activeWeekData?.sessions.find((s) => s.id === studioContext.sessionId);
      if (!session) return;
      const ctx = buildProgramStudioContext(program, activeWeek, session, sessionExerciseId);
      if (ctx) setStudioContext(ctx);
    },
    [program, activeWeek, activeWeekData, studioContext]
  );

  const handlePurchase = useCallback(() => {
    if (!program || program.priceCents == null) return;
    purchaseProgram({
      programSlug: program.slug,
      programTitle: program.title,
      durationDays: getProgramDurationDays(program),
      priceCents: program.priceCents,
    });
    enroll();
    setPurchaseOpen(false);
  }, [program, purchaseProgram, enroll]);

  const handleStudioOpened = useCallback(() => {
    markRecorded(activeWeek);
  }, [markRecorded, activeWeek]);

  if (!program) {
    return (
      <ArchiveContentPage>
        <div className="flex min-h-[40vh] flex-col items-center justify-center px-0 pb-16 pt-6 text-center">
          <h1 className="text-2xl font-light" style={{ color: "var(--section-title)" }}>
            Program not found
          </h1>
          <Link href="/" className="mt-4 underline" style={{ color: "var(--foreground)" }}>
            Back to archive
          </Link>
        </div>
      </ArchiveContentPage>
    );
  }

  const priceLabel = formatProgramPrice(program.priceCents);
  const wp = weekProgress(activeWeek);
  const weekComplete = progress && activeWeekData ? isWeekSessionsComplete(activeWeekData, progress) : false;
  const filmingDone = progress && weekFilmingGateSatisfied(activeWeek, progress);

  const studioCompleted =
    studioContext && progress
      ? progress.completedExerciseIds.includes(studioContext.activeSessionExerciseId)
      : false;

  return (
    <ArchiveContentPage>
      <ArchivePageHero background={program.heroImage} ariaLabel={program.title}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase text-white/90">
            Program
          </span>
          <span className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase text-white/90">
            {program.accessLevel === "free" ? "Free" : priceLabel ?? "Paid"}
          </span>
        </div>
        <h1 className="mt-2 text-3xl font-light text-white">{program.title}</h1>
        {creator ? (
          <Link
            href={`/creators/${creator.slug}`}
            className="mt-1 inline-block text-sm text-white/80 hover:underline"
          >
            by {creator.name}
          </Link>
        ) : null}
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-white/85">
          {program.description}
        </p>
        {entitlement && entitlementStatus !== "expired" && enrolled ? (
          <p
            className={`mt-3 text-sm font-medium ${
              entitlementStatus === "expiring" ? "text-amber-200" : "text-white/90"
            }`}
          >
            Access until {formatExpiryDate(entitlement.expiresAt)} · {daysUntilExpiry(entitlement)}{" "}
            days left
          </p>
        ) : null}
      </ArchivePageHero>

      <div className="flex flex-wrap gap-2 text-xs">
        <span
          className="rounded-full px-3 py-1 capitalize"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          {program.level}
        </span>
        <span
          className="rounded-full px-3 py-1"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          {program.durationWeeks} weeks · {program.sessionsPerWeek} sessions/week
        </span>
        {program.tags.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="rounded-full px-3 py-1"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
          >
            {tag}
          </span>
        ))}
      </div>

      {!enrolled && program.accessLevel === "paid" ? (
        <div
          className="rounded-lg px-5 py-4"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--section-title)" }}>
            Preview: Week 1 free · Full program {priceLabel ?? ""}
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--section-subtitle)" }}>
            {getProgramDurationDays(program)} days access · unlock all {program.durationWeeks} weeks
            after purchase.
          </p>
          <button
            type="button"
            onClick={() => setPurchaseOpen(true)}
            className="mt-4 rounded-lg px-5 py-2.5 text-sm font-medium"
            style={{
              backgroundColor: "var(--button-bg)",
              color: "var(--button-text)",
              border: "1px solid var(--button-border)",
            }}
          >
            Purchase {priceLabel}
          </button>
        </div>
      ) : entitlementStatus === "expired" ? (
        <div
          className="rounded-lg px-5 py-4"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--section-title)" }}>
            Access ended {entitlement ? formatExpiryDate(entitlement.expiresAt) : ""}
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--section-subtitle)" }}>
            Repurchase to continue where you left off.
          </p>
          <button
            type="button"
            onClick={() => setPurchaseOpen(true)}
            className="mt-4 rounded-lg px-5 py-2.5 text-sm font-medium"
            style={{
              backgroundColor: "var(--button-bg)",
              color: "var(--button-text)",
              border: "1px solid var(--button-border)",
            }}
          >
            Renew access {priceLabel}
          </button>
        </div>
      ) : null}

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {program.weeks.map((week) => {
          const locked = progress
            ? isWeekLocked(program, week.weekNumber, progress, entitlement)
            : week.weekNumber > 1;
          const active = week.weekNumber === activeWeek;
          const stats = weekProgress(week.weekNumber);
          const weekDone =
            progress && !locked ? isWeekSessionsComplete(week, progress) : false;
          return (
            <button
              key={week.weekNumber}
              type="button"
              disabled={locked}
              onClick={() => setActiveWeek(week.weekNumber)}
              className="shrink-0 rounded-lg px-4 py-2.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                backgroundColor: active ? "var(--button-bg)" : "var(--surface)",
                color: active ? "var(--button-text)" : "var(--foreground)",
                border: `1px solid ${active ? "var(--button-border)" : "var(--border)"}`,
              }}
            >
              <span className="flex flex-wrap items-center gap-1.5 font-medium">
                Week {week.weekNumber}
                {weekDone ? (
                  <CircleCheck
                    size={14}
                    aria-label="Week complete"
                    style={{ color: "var(--success)" }}
                    fill="var(--success)"
                    stroke="#000"
                    strokeWidth={2}
                  />
                ) : null}
              </span>
              {!locked && progress ? (
                <span className="mt-0.5 block text-[10px] opacity-70">
                  {stats.sessionsComplete}/{stats.sessionCount} sessions
                </span>
              ) : locked ? (
                <span className="mt-0.5 block text-[10px] opacity-70">Locked</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {activeWeekData ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-light" style={{ color: "var(--section-title)" }}>
              {activeWeekData.title ?? `Week ${activeWeek}`}
            </h2>
            {progress && isWeekInteractive(program, activeWeek, progress, entitlement) ? (
              <p className="mt-1 text-sm" style={{ color: "var(--section-subtitle)" }}>
                {wp.completed}/{wp.total} exercises · {wp.sessionsComplete}/{wp.sessionCount}{" "}
                sessions
                {exercisesLoading ? " · Loading previews…" : null}
              </p>
            ) : null}
          </div>

          {progress && isWeekLocked(program, activeWeek, progress, entitlement) ? (
            <div
              className="rounded-lg px-5 py-8 text-center"
              style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <p style={{ color: "var(--section-subtitle)" }}>
                {program.accessLevel === "paid" && !enrolled
                  ? "Purchase the program to unlock this week."
                  : "Complete the previous week to unlock."}
              </p>
            </div>
          ) : (
            activeWeekData.sessions.map((session) => (
              <ProgramSessionBlock
                key={session.id}
                session={session}
                activeWeek={activeWeek}
                progress={progress}
                exercisesById={exercisesById}
                onToggleExercise={toggleExercise}
                onOpenStudio={(sessionExerciseId) => openStudio(session.id, sessionExerciseId)}
              />
            ))
          )}

          {progress &&
          isWeekInteractive(program, activeWeek, progress, entitlement) &&
          weekComplete &&
          !filmingDone ? (
            <div
              className="rounded-lg px-5 py-4"
              style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <p className="text-sm" style={{ color: "var(--section-subtitle)" }}>
                Record any exercise this week to track progress, or continue without filming.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => markRecorded(activeWeek)}
                  className="rounded-lg px-4 py-2 text-sm"
                  style={{
                    backgroundColor: "var(--button-bg)",
                    color: "var(--button-text)",
                    border: "1px solid var(--button-border)",
                  }}
                >
                  I recorded this week
                </button>
                <button
                  type="button"
                  onClick={() => skipFilming(activeWeek)}
                  className="rounded-lg px-4 py-2 text-sm"
                  style={{
                    backgroundColor: "transparent",
                    color: "var(--section-subtitle)",
                    border: "1px solid var(--border)",
                  }}
                >
                  Continue without recording
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <ProgramPurchaseModal
        open={purchaseOpen}
        onOpenChange={setPurchaseOpen}
        program={program}
        onConfirm={handlePurchase}
      />

      <ExerciseProgramStudioModal
        open={studioOpen}
        onOpenChange={setStudioOpen}
        context={studioContext}
        completed={studioCompleted}
        onToggleComplete={(completed) => {
          if (studioContext) toggleExercise(studioContext.activeSessionExerciseId, completed);
        }}
        onNavigate={navigateStudio}
        onOpened={handleStudioOpened}
      />
    </ArchiveContentPage>
  );
}
