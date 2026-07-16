"use client";

import Link from "next/link";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import type { Exercise } from "../../types";
import type { ProgramExerciseAppearance } from "../../lib/programsContainingExercise";
import { getCreatorForExercise } from "../../lib/creatorMatch";
import {
  ProgramSessionCompleteBadge,
} from "./ExerciseStudioProgramControls";
import { PHASE_B_ENABLED } from "../../lib/productPhase";

interface ExerciseDetailsTabContentProps {
  exercise: Exercise;
  programs: ProgramExerciseAppearance[];
  /** Compact layout for the studio left rail (vs. analysis drawer tab). */
  variant?: "tab" | "rail";
  /** Program modal: complete badge beside exercise title. */
  programComplete?: {
    completed: boolean;
    onToggleComplete: (completed: boolean) => void;
  };
}

function TagList({ items, capitalizeItems = false }: { items: string[]; capitalizeItems?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className={`rounded-full px-2.5 py-0.5 text-xs ${capitalizeItems ? "capitalize" : ""}`}
          style={{ backgroundColor: "var(--tag-bg)", color: "var(--tag-text)" }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function InstructionsAccordion({ instructions }: { instructions: string[] }) {
  return (
    <Accordion.Root type="single" collapsible className="w-full">
      <Accordion.Item
        value="instructions"
        className="overflow-hidden rounded-sm"
        style={{
          backgroundColor: "var(--accordion-bg)",
          border: "1px solid var(--accordion-border)",
          boxShadow: "var(--accordion-shadow)",
        }}
      >
        <Accordion.Header>
          <Accordion.Trigger className="group flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-[var(--accordion-hover-bg)]">
            <span className="text-xs font-semibold" style={{ color: "var(--accordion-text)" }}>
              Instructions on form
            </span>
            <ChevronDown
              size={16}
              className="shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
              style={{ color: "var(--accordion-chevron)" }}
              aria-hidden
            />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content className="rail-accordion-content overflow-hidden">
          <ol className="space-y-2 px-4 pb-4" style={{ color: "var(--accordion-text)" }}>
            {instructions.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium"
                  style={{ background: "var(--tag-bg)", color: "var(--tag-text)" }}
                >
                  {i + 1}
                </span>
                <span className="text-sm leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  );
}

export default function ExerciseDetailsTabContent({
  exercise,
  programs,
  variant = "tab",
  programComplete,
}: ExerciseDetailsTabContentProps) {
  const creator = getCreatorForExercise(exercise);
  const isRail = variant === "rail";

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  return (
    <div className={isRail ? "space-y-4" : "space-y-5 pb-4"}>
      <div>
        <div className="flex items-start gap-2">
          <h3
            className={`min-w-0 flex-1 ${isRail ? "text-base font-normal leading-tight" : "text-lg font-normal"}`}
            style={{ color: "var(--foreground)" }}
          >
            {exercise.title}
          </h3>
          {programComplete ? (
            <ProgramSessionCompleteBadge
              completed={programComplete.completed}
              onToggleComplete={programComplete.onToggleComplete}
            />
          ) : null}
        </div>
        {creator ? (
          <Link
            href={`/creators/${creator.slug}`}
            className="mt-1 inline-block text-xs underline"
            style={{ color: "var(--section-subtitle)" }}
          >
            by {creator.name}
          </Link>
        ) : exercise.author?.name ? (
          <p className="mt-1 text-xs" style={{ color: "var(--section-subtitle)" }}>
            by {exercise.author.name}
          </p>
        ) : null}
        <p
          className={`${isRail ? "mt-1.5 text-xs" : "mt-2 text-sm"} leading-relaxed`}
          style={{ color: "var(--section-subtitle)" }}
        >
          {exercise.description}
        </p>
      </div>

      {!isRail && exercise.level ? (
        <span
          className="inline-block rounded px-2 py-0.5 text-xs font-medium"
          style={{ backgroundColor: "var(--tag-bg)", color: "var(--tag-text)" }}
        >
          {capitalize(exercise.level)}
        </span>
      ) : null}

      {!isRail && exercise.tags.length > 0 ? (
        <div>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted)" }}>
            Tags
          </h4>
          <TagList items={exercise.tags} />
        </div>
      ) : null}

      {isRail && (exercise.equipment.length > 0 || exercise.muscleGroups.length > 0) ? (
        <div
          className={`grid gap-3 ${
            exercise.equipment.length > 0 && exercise.muscleGroups.length > 0 ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
          {exercise.equipment.length > 0 ? (
            <div className="min-w-0">
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                Equipment
              </h4>
              <TagList items={exercise.equipment} />
            </div>
          ) : null}
          {exercise.muscleGroups.length > 0 ? (
            <div className="min-w-0">
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                Muscle groups
              </h4>
              <TagList items={exercise.muscleGroups} capitalizeItems />
            </div>
          ) : null}
        </div>
      ) : (
        <>
          {exercise.equipment.length > 0 ? (
            <div>
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                Equipment
              </h4>
              <TagList items={exercise.equipment} />
            </div>
          ) : null}

          {exercise.muscleGroups.length > 0 ? (
            <div>
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                Muscle groups
              </h4>
              <TagList items={exercise.muscleGroups} capitalizeItems />
            </div>
          ) : null}
        </>
      )}

      {exercise.instructions.length > 0 ? (
        isRail ? (
          <InstructionsAccordion instructions={exercise.instructions} />
        ) : (
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted)" }}>
              Instructions
            </h4>
            <ol className="list-decimal space-y-2 pl-5 text-sm" style={{ color: "var(--section-subtitle)" }}>
              {exercise.instructions.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
        )
      ) : null}

      {!isRail && PHASE_B_ENABLED ? (
        <div>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted)" }}>
            Programs
          </h4>
          {programs.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--section-subtitle)" }}>
              Not part of a published program yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {programs.map(({ program, weekNumbers }) => (
                <li key={program.slug}>
                  <Link
                    href={`/programs/${program.slug}`}
                    className="text-sm font-medium underline"
                    style={{ color: "var(--foreground)" }}
                  >
                    {program.title}
                  </Link>
                  <span className="ml-2 text-xs" style={{ color: "var(--muted)" }}>
                    Weeks {weekNumbers.join(", ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
