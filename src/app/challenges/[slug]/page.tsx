"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { getChallengeBySlug } from "../../../data/challengeModules";

export default function ChallengePage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const challenge = getChallengeBySlug(slug);
  const isComingSoon = challenge?.badge === "Soon";

  if (!challenge) {
    return (
      <main
        className="flex min-h-[50vh] flex-col items-center justify-center px-4"
        style={{ backgroundColor: "var(--background)" }}
      >
        <h1 className="text-2xl font-light" style={{ color: "var(--section-title)" }}>
          Challenge not found
        </h1>
        <Link href="/" className="mt-4 underline" style={{ color: "var(--foreground)" }}>
          Back to home
        </Link>
      </main>
    );
  }

  return (
    <main style={{ backgroundColor: "var(--background)" }}>
      <div
        className="relative overflow-hidden"
        style={{
          height: "280px",
          background: challenge.gradient,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to top, var(--background) 0%, transparent 60%)",
          }}
        />
        <div className="relative z-10 mx-auto flex h-full max-w-3xl flex-col justify-end px-6 pb-8">
          <p className="text-xs uppercase tracking-wider text-white/70">{challenge.subtitle}</p>
          <h1 className="text-3xl font-bold text-white">{challenge.title}</h1>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="mb-6 text-lg" style={{ color: "var(--section-subtitle)" }}>
          {challenge.description}
        </p>

        <div
          className="mb-8 rounded-lg p-6"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--section-title)" }}>
            Challenge studio — coming next
          </p>
          <p className="mt-2 text-sm" style={{ color: "var(--section-subtitle)" }}>
            This route is wired up from the new homepage. The locked Open Move challenge experience
            (live camera, {challenge.primaryMetric.toLowerCase()} tracking) will land here in a
            follow-up.
          </p>
          {!isComingSoon ? (
            <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
              Metric: {challenge.primaryMetric} · Difficulty: {challenge.difficulty}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          {!isComingSoon ? (
            <Link
              href="/open-move-v2"
              className="rounded-lg px-6 py-3 text-sm font-medium"
              style={{
                backgroundColor: "var(--primary-button-bg)",
                color: "var(--primary-button-text)",
                border: "1px solid var(--primary-button-border)",
              }}
            >
              Try Open Move Studio
            </Link>
          ) : null}
          <Link
            href="/"
            className="rounded-lg px-6 py-3 text-sm font-medium"
            style={{
              backgroundColor: "var(--button-bg)",
              color: "var(--button-text)",
              border: "1px solid var(--button-border)",
            }}
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
