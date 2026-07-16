import type { Exercise } from "../data/exercises";
import type { ProgramBrowseSummary } from "../data/programs";

export type ContentFilter = "all" | "programs";

export type HomeFilterState = {
  content: ContentFilter;
  levels: string[];
  types: string[];
  muscleGroups: string[];
  equipment: string[];
};

export const EMPTY_HOME_FILTERS: HomeFilterState = {
  content: "all",
  levels: [],
  types: [],
  muscleGroups: [],
  equipment: [],
};

export const LEVEL_FILTER_OPTIONS = ["beginner", "intermediate", "advanced"] as const;

export const TYPE_FILTER_OPTIONS = ["repetition", "pose", "flow"] as const;

export const CONTENT_FILTER_OPTIONS: { id: ContentFilter; label: string }[] = [
  { id: "all", label: "All content" },
  { id: "programs", label: "Programs" },
];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function matchesMultiSelect(selected: string[], values: string[]): boolean {
  if (selected.length === 0) return true;
  const normalizedValues = values.map(normalize);
  return selected.some((item) => normalizedValues.includes(normalize(item)));
}

export function exerciseMatchesFilters(exercise: Exercise, filters: HomeFilterState): boolean {
  if (filters.content === "programs") return false;
  if (!matchesMultiSelect(filters.levels, [exercise.level])) return false;
  if (!matchesMultiSelect(filters.types, [exercise.exerciseType])) return false;
  if (!matchesMultiSelect(filters.muscleGroups, exercise.muscleGroups)) return false;
  if (!matchesMultiSelect(filters.equipment, exercise.equipment)) return false;
  return true;
}

export function programMatchesFilters(program: ProgramBrowseSummary, filters: HomeFilterState): boolean {
  if (!matchesMultiSelect(filters.levels, [program.level])) return false;
  if (filters.types.length > 0) {
    const programTypes = program.tags.includes("flow") ? ["flow"] : ["repetition"];
    if (!matchesMultiSelect(filters.types, programTypes)) return false;
  }
  if (!matchesMultiSelect(filters.muscleGroups, program.muscleGroups)) return false;
  if (!matchesMultiSelect(filters.equipment, program.equipment)) return false;
  return true;
}

/** @deprecated Use programMatchesFilters */
export const sequenceMatchesFilters = programMatchesFilters;

export function collectFilterOptions(
  programs: ProgramBrowseSummary[],
  exercises: Exercise[] = []
): { muscleGroups: string[]; equipment: string[] } {
  const muscleSet = new Set<string>();
  const equipmentSet = new Set<string>();

  for (const program of programs) {
    program.muscleGroups.forEach((m) => muscleSet.add(m.trim()));
    program.equipment.forEach((e) => equipmentSet.add(e.trim()));
  }

  for (const exercise of exercises) {
    exercise.muscleGroups.forEach((m) => muscleSet.add(m.trim()));
    exercise.equipment.forEach((e) => equipmentSet.add(e.trim()));
  }

  const sortAlpha = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base" });

  return {
    muscleGroups: [...muscleSet].filter(Boolean).sort(sortAlpha),
    equipment: [...equipmentSet].filter(Boolean).sort(sortAlpha),
  };
}

export function hasActiveFilters(filters: HomeFilterState): boolean {
  return (
    filters.content !== "all" ||
    filters.levels.length > 0 ||
    filters.types.length > 0 ||
    filters.muscleGroups.length > 0 ||
    filters.equipment.length > 0
  );
}

export function toggleFilterValue(list: string[], value: string): string[] {
  const key = normalize(value);
  const exists = list.some((item) => normalize(item) === key);
  if (exists) return list.filter((item) => normalize(item) !== key);
  return [...list, value];
}

export function formatFilterLabel(value: string): string {
  if (value === "repetition") return "Repetition";
  if (value === "pose") return "Pose hold";
  if (value === "flow") return "Flow";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export type ActiveFilterChip = {
  id: string;
  label: string;
  group: keyof HomeFilterState | "content";
};

export function buildActiveFilterChips(filters: HomeFilterState): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  if (filters.content !== "all") {
    const contentLabel =
      CONTENT_FILTER_OPTIONS.find((o) => o.id === filters.content)?.label ?? filters.content;
    chips.push({ id: "content", label: contentLabel, group: "content" });
  }

  for (const level of filters.levels) {
    chips.push({ id: `level-${level}`, label: formatFilterLabel(level), group: "levels" });
  }
  for (const type of filters.types) {
    chips.push({ id: `type-${type}`, label: formatFilterLabel(type), group: "types" });
  }
  for (const muscle of filters.muscleGroups) {
    chips.push({ id: `muscle-${muscle}`, label: formatFilterLabel(muscle), group: "muscleGroups" });
  }
  for (const item of filters.equipment) {
    chips.push({ id: `equipment-${item}`, label: formatFilterLabel(item), group: "equipment" });
  }

  return chips;
}

export function removeFilterChip(
  filters: HomeFilterState,
  chip: ActiveFilterChip
): HomeFilterState {
  if (chip.group === "content") {
    return { ...filters, content: "all" };
  }
  if (chip.group === "levels") {
    const value = chip.id.replace(/^level-/, "");
    return { ...filters, levels: filters.levels.filter((v) => normalize(v) !== normalize(value)) };
  }
  if (chip.group === "types") {
    const value = chip.id.replace(/^type-/, "");
    return { ...filters, types: filters.types.filter((v) => normalize(v) !== normalize(value)) };
  }
  if (chip.group === "muscleGroups") {
    const value = chip.id.replace(/^muscle-/, "");
    return {
      ...filters,
      muscleGroups: filters.muscleGroups.filter((v) => normalize(v) !== normalize(value)),
    };
  }
  if (chip.group === "equipment") {
    const value = chip.id.replace(/^equipment-/, "");
    return {
      ...filters,
      equipment: filters.equipment.filter((v) => normalize(v) !== normalize(value)),
    };
  }
  return filters;
}
