"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { MOCK_LEADERBOARD_ENTRIES } from "../data/mockLeaderboards";
import { QUICK_ANALYSIS_MOVEMENTS } from "../data/quickAnalysisMovements";
import { createClient } from "../lib/supabase/client";
import { insertLeaderboardEntry, listLeaderboardEntries } from "../lib/leaderboards";
import { mapProfileRow, PROFILE_ACCOUNT_SELECT, type ProfileRow } from "../lib/supabase/profile";
import { hasCoachAccess, hasProAccess } from "../lib/proAccess";
import {
  clearPendingStudioAccess,
  hasPendingStudioAccess,
  markPendingStudioAccess,
} from "../lib/proCheckoutIntent";
import type {
  AccountProfile,
  AccountTier,
  AppLocale,
  LeaderboardEntry,
  LeaderboardScorePayload,
  LeaderboardScope,
  OnboardingInput,
} from "../types/account";

const FEATURED_SPORT_SLUGS = new Set(QUICK_ANALYSIS_MOVEMENTS.map((m) => m.slug));

const FEATURED_MOCK_LEADERBOARD = MOCK_LEADERBOARD_ENTRIES.filter((e) =>
  FEATURED_SPORT_SLUGS.has(e.sportSlug)
);

export interface MyLeaderboardRank {
  sportSlug: string;
  sportTitle: string;
  metricLabel: string;
  formattedScore: string;
  globalRank: number | null;
  countryRank: number | null;
}

interface MockAuthContextValue {
  tier: AccountTier;
  profile: AccountProfile | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  canPostToLeaderboard: boolean;
  hasProAccess: boolean;
  /** Coach Studio — DB tier `partner`. */
  hasCoachAccess: boolean;
  leaderboardEntries: LeaderboardEntry[];
  pendingLeaderboardScore: LeaderboardScorePayload | null;
  onboardingOpen: boolean;
  signInOpen: boolean;
  leaderboardSaveOpen: boolean;
  proPaywallOpen: boolean;
  authError: string | null;
  getLeaderboard: (sportSlug: string, scope: LeaderboardScope, countryCode?: string) => LeaderboardEntry[];
  getMyLeaderboardRanks: () => MyLeaderboardRank[];
  /** @deprecated Use openSignIn / signInWithMagicLink */
  signIn: (tier?: Exclude<AccountTier, "guest">, email?: string) => void;
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>;
  verifyEmailOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  completeOnboarding: (input: OnboardingInput) => Promise<void>;
  updateLocale: (locale: AppLocale) => Promise<void>;
  setMockTier: (tier: Exclude<AccountTier, "guest">) => void;
  submitLeaderboardScore: (score: LeaderboardScorePayload) => void;
  queueLeaderboardSave: (score: LeaderboardScorePayload) => void;
  dismissLeaderboardSave: () => void;
  openSignIn: () => void;
  closeSignIn: () => void;
  /** Close sign-in and clear pending Studio intent (user dismissed). */
  dismissSignIn: () => void;
  openOnboarding: () => void;
  closeOnboarding: () => void;
  requestStudioAccess: (onGranted: () => void) => void;
  openProPaywall: () => void;
  closeProPaywall: () => void;
  /** Redirect to Stripe Checkout for Pro (monthly | yearly). */
  startProCheckout: (priceKey?: "monthly" | "yearly") => Promise<void>;
  /** Open Stripe Customer Portal when the account has a Stripe customer. */
  openBillingPortal: () => Promise<void>;
  /** Re-fetch profile from Supabase (e.g. after Checkout return). */
  refreshProfile: () => Promise<void>;
}

const MockAuthContext = createContext<MockAuthContextValue | null>(null);

const LB_STORAGE_KEY = "mova-mock-leaderboard-v1";

function mergeLeaderboardSeed(stored: LeaderboardEntry[] | undefined): LeaderboardEntry[] {
  const userPosts = (stored ?? []).filter(
    (e) => Boolean(e.userId) || e.id.startsWith("lb-user-")
  );
  const seedIds = new Set(FEATURED_MOCK_LEADERBOARD.map((e) => e.id));
  const merged = [...FEATURED_MOCK_LEADERBOARD];
  for (const post of userPosts) {
    if (!seedIds.has(post.id) && FEATURED_SPORT_SLUGS.has(post.sportSlug)) merged.push(post);
  }
  return merged;
}

function loadLeaderboardEntries(): LeaderboardEntry[] {
  if (typeof window === "undefined") return FEATURED_MOCK_LEADERBOARD;
  try {
    const raw = localStorage.getItem(LB_STORAGE_KEY);
    if (!raw) return FEATURED_MOCK_LEADERBOARD;
    return mergeLeaderboardSeed(JSON.parse(raw) as LeaderboardEntry[]);
  } catch {
    return FEATURED_MOCK_LEADERBOARD;
  }
}

function siteOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>(
    FEATURED_MOCK_LEADERBOARD
  );
  const [pendingLeaderboardScore, setPendingLeaderboardScore] =
    useState<LeaderboardScorePayload | null>(null);
  const [leaderboardSaveOpen, setLeaderboardSaveOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [proPaywallOpen, setProPaywallOpen] = useState(false);
  const [lbHydrated, setLbHydrated] = useState(false);
  const pendingStudioAccessRef = useRef<(() => void) | null>(null);
  const wasAuthenticatedRef = useRef(false);
  const supabase = useMemo(() => createClient(), []);

  const loadProfile = useCallback(
    async (nextUser: User | null) => {
      if (!nextUser) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_ACCOUNT_SELECT)
        .eq("id", nextUser.id)
        .maybeSingle();

      if (error) {
        console.error("Failed to load profile", error.message);
        setAuthError(error.message);
        // Soft fallback so UI still works if migration hasn't been run yet.
        setProfile({
          id: nextUser.id,
          email: nextUser.email?.trim() || "",
          displayName: "",
          countryCode: "US",
          locale: "en",
          onboardingComplete: false,
          tier: "free",
          stripeCustomerId: null,
          billingSource: null,
        });
        return;
      }

      if (!data) {
        const { data: inserted, error: insertError } = await supabase
          .from("profiles")
          .upsert({ id: nextUser.id }, { onConflict: "id" })
          .select(PROFILE_ACCOUNT_SELECT)
          .single();

        if (insertError || !inserted) {
          console.error("Failed to create profile", insertError?.message);
          setProfile({
            id: nextUser.id,
            email: nextUser.email?.trim() || "",
            displayName: "",
            countryCode: "US",
            locale: "en",
            onboardingComplete: false,
            tier: "free",
            stripeCustomerId: null,
            billingSource: null,
          });
          return;
        }
        setProfile(mapProfileRow(inserted as ProfileRow, nextUser));
        return;
      }

      setProfile(mapProfileRow(data as ProfileRow, nextUser));
      setAuthError(null);
    },
    [supabase]
  );

  useEffect(() => {
    setLeaderboardEntries(loadLeaderboardEntries());
    setLbHydrated(true);

    let mounted = true;

    void listLeaderboardEntries(supabase, { limit: 200 }).then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        console.warn("Leaderboard fetch failed; using local seed", error);
        return;
      }
      const featured = data.filter((e) => FEATURED_SPORT_SLUGS.has(e.sportSlug));
      if (featured.length > 0) {
        setLeaderboardEntries(featured);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      void loadProfile(session?.user ?? null).finally(() => {
        if (mounted) setAuthLoading(false);
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      void loadProfile(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, loadProfile]);

  useEffect(() => {
    if (!lbHydrated) return;
    localStorage.setItem(LB_STORAGE_KEY, JSON.stringify(leaderboardEntries));
  }, [leaderboardEntries, lbHydrated]);

  // After first auth (OTP or magic link): onboarding if incomplete, else resume Studio funnel.
  useEffect(() => {
    if (authLoading) return;
    const nowAuth = Boolean(user && profile);
    if (nowAuth && !wasAuthenticatedRef.current && profile) {
      setSignInOpen(false);
      if (!profile.onboardingComplete) {
        setOnboardingOpen(true);
      } else if (pendingStudioAccessRef.current || hasPendingStudioAccess()) {
        if (hasProAccess(profile.tier)) {
          const onGranted = pendingStudioAccessRef.current;
          pendingStudioAccessRef.current = null;
          clearPendingStudioAccess();
          onGranted?.();
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("mova:open-studio"));
          }
        } else {
          setAuthError(null);
          setProPaywallOpen(true);
        }
      }
    }
    wasAuthenticatedRef.current = nowAuth;
  }, [authLoading, user, profile]);

  // Resume incomplete onboarding after reload when Studio intent is still pending.
  // Do not auto-open the paywall here — that conflicts with Checkout return while tier is still free.
  useEffect(() => {
    if (authLoading) return;
    if (!user || !profile) return;
    if (!hasPendingStudioAccess()) return;
    if (signInOpen || onboardingOpen || proPaywallOpen) return;
    if (!profile.onboardingComplete) {
      setOnboardingOpen(true);
    }
  }, [authLoading, user, profile, signInOpen, onboardingOpen, proPaywallOpen]);

  const tier: AccountTier = profile?.tier ?? "guest";
  const isAuthenticated = Boolean(user && profile);
  const canPostToLeaderboard = Boolean(profile?.onboardingComplete && profile.displayName);
  const userHasProAccess = hasProAccess(tier);
  const userHasCoachAccess = hasCoachAccess(tier);

  const getLeaderboard = useCallback(
    (sportSlug: string, scope: LeaderboardScope, countryCode?: string) => {
      let rows = leaderboardEntries.filter((e) => e.sportSlug === sportSlug);
      if (scope === "country" && countryCode) {
        rows = rows.filter((e) => e.countryCode === countryCode);
      }
      return [...rows].sort((a, b) => b.metricValue - a.metricValue).slice(0, 12);
    },
    [leaderboardEntries]
  );

  const getMyLeaderboardRanks = useCallback((): MyLeaderboardRank[] => {
    if (!profile?.id) return [];
    return QUICK_ANALYSIS_MOVEMENTS.map((movement) => {
      const mine = leaderboardEntries
        .filter((e) => e.userId === profile.id && e.sportSlug === movement.slug)
        .sort((a, b) => b.metricValue - a.metricValue)[0];
      if (!mine) {
        return {
          sportSlug: movement.slug,
          sportTitle: movement.title,
          metricLabel: movement.primaryMetric,
          formattedScore: "—",
          globalRank: null,
          countryRank: null,
        };
      }
      const global = getLeaderboard(movement.slug, "global");
      const country = profile.countryCode
        ? getLeaderboard(movement.slug, "country", profile.countryCode)
        : [];
      return {
        sportSlug: movement.slug,
        sportTitle: movement.title,
        metricLabel: mine.metricLabel,
        formattedScore: mine.formattedScore,
        globalRank: global.findIndex((e) => e.id === mine.id) + 1 || null,
        countryRank: country.findIndex((e) => e.id === mine.id) + 1 || null,
      };
    }).filter((row) => row.formattedScore !== "—");
  }, [profile, leaderboardEntries, getLeaderboard]);

  const signInWithMagicLink = useCallback(
    async (email: string): Promise<{ error: string | null }> => {
      setAuthError(null);
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${siteOrigin()}/auth/callback`,
        },
      });
      if (error) {
        setAuthError(error.message);
        return { error: error.message };
      }
      return { error: null };
    },
    [supabase]
  );

  const verifyEmailOtp = useCallback(
    async (email: string, token: string): Promise<{ error: string | null }> => {
      setAuthError(null);
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: token.trim(),
        type: "email",
      });
      if (error) {
        setAuthError(error.message);
        return { error: error.message };
      }
      return { error: null };
    },
    [supabase]
  );

  /** Opens the Sign In / Create Account modal. */
  const signIn = useCallback((_tier?: Exclude<AccountTier, "guest">, _email?: string) => {
    setSignInOpen(true);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setPendingLeaderboardScore(null);
    setLeaderboardSaveOpen(false);
    setOnboardingOpen(false);
    setSignInOpen(false);
    setProPaywallOpen(false);
    pendingStudioAccessRef.current = null;
    wasAuthenticatedRef.current = false;
    setAuthError(null);
  }, [supabase]);

  const completeOnboarding = useCallback(
    async (input: OnboardingInput) => {
      if (!user) return;

      const patch = {
        display_name: input.displayName.trim(),
        country_code: input.countryCode,
        locale: input.locale,
        onboarding_complete: true,
      };

      const { data, error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", user.id)
        .select(PROFILE_ACCOUNT_SELECT)
        .single();

      if (error || !data) {
        console.error("Onboarding update failed", error?.message);
        setAuthError(error?.message ?? "Failed to save profile");
        // Optimistic local update so UX isn't blocked.
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                displayName: patch.display_name,
                countryCode: patch.country_code,
                locale: input.locale,
                onboardingComplete: true,
              }
            : prev
        );
      } else {
        setProfile(mapProfileRow(data as ProfileRow, user));
      }

      setOnboardingOpen(false);

      // Studio gate: after required onboarding, show optional Pro paywall (do not open Studio).
      if (pendingStudioAccessRef.current || hasPendingStudioAccess()) {
        setAuthError(null);
        setProPaywallOpen(true);
      }

      setPendingLeaderboardScore((pending) => {
        if (!pending) return null;
        const optimistic: LeaderboardEntry = {
          id: `lb-user-${Date.now()}`,
          sportSlug: pending.sportSlug,
          metricKey: pending.metricKey,
          metricLabel: pending.metricLabel,
          metricValue: pending.metricValue,
          formattedScore: pending.formattedScore,
          displayName: patch.display_name,
          countryCode: patch.country_code,
          userId: user.id,
          createdAt: new Date().toISOString(),
        };
        setLeaderboardEntries((prev) => [optimistic, ...prev]);
        setLeaderboardSaveOpen(false);

        void insertLeaderboardEntry(supabase, {
          userId: user.id,
          score: pending,
          displayName: patch.display_name,
          countryCode: patch.country_code,
        }).then(({ data: inserted, error: insertErr }) => {
          if (insertErr || !inserted) {
            console.error("Leaderboard insert after onboarding failed", insertErr);
            return;
          }
          setLeaderboardEntries((prev) => [
            inserted,
            ...prev.filter((e) => e.id !== optimistic.id),
          ]);
        });

        return null;
      });
    },
    [supabase, user]
  );

  const setMockTier = useCallback(
    (nextTier: Exclude<AccountTier, "guest">) => {
      if (process.env.NODE_ENV !== "development") return;
      // Local-only optimistic override — DB tier writes are locked to service role.
      setProfile((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tier: nextTier,
          onboardingComplete: true,
          displayName: prev.displayName || "Dev User",
        };
      });
      if (user) {
        void supabase
          .from("profiles")
          .update({
            onboarding_complete: true,
          })
          .eq("id", user.id);
      }
    },
    [supabase, user]
  );

  const submitLeaderboardScore = useCallback(
    (score: LeaderboardScorePayload) => {
      if (!profile?.onboardingComplete) return;

      const optimistic: LeaderboardEntry = {
        id: `lb-user-${Date.now()}`,
        sportSlug: score.sportSlug,
        metricKey: score.metricKey,
        metricLabel: score.metricLabel,
        metricValue: score.metricValue,
        formattedScore: score.formattedScore,
        displayName: profile.displayName,
        countryCode: profile.countryCode,
        userId: profile.id,
        createdAt: new Date().toISOString(),
      };
      setLeaderboardEntries((prev) => [optimistic, ...prev]);
      setPendingLeaderboardScore(null);
      setLeaderboardSaveOpen(false);

      void insertLeaderboardEntry(supabase, {
        userId: profile.id,
        score,
        displayName: profile.displayName,
        countryCode: profile.countryCode,
      }).then(({ data, error }) => {
        if (error || !data) {
          console.error("Leaderboard insert failed", error);
          return;
        }
        setLeaderboardEntries((prev) => [data, ...prev.filter((e) => e.id !== optimistic.id)]);
      });
    },
    [profile, supabase]
  );

  const queueLeaderboardSave = useCallback((score: LeaderboardScorePayload) => {
    setPendingLeaderboardScore(score);
    setLeaderboardSaveOpen(true);
  }, []);

  const dismissLeaderboardSave = useCallback(() => {
    setPendingLeaderboardScore(null);
    setLeaderboardSaveOpen(false);
  }, []);

  const abandonPendingStudioAccess = useCallback(() => {
    pendingStudioAccessRef.current = null;
    clearPendingStudioAccess();
  }, []);

  const openOnboarding = useCallback(() => setOnboardingOpen(true), []);
  /** Dismiss onboarding without completing — clears pending Studio intent. */
  const closeOnboarding = useCallback(() => {
    setOnboardingOpen(false);
    abandonPendingStudioAccess();
  }, [abandonPendingStudioAccess]);
  const openSignIn = useCallback(() => {
    setOnboardingOpen(false);
    setSignInOpen(true);
  }, []);
  const closeSignIn = useCallback(() => setSignInOpen(false), []);
  /** User closed sign-in without authenticating — clears pending Studio intent. */
  const dismissSignIn = useCallback(() => {
    setSignInOpen(false);
    abandonPendingStudioAccess();
  }, [abandonPendingStudioAccess]);
  const openProPaywall = useCallback(() => {
    setAuthError(null);
    setProPaywallOpen(true);
  }, []);
  const closeProPaywall = useCallback(() => {
    setProPaywallOpen(false);
    abandonPendingStudioAccess();
  }, [abandonPendingStudioAccess]);

  const requestStudioAccess = useCallback(
    (onGranted: () => void) => {
      if (userHasProAccess) {
        onGranted();
        return;
      }
      pendingStudioAccessRef.current = onGranted;
      markPendingStudioAccess();
      setAuthError(null);

      // Guest → sign-in; signed-in incomplete → onboarding; free onboarded → paywall.
      if (!user || !profile) {
        setProPaywallOpen(false);
        setOnboardingOpen(false);
        setSignInOpen(true);
        return;
      }
      if (!profile.onboardingComplete) {
        setProPaywallOpen(false);
        setSignInOpen(false);
        setOnboardingOpen(true);
        return;
      }
      setSignInOpen(false);
      setOnboardingOpen(false);
      setProPaywallOpen(true);
    },
    [userHasProAccess, user, profile]
  );

  const startProCheckout = useCallback(
    async (priceKey: "monthly" | "yearly" = "monthly") => {
      if (!user) {
        setProPaywallOpen(false);
        setSignInOpen(true);
        return;
      }

      setAuthError(null);
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priceKey }),
        });
        const payload = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !payload.url) {
          setAuthError(payload.error ?? "Could not start checkout");
          return;
        }
        window.location.assign(payload.url);
      } catch (err) {
        console.error("Checkout start failed", err);
        setAuthError(err instanceof Error ? err.message : "Could not start checkout");
      }
    },
    [user]
  );

  const openBillingPortal = useCallback(async () => {
    setAuthError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const payload = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !payload.url) {
        setAuthError(payload.error ?? "Could not open billing portal");
        return;
      }
      window.location.assign(payload.url);
    } catch (err) {
      console.error("Portal open failed", err);
      setAuthError(err instanceof Error ? err.message : "Could not open billing portal");
    }
  }, []);

  const updateLocale = useCallback(
    async (locale: AppLocale) => {
      if (!user || !profile || locale === profile.locale) return;

      const previousLocale = profile.locale;
      setProfile((prev) => (prev ? { ...prev, locale } : prev));

      const { data, error } = await supabase
        .from("profiles")
        .update({ locale })
        .eq("id", user.id)
        .select(PROFILE_ACCOUNT_SELECT)
        .single();

      if (error || !data) {
        console.error("Locale update failed", error?.message);
        setAuthError(error?.message ?? "Failed to save language");
        setProfile((prev) => (prev ? { ...prev, locale: previousLocale } : prev));
        return;
      }

      setAuthError(null);
      setProfile(mapProfileRow(data as ProfileRow, user));
    },
    [profile, supabase, user]
  );

  const refreshProfile = useCallback(async () => {
    await loadProfile(user);
  }, [loadProfile, user]);

  const value = useMemo<MockAuthContextValue>(
    () => ({
      tier,
      profile,
      isAuthenticated,
      authLoading,
      canPostToLeaderboard,
      hasProAccess: userHasProAccess,
      hasCoachAccess: userHasCoachAccess,
      leaderboardEntries,
      pendingLeaderboardScore,
      onboardingOpen,
      signInOpen,
      leaderboardSaveOpen,
      proPaywallOpen,
      authError,
      getLeaderboard,
      getMyLeaderboardRanks,
      signIn,
      signInWithMagicLink,
      verifyEmailOtp,
      signOut,
      completeOnboarding,
      updateLocale,
      setMockTier,
      submitLeaderboardScore,
      queueLeaderboardSave,
      dismissLeaderboardSave,
      openSignIn,
      closeSignIn,
      dismissSignIn,
      openOnboarding,
      closeOnboarding,
      requestStudioAccess,
      openProPaywall,
      closeProPaywall,
      startProCheckout,
      openBillingPortal,
      refreshProfile,
    }),
    [
      tier,
      profile,
      isAuthenticated,
      authLoading,
      canPostToLeaderboard,
      userHasProAccess,
      userHasCoachAccess,
      leaderboardEntries,
      pendingLeaderboardScore,
      onboardingOpen,
      signInOpen,
      leaderboardSaveOpen,
      proPaywallOpen,
      authError,
      getLeaderboard,
      getMyLeaderboardRanks,
      signIn,
      signInWithMagicLink,
      verifyEmailOtp,
      signOut,
      completeOnboarding,
      updateLocale,
      setMockTier,
      submitLeaderboardScore,
      queueLeaderboardSave,
      dismissLeaderboardSave,
      openSignIn,
      closeSignIn,
      dismissSignIn,
      openOnboarding,
      closeOnboarding,
      requestStudioAccess,
      openProPaywall,
      closeProPaywall,
      startProCheckout,
      openBillingPortal,
      refreshProfile,
    ]
  );

  return <MockAuthContext.Provider value={value}>{children}</MockAuthContext.Provider>;
}

export function useAccount(): MockAuthContextValue {
  const ctx = useContext(MockAuthContext);
  if (!ctx) {
    throw new Error("useAccount must be used within MockAuthProvider");
  }
  return ctx;
}

/** Dev-only: ?mockTier=pro overrides tier after sign-in. */
export function useMockTierQueryParam() {
  const { setMockTier, isAuthenticated } = useAccount();

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (typeof window === "undefined" || !isAuthenticated) return;
    const params = new URLSearchParams(window.location.search);
    const mockTier = params.get("mockTier");
    if (mockTier === "free" || mockTier === "pro" || mockTier === "partner") {
      setMockTier(mockTier);
    }
  }, [setMockTier, isAuthenticated]);
}
