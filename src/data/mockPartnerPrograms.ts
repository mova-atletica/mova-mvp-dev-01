import type { PartnerProgramSubmission } from "../types/partnerProgram";

export const MOCK_PARTNER_PROGRAMS: PartnerProgramSubmission[] = [
  {
    id: "pp-mock-1",
    title: "Strength Foundations",
    weeks: 8,
    sessionsPerWeek: 3,
    price: 499,
    currency: "MXN",
    notes: "Initial launch program — admin uploaded exercises.",
    status: "live",
    submittedAt: "2026-02-15T10:00:00Z",
    archiveProgramSlug: "calisthenics-power",
    adminNotes: "Published to archive. Monitor week 1 completion rates.",
    stats: {
      enrollments: 128,
      activeSubscribers: 94,
      revenueCents: 6387200,
    },
  },
  {
    id: "pp-mock-2",
    title: "Mobility Reset",
    weeks: 4,
    sessionsPerWeek: 2,
    price: 299,
    currency: "MXN",
    notes: "Waiting on final week 4 videos.",
    status: "in_review",
    submittedAt: "2026-03-01T14:30:00Z",
    adminNotes: "Admin reviewing session outline before upload.",
    stats: {
      enrollments: 0,
      activeSubscribers: 0,
      revenueCents: 0,
    },
  },
];
