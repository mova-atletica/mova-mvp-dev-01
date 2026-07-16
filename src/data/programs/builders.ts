import type {
  Program,
  ProgramSession,
  ProgramWeek,
  SessionExercise,
} from "../../types/programs";

let sessionCounter = 0;
let exerciseCounter = 0;

function nextSessionId(programSlug: string, week: number, day: number): string {
  sessionCounter += 1;
  return `${programSlug}-w${week}-d${day}-${sessionCounter}`;
}

function nextExerciseId(): string {
  exerciseCounter += 1;
  return `se-${exerciseCounter}`;
}

function ex(
  title: string,
  exerciseType: SessionExercise["exerciseType"],
  opts: Partial<Omit<SessionExercise, "id" | "title" | "exerciseType">> = {}
): SessionExercise {
  return {
    id: nextExerciseId(),
    title,
    exerciseType,
    ...opts,
  };
}

function session(
  programSlug: string,
  week: number,
  day: number,
  title: string,
  description: string,
  exercises: SessionExercise[]
): ProgramSession {
  return {
    id: nextSessionId(programSlug, week, day),
    title,
    dayLabel: `Day ${day}`,
    description,
    exercises,
  };
}

function countExercises(weeks: ProgramWeek[]): number {
  return weeks.reduce(
    (sum, w) => sum + w.sessions.reduce((s, sess) => s + sess.exercises.length, 0),
    0
  );
}

/** Unique session themes per week for calisthenics — no template reuse */
const CALISTHENICS_WEEK_THEMES: { weekTitle: string; days: [string, string, string] }[] = [
  { weekTitle: "Foundation", days: ["Upper push base", "Pull & core intro", "Legs & mobility"] },
  { weekTitle: "Volume build", days: ["Push volume", "Pull volume", "Core endurance"] },
  { weekTitle: "Control", days: ["Tempo push", "Scap pull focus", "Hollow & arch"] },
  { weekTitle: "Strength peak", days: ["Heavy push", "Heavy pull", "Mixed circuit"] },
  { weekTitle: "Deload", days: ["Easy push", "Easy pull", "Flow & stretch"] },
  { weekTitle: "Skill intro", days: ["Dip skill", "Pull skill", "Handstand prep"] },
  { weekTitle: "Performance", days: ["Push power", "Pull power", "Full body"] },
  { weekTitle: "Test week", days: ["Max push", "Max pull", "Program finisher"] },
];

function buildCalisthenicsWeeks(slug: string): ProgramWeek[] {
  return CALISTHENICS_WEEK_THEMES.map((theme, idx) => {
    const weekNumber = idx + 1;
    const repScale = Math.min(weekNumber, 6);
    return {
      weekNumber,
      title: `Week ${weekNumber} · ${theme.weekTitle}`,
      sessions: theme.days.map((dayTitle, dayIdx) => {
        const day = dayIdx + 1;
        const baseReps = 5 + repScale;
        return session(
          slug,
          weekNumber,
          day,
          dayTitle,
          `Week ${weekNumber} session ${day} — progressive bodyweight work.`,
          [
            ex("Push-up", "repetition", { sets: 3, reps: baseReps + 2, restSec: 90 }),
            ex("Pull-up or inverted row", "repetition", {
              sets: 3,
              reps: Math.max(3, baseReps - 1),
              restSec: 120,
              notes: "Use band assist if needed",
            }),
            ex("Hollow body hold", "pose", {
              sets: 3,
              durationSec: 20 + weekNumber * 5,
              restSec: 60,
            }),
            ex("Dip or bench dip", "repetition", {
              sets: 3,
              reps: baseReps,
              restSec: 90,
            }),
          ]
        );
      }),
    };
  });
}

const MOBILITY_WEEK_THEMES: { weekTitle: string; days: [string, string] }[] = [
  { weekTitle: "Open the hips", days: ["Hip flow A", "Hip flow B"] },
  { weekTitle: "Spine & shoulders", days: ["Spine wave", "Shoulder CARs"] },
  { weekTitle: "Full body flow", days: ["Morning flow I", "Morning flow II"] },
  { weekTitle: "Recovery", days: ["Breath & stretch", "Easy mobilize"] },
];

function buildMobilityWeeks(slug: string): ProgramWeek[] {
  return MOBILITY_WEEK_THEMES.map((theme, idx) => {
    const weekNumber = idx + 1;
    return {
      weekNumber,
      title: `Week ${weekNumber} · ${theme.weekTitle}`,
      sessions: theme.days.map((dayTitle, dayIdx) => {
        const day = dayIdx + 1;
        return session(slug, weekNumber, day, dayTitle, "Guided mobility — move with control.", [
          ex("World's greatest stretch", "flow", { durationSec: 60, notes: "Each side" }),
          ex("Cat-cow", "flow", { sets: 2, reps: 8 }),
          ex("90/90 hip switch", "flow", { sets: 2, durationSec: 45 }),
          ex("Child's pose breathing", "pose", { durationSec: 90 }),
        ]);
      }),
    };
  });
}

const CORE_WEEK_THEMES: { weekTitle: string; days: [string, string] }[] = [
  { weekTitle: "Stability base", days: ["Plank series", "Dead bug circuit"] },
  { weekTitle: "Endurance", days: ["Hold progressions", "Anti-rotation"] },
  { weekTitle: "Fatigue work", days: ["Timed circuit A", "Timed circuit B"] },
  { weekTitle: "Peak & deload", days: ["Max holds", "Easy reset"] },
];

function buildCoreWeeks(slug: string): ProgramWeek[] {
  return CORE_WEEK_THEMES.map((theme, idx) => {
    const weekNumber = idx + 1;
    const holdBase = 25 + weekNumber * 10;
    return {
      weekNumber,
      title: `Week ${weekNumber} · ${theme.weekTitle}`,
      sessions: theme.days.map((dayTitle, dayIdx) => {
        const day = dayIdx + 1;
        return session(
          slug,
          weekNumber,
          day,
          dayTitle,
          "Core endurance — quality holds under fatigue.",
          [
            ex("Front plank", "pose", { sets: 3, durationSec: holdBase, restSec: 60 }),
            ex("Side plank", "pose", {
              sets: 2,
              durationSec: Math.round(holdBase * 0.6),
              restSec: 45,
              notes: "Each side",
            }),
            ex("Dead bug", "repetition", { sets: 3, reps: 10, restSec: 45 }),
            ex("Glute bridge hold", "pose", { sets: 3, durationSec: 30 + weekNumber * 5, restSec: 45 }),
          ]
        );
      }),
    };
  });
}

function buildProgram(
  base: Omit<Program, "weeks" | "exerciseCount" | "estimatedMinutes"> & {
    weeks: ProgramWeek[];
    estimatedMinutesPerSession?: number;
  }
): Program {
  const exerciseCount = countExercises(base.weeks);
  const sessionCount = base.weeks.reduce((s, w) => s + w.sessions.length, 0);
  const mins = base.estimatedMinutesPerSession ?? 25;
  return {
    ...base,
    exerciseCount,
    estimatedMinutes: Math.round(sessionCount * mins * 0.35),
  };
}

const MATHEUS_JOURNEY_WEEKS: { weekTitle: string; region: string; days: [string, string] }[] = [
  { weekTitle: "Patagonia departure", region: "Southern cone", days: ["Leg endurance primer", "Hip & spine recovery ride"] },
  { weekTitle: "Andes crossing", region: "High altitude", days: ["Climbing cadence drills", "Off-bike core stability"] },
  { weekTitle: "Altiplano miles", region: "Plateau", days: ["Tempo pedal prep", "Mobility for long saddle"] },
  { weekTitle: "Coastal push north", region: "Pacific route", days: ["Sprint repeat strength", "Easy spin recovery"] },
];

function buildMatheusJourneyWeeks(slug: string): ProgramWeek[] {
  return MATHEUS_JOURNEY_WEEKS.map((theme, idx) => {
    const weekNumber = idx + 1;
    return {
      weekNumber,
      title: `Week ${weekNumber} · ${theme.weekTitle}`,
      sessions: theme.days.map((dayTitle, dayIdx) => {
        const day = dayIdx + 1;
        return session(
          slug,
          weekNumber,
          day,
          dayTitle,
          `${theme.region} — placeholder session for Matheus' South America bike journey.`,
          [
            ex("Cycling fit check", "flow", {
              durationSec: 300,
              notes: "Side-on clip — use Cycling Fit mini app",
            }),
            ex("Single-leg squat", "repetition", { sets: 3, reps: 8, restSec: 60, notes: "Each leg" }),
            ex("Hip flexor stretch", "pose", { durationSec: 45, notes: "Each side" }),
            ex("Plank hold", "pose", { sets: 3, durationSec: 35 + weekNumber * 5, restSec: 45 }),
          ]
        );
      }),
    };
  });
}

function buildOliviaWeeks(slug: string): ProgramWeek[] {
  const week1Lower = session(
    slug,
    1,
    1,
    "Lower body strength",
    "Glutes and legs — controlled reps with Olivia's reference form for each movement.",
    [
      ex("Stationary Lunge", "flow", {
        exerciseId: "stationary-lunge",
        sets: 3,
        reps: 10,
        restSec: 60,
        notes: "Each leg",
      }),
      ex("Box Squat", "repetition", {
        exerciseId: "box-squat",
        sets: 3,
        reps: 12,
        restSec: 90,
      }),
      ex("Dumbbell Reverse Lunge", "flow", {
        exerciseId: "dumbbell-reverse-lunge",
        sets: 3,
        reps: 10,
        restSec: 60,
        notes: "Each leg",
      }),
      ex("Olivia's Sumo Squat", "pose", {
        exerciseId: "olivia's-sumo-squat",
        sets: 3,
        durationSec: 45,
        restSec: 60,
      }),
    ]
  );

  const week1Upper = session(
    slug,
    1,
    2,
    "Upper body & core",
    "Pull, press, and core — match Olivia's tempo on every rep.",
    [
      ex("Single Arm Row", "flow", {
        exerciseId: "single-arm-row",
        sets: 3,
        reps: 10,
        restSec: 60,
        notes: "Each arm",
      }),
      ex("Right Shoulder Press", "repetition", {
        exerciseId: "right-shoulder-press",
        sets: 3,
        reps: 10,
        restSec: 75,
      }),
      ex("V-Ups", "repetition", {
        exerciseId: "v-ups",
        sets: 3,
        reps: 12,
        restSec: 45,
      }),
    ]
  );

  const week2Lower = session(
    slug,
    2,
    1,
    "Lower body — week 2",
    "Add one rep per set from week 1 or slow the eccentric.",
    [
      ex("Stationary Lunge", "flow", {
        exerciseId: "stationary-lunge",
        sets: 3,
        reps: 12,
        restSec: 60,
        notes: "Each leg",
      }),
      ex("Box Squat", "repetition", {
        exerciseId: "box-squat",
        sets: 4,
        reps: 10,
        restSec: 90,
      }),
      ex("Dumbbell Reverse Lunge", "flow", {
        exerciseId: "dumbbell-reverse-lunge",
        sets: 3,
        reps: 12,
        restSec: 60,
      }),
      ex("Olivia's Sumo Squat", "pose", {
        exerciseId: "olivia's-sumo-squat",
        sets: 3,
        durationSec: 50,
        restSec: 60,
      }),
    ]
  );

  const week2Upper = session(
    slug,
    2,
    2,
    "Upper body & core — week 2",
    "Same movements — focus on range and bracing.",
    [
      ex("Single Arm Row", "flow", {
        exerciseId: "single-arm-row",
        sets: 4,
        reps: 10,
        restSec: 60,
      }),
      ex("Right Shoulder Press", "repetition", {
        exerciseId: "right-shoulder-press",
        sets: 3,
        reps: 12,
        restSec: 75,
      }),
      ex("V-Ups", "repetition", {
        exerciseId: "v-ups",
        sets: 4,
        reps: 10,
        restSec: 45,
      }),
    ]
  );

  return [
    {
      weekNumber: 1,
      title: "Week 1 · Foundation",
      sessions: [week1Lower, week1Upper],
    },
    {
      weekNumber: 2,
      title: "Week 2 · Build",
      sessions: [week2Lower, week2Upper],
    },
  ];
}

export function buildAllPrograms(): Program[] {
  sessionCounter = 0;
  exerciseCounter = 0;

  const calisthenicsWeeks = buildCalisthenicsWeeks("calisthenics-power");
  const mobilityWeeks = buildMobilityWeeks("morning-mobility");
  const coreWeeks = buildCoreWeeks("core-endurance");
  const oliviaWeeks = buildOliviaWeeks("olivia-foundation");
  const matheusWeeks = buildMatheusJourneyWeeks("matheus-south-america-bike");

  return [
    buildProgram({
      slug: "matheus-south-america-bike",
      title: "Matheus' South America Journey on Bike",
      description:
        "A placeholder endurance program following Matheus' long-distance cycling route — off-bike strength, mobility, and cycling fit checks to stay strong from Patagonia to the coast.",
      creatorSlug: "matheus",
      level: "intermediate",
      muscleGroups: ["legs", "core", "hips", "back"],
      equipment: ["bike", "bodyweight", "mat"],
      tags: ["cycling", "endurance", "adventure", "program"],
      durationWeeks: 4,
      sessionsPerWeek: 2,
      heroImage: "linear-gradient(135deg, #1e293b 0%, #334155 40%, #64748b 70%, #94a3b8 100%)",
      accessLevel: "free",
      previewWeekCount: 4,
      isFeatured: true,
      ctaLabel: "View program",
      weeks: matheusWeeks,
      estimatedMinutesPerSession: 20,
    }),
    buildProgram({
      slug: "olivia-foundation",
      title: "Olivia Foundation Strength",
      description:
        "A 2-week intro strength program with Olivia Ostrom — every session links to her reference videos in the Mova studio for form, compare, and analysis.",
      creatorSlug: "oliviaostrom_",
      level: "beginner",
      muscleGroups: ["legs", "shoulders", "core", "arms"],
      equipment: ["dumbbells", "box", "mat"],
      tags: ["strength", "beginner", "program"],
      durationWeeks: 2,
      sessionsPerWeek: 2,
      heroImage: "linear-gradient(135deg, #3f1d38 0%, #9d174d 45%, #fbcfe8 100%)",
      accessLevel: "free",
      previewWeekCount: 2,
      isFeatured: true,
      ctaLabel: "Start program",
      weeks: oliviaWeeks,
      estimatedMinutesPerSession: 22,
    }),
    buildProgram({
      slug: "calisthenics-power",
      title: "Calisthenics Power",
      description:
        "An 8-week progressive bodyweight strength program — unique sessions each day with pull, push, and core patterns built for control and power.",
      creatorSlug: "nicofitness",
      level: "intermediate",
      muscleGroups: ["chest", "back", "core", "shoulders"],
      equipment: ["bodyweight", "pull-up bar"],
      tags: ["calisthenics", "strength", "program"],
      durationWeeks: 8,
      sessionsPerWeek: 3,
      heroImage: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 40%, #7c3aed 100%)",
      accessLevel: "paid",
      previewWeekCount: 1,
      priceCents: 4900,
      durationDays: 56,
      isFeatured: true,
      ctaLabel: "View program",
      weeks: calisthenicsWeeks,
      estimatedMinutesPerSession: 28,
    }),
    buildProgram({
      slug: "morning-mobility",
      title: "Morning Mobility Flow",
      description:
        "A free 4-week mobility program — open hips, spine, and shoulders with short guided flows to start your day.",
      creatorSlug: "mova",
      level: "beginner",
      muscleGroups: ["hips", "spine", "shoulders"],
      equipment: ["bodyweight", "mat"],
      tags: ["mobility", "flow", "recovery"],
      durationWeeks: 4,
      sessionsPerWeek: 2,
      heroImage: "linear-gradient(135deg, #134e4a 0%, #0d9488 50%, #5eead4 100%)",
      accessLevel: "free",
      previewWeekCount: 4,
      isFeatured: false,
      ctaLabel: "Start free",
      weeks: mobilityWeeks,
      estimatedMinutesPerSession: 12,
    }),
    buildProgram({
      slug: "core-endurance",
      title: "Core Endurance Circuit",
      description:
        "Timed holds and controlled reps across 4 weeks to build trunk stability under fatigue.",
      creatorSlug: "mova",
      level: "intermediate",
      muscleGroups: ["core", "glutes"],
      equipment: ["bodyweight", "mat"],
      tags: ["core", "endurance", "circuit"],
      durationWeeks: 4,
      sessionsPerWeek: 2,
      heroImage: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 55%, #93c5fd 100%)",
      accessLevel: "free",
      previewWeekCount: 4,
      isFeatured: false,
      ctaLabel: "Start free",
      weeks: coreWeeks,
      estimatedMinutesPerSession: 18,
    }),
  ];
}
