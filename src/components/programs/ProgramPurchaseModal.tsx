"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { Program } from "../../types/programs";
import { useTranslations } from "../../i18n/LocaleProvider";
import { getProgramDurationDays } from "../../lib/entitlementAccess";
import { formatProgramPrice } from "../../lib/programAccess";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

interface ProgramPurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  program: Program;
  onConfirm: () => void;
}

export default function ProgramPurchaseModal({
  open,
  onOpenChange,
  program,
  onConfirm,
}: ProgramPurchaseModalProps) {
  const t = useTranslations();
  const priceLabel = formatProgramPrice(program.priceCents) ?? "";
  const durationDays = getProgramDurationDays(program);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[400] bg-black/65" />
        <Dialog.Content
          style={borderAllTheme}
          className="fixed left-1/2 top-1/2 z-[410] w-[min(calc(100vw-2rem),24rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[var(--card-bg)] px-6 py-6 shadow-2xl outline-none"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-base font-semibold text-[color:var(--foreground)]">
                {t("purchase.title")}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                {program.title}
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded p-1.5 text-[color:var(--muted-foreground)] hover:bg-[color:color-mix(in_srgb,var(--foreground)_8%,transparent)]">
              <X size={16} />
            </Dialog.Close>
          </div>

          <ul className="space-y-2 text-sm text-[color:var(--foreground)]">
            <li className="flex justify-between gap-4">
              <span className="text-[color:var(--muted-foreground)]">{t("purchase.price")}</span>
              <span className="font-medium">{priceLabel}</span>
            </li>
            <li className="flex justify-between gap-4">
              <span className="text-[color:var(--muted-foreground)]">{t("purchase.access")}</span>
              <span className="font-medium">
                {durationDays} {t("purchase.days")}
              </span>
            </li>
            <li className="flex justify-between gap-4">
              <span className="text-[color:var(--muted-foreground)]">{t("purchase.includes")}</span>
              <span className="text-right font-medium">
                {program.durationWeeks} {t("purchase.weeksUnlock")}
              </span>
            </li>
          </ul>

          <p className="mt-4 text-xs leading-relaxed text-[color:var(--muted-foreground)]">
            {t("purchase.mockNote")}
          </p>

          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={onConfirm}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-medium"
              style={{
                background: "var(--primary-button-bg)",
                color: "var(--primary-button-text)",
                border: "2px solid var(--primary-button-border)",
              }}
            >
              {t("purchase.confirm")} {priceLabel}
            </button>
            <Dialog.Close asChild>
              <button
                type="button"
                style={borderAllTheme}
                className="w-full rounded-lg px-4 py-2.5 text-sm text-[color:var(--muted-foreground)]"
              >
                {t("common.notNow")}
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
