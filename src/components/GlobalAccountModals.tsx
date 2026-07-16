"use client";

import { Suspense } from "react";
import OnboardingModal from "./account/OnboardingModal";
import LeaderboardSavePrompt from "./account/LeaderboardSavePrompt";
import ProPaywallModal from "./account/ProPaywallModal";
import SignInModal from "./account/SignInModal";
import SignInQueryOpener from "./account/SignInQueryOpener";

/** Global account modals — available on all routes. */
export default function GlobalAccountModals() {
  return (
    <>
      <Suspense fallback={null}>
        <SignInQueryOpener />
      </Suspense>
      <SignInModal />
      <OnboardingModal />
      <LeaderboardSavePrompt />
      <ProPaywallModal />
    </>
  );
}
