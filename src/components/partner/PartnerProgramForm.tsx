"use client";

import { useState } from "react";
import type { NewPartnerProgramInput } from "../../types/partnerProgram";
import { useTranslations } from "../../i18n/LocaleProvider";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

const inputClass =
  "w-full rounded-lg px-3 py-2 text-sm outline-none text-[color:var(--foreground)]";

interface PartnerProgramFormProps {
  onSubmit: (input: NewPartnerProgramInput) => void;
}

export default function PartnerProgramForm({ onSubmit }: PartnerProgramFormProps) {
  const t = useTranslations();
  const [title, setTitle] = useState("");
  const [weeks, setWeeks] = useState("8");
  const [sessionsPerWeek, setSessionsPerWeek] = useState("3");
  const [price, setPrice] = useState("499");
  const [currency, setCurrency] = useState<"MXN" | "USD">("MXN");
  const [notes, setNotes] = useState("");

  const canSubmit =
    title.trim().length > 0 &&
    Number(weeks) > 0 &&
    Number(sessionsPerWeek) > 0 &&
    Number(price) >= 0;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      title: title.trim(),
      weeks: Number(weeks),
      sessionsPerWeek: Number(sessionsPerWeek),
      price: Number(price),
      currency,
      notes: notes.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label={t("partner.fieldTitle")}>
        <input
          className={inputClass}
          style={{ ...borderAllTheme, backgroundColor: "var(--background)" }}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("partner.fieldWeeks")}>
          <input
            type="number"
            min={1}
            className={inputClass}
            style={{ ...borderAllTheme, backgroundColor: "var(--background)" }}
            value={weeks}
            onChange={(e) => setWeeks(e.target.value)}
            required
          />
        </Field>
        <Field label={t("partner.fieldSessionsPerWeek")}>
          <input
            type="number"
            min={1}
            className={inputClass}
            style={{ ...borderAllTheme, backgroundColor: "var(--background)" }}
            value={sessionsPerWeek}
            onChange={(e) => setSessionsPerWeek(e.target.value)}
            required
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("partner.fieldPrice")}>
          <input
            type="number"
            min={0}
            className={inputClass}
            style={{ ...borderAllTheme, backgroundColor: "var(--background)" }}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </Field>
        <Field label={t("partner.fieldCurrency")}>
          <select
            className={inputClass}
            style={{ ...borderAllTheme, backgroundColor: "var(--background)" }}
            value={currency}
            onChange={(e) => setCurrency(e.target.value as "MXN" | "USD")}
          >
            <option value="MXN">MXN</option>
            <option value="USD">USD</option>
          </select>
        </Field>
      </div>

      <Field label={t("partner.fieldNotes")}>
        <textarea
          className={`${inputClass} min-h-[6rem] resize-y`}
          style={{ ...borderAllTheme, backgroundColor: "var(--background)" }}
          placeholder={t("partner.fieldNotesPlaceholder")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>

      <p className="text-[10px] leading-relaxed text-[color:var(--muted-foreground)]">
        {t("partner.adminNote")}
      </p>

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
        style={{
          background: "var(--primary-button-bg)",
          color: "var(--primary-button-text)",
          border: "2px solid var(--primary-button-border)",
        }}
      >
        {t("partner.submitProgram")}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[color:var(--foreground)]">{label}</span>
      {children}
    </label>
  );
}
