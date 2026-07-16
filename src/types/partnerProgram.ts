export type PartnerProgramStatus = "in_review" | "live" | "draft";

export interface PartnerProgramStats {
  enrollments: number;
  activeSubscribers: number;
  revenueCents: number;
}

export interface PartnerProgramSubmission {
  id: string;
  title: string;
  weeks: number;
  sessionsPerWeek: number;
  price: number;
  currency: "MXN" | "USD";
  notes: string;
  status: PartnerProgramStatus;
  submittedAt: string;
  archiveProgramSlug?: string;
  adminNotes?: string;
  stats?: PartnerProgramStats;
}

export interface NewPartnerProgramInput {
  title: string;
  weeks: number;
  sessionsPerWeek: number;
  price: number;
  currency: "MXN" | "USD";
  notes: string;
}
