"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useAccount } from "../../contexts/MockAuthContext";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

export default function LeaderboardSavePrompt() {
  const {
    leaderboardSaveOpen,
    pendingLeaderboardScore,
    dismissLeaderboardSave,
    isAuthenticated,
    canPostToLeaderboard,
    submitLeaderboardScore,
    openSignIn,
    openOnboarding,
  } = useAccount();

  if (!pendingLeaderboardScore) return null;

  const handlePost = () => {
    if (!isAuthenticated) {
      dismissLeaderboardSave();
      openSignIn();
      return;
    }
    if (!canPostToLeaderboard) {
      dismissLeaderboardSave();
      openOnboarding();
      return;
    }
    submitLeaderboardScore(pendingLeaderboardScore);
  };

  return (
    <Dialog.Root open={leaderboardSaveOpen} onOpenChange={(open) => !open && dismissLeaderboardSave()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[400] bg-black/65" />
        <Dialog.Content
          style={borderAllTheme}
          className="fixed left-1/2 top-1/2 z-[410] w-[min(calc(100vw-2rem),22rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[var(--card-bg)] p-5 shadow-2xl outline-none"
        >
          <Dialog.Title className="text-base font-semibold text-[color:var(--foreground)]">
            Post to leaderboard?
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-[color:var(--muted-foreground)]">
            {pendingLeaderboardScore.sportTitle}:{" "}
            <span className="font-medium text-[color:var(--foreground)]">
              {pendingLeaderboardScore.formattedScore}
            </span>{" "}
            ({pendingLeaderboardScore.metricLabel})
          </Dialog.Description>

          {!isAuthenticated ? (
            <p className="mt-3 text-xs text-[color:var(--muted-foreground)]">
              Sign in and set a display name to save your score.
            </p>
          ) : !canPostToLeaderboard ? (
            <p className="mt-3 text-xs text-[color:var(--muted-foreground)]">
              Complete your profile (display name) to post publicly.
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={dismissLeaderboardSave}
              style={borderAllTheme}
              className="rounded-lg px-4 py-2 text-xs font-medium text-[color:var(--foreground)] hover:bg-[color:color-mix(in_srgb,var(--foreground)_6%,transparent)]"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={handlePost}
              className="rounded-lg px-4 py-2 text-xs font-medium"
              style={{
                background: "var(--primary-button-bg)",
                color: "var(--primary-button-text)",
                border: "2px solid var(--primary-button-border)",
              }}
            >
              {!isAuthenticated
                ? "Sign In / Create Account"
                : !canPostToLeaderboard
                  ? "Complete profile"
                  : "Post to leaderboard"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
