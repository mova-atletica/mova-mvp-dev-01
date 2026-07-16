import { MOCK_PARTNER_PROGRAMS } from "../data/mockPartnerPrograms";
import type { NewPartnerProgramInput, PartnerProgramSubmission } from "../types/partnerProgram";

const STORAGE_KEY = "mova-mock-partner-programs-v1";

function loadStored(): PartnerProgramSubmission[] {
  if (typeof window === "undefined") return MOCK_PARTNER_PROGRAMS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return MOCK_PARTNER_PROGRAMS;
    const parsed = JSON.parse(raw) as PartnerProgramSubmission[];
    return parsed.length ? parsed : MOCK_PARTNER_PROGRAMS;
  } catch {
    return MOCK_PARTNER_PROGRAMS;
  }
}

function persist(programs: PartnerProgramSubmission[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(programs));
}

export function getPartnerPrograms(): PartnerProgramSubmission[] {
  return loadStored();
}

export function getPartnerProgramById(id: string): PartnerProgramSubmission | undefined {
  return loadStored().find((p) => p.id === id);
}

export function submitPartnerProgram(input: NewPartnerProgramInput): PartnerProgramSubmission {
  const entry: PartnerProgramSubmission = {
    id: `pp-user-${Date.now()}`,
    title: input.title.trim(),
    weeks: input.weeks,
    sessionsPerWeek: input.sessionsPerWeek,
    price: input.price,
    currency: input.currency,
    notes: input.notes.trim(),
    status: "in_review",
    submittedAt: new Date().toISOString(),
    stats: {
      enrollments: 0,
      activeSubscribers: 0,
      revenueCents: 0,
    },
  };
  const merged = [entry, ...loadStored()];
  persist(merged);
  return entry;
}
