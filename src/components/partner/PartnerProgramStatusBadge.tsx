import type { PartnerProgramStatus } from "../../types/partnerProgram";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

const STATUS_LABELS: Record<PartnerProgramStatus, string> = {
  in_review: "In review",
  live: "Live",
  draft: "Draft",
};

const STATUS_COLORS: Record<PartnerProgramStatus, string> = {
  in_review: "var(--accent, #3b82f6)",
  live: "#22c55e",
  draft: "var(--muted-foreground)",
};

export default function PartnerProgramStatusBadge({ status }: { status: PartnerProgramStatus }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{
        ...borderAllTheme,
        color: STATUS_COLORS[status],
      }}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
