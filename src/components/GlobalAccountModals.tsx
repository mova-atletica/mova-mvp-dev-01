"use client";

import { Suspense } from "react";
import OnboardingModal from "./account/OnboardingModal";
import LeaderboardSavePrompt from "./account/LeaderboardSavePrompt";
import ProPaywallModal from "./account/ProPaywallModal";
import ProCheckoutReturnHandler from "./account/ProCheckoutReturnHandler";
import SignInModal from "./account/SignInModal";
import SignInQueryOpener from "./account/SignInQueryOpener";

/** Global account modals — available on all routes. */
export default function GlobalAccountModals() {
  return (
    <>
      <Suspense fallback={null}>
        <SignInQueryOpener />
      </Suspense>
      <Suspense fallback={null}>
        <ProCheckoutReturnHandler />
      </Suspense>
      <SignInModal />
      <OnboardingModal />
      <LeaderboardSavePrompt />
      <ProPaywallModal />
    </>
  );
}
