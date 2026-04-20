"use client";

import { useEffect, useState } from "react";

/** Sentinel for the first slide (performance tips); not shown as body text. */
export const USAGE_GUIDE_PERFORMANCE_TIPS = "performance-tips" as const;

export type UsageGuideSlide = {
  id: number;
  title: string;
  description: string;
  image: string | null;
};

export const USAGE_GUIDE_SLIDES: UsageGuideSlide[] = [
  {
    id: 0,
    title: "App Performance Tips",
    description: USAGE_GUIDE_PERFORMANCE_TIPS,
    image: null,
  },
  {
    id: 1,
    title: "Uploading / Recording Videos",
    description:
      "Use good lighting, ensure only one person is visible, keep your full body in frame, and wear fitted, high-contrast clothing against a simple background.",
    image: "/demo/step-01.webp",
  },
  {
    id: 2,
    title: "Camera & Framing",
    description:
      "Film vertically (9:16) and place the camera far enough back so your entire body stays visible throughout the movement.",
    image: "/demo/step-02.webp",
  },
  {
    id: 3,
    title: "Review, Download & Share",
    description:
      "Review biomechanics, add visual motion effects and share videos or motion data with professionals. Download assets in 9:16 for social sharing.",
    image: "/demo/step-03.webp",
  },
];

type Appearance = "onDark" | "onCard";

type UsageGuideCarouselProps = {
  /** When this becomes true, carousel resets to the first slide. */
  active: boolean;
  appearance?: Appearance;
  /** Max width of the slide track (default 400px). */
  maxWidth?: string;
  className?: string;
};

export function UsageGuideCarousel({
  active,
  appearance = "onDark",
  maxWidth = "400px",
  className = "",
}: UsageGuideCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (active) setCurrentSlide(0);
  }, [active]);

  const isDark = appearance === "onDark";
  const textPrimary = isDark ? "text-white" : "text-[color:var(--foreground)]";
  const textMuted = isDark ? "text-gray-400" : "text-[color:var(--muted-foreground)]";
  const perfCardBg = isDark
    ? "bg-gray-800/50 border-gray-700"
    : "bg-[color:color-mix(in_srgb,var(--foreground)_6%,transparent)] border-[color:var(--border)]";
  const imgShellStyle = { backgroundColor: "var(--muted)" as const };
  const dotActive = isDark ? "var(--primary, #3b82f6)" : "var(--foreground)";
  const dotIdle = isDark ? "var(--muted, #d1d5db)" : "var(--muted)";
  const arrowBtn = isDark
    ? "shrink-0 rounded-full p-1.5 text-white shadow-md transition-opacity hover:opacity-80 bg-white/20 hover:bg-white/30"
    : "shrink-0 rounded-full p-1.5 shadow-md transition-opacity hover:opacity-80 bg-[color:color-mix(in_srgb,var(--foreground)_12%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--foreground)_18%,transparent)] text-[color:var(--foreground)]";
  const linkClass = isDark
    ? "text-blue-400 hover:text-blue-300 underline"
    : "text-[color:var(--primary)] underline hover:opacity-90";

  const rootWidth = maxWidth === "100%" ? "100%" : "fit-content";
  /** Dialog body (v2) passes maxWidth 100% + h-full; Open Move v1 keeps fixed viewport height. */
  const fillHeight = maxWidth === "100%";

  const viewportFixedStyle = {
    height: `min(52vh, 440px)`,
    maxHeight: `min(52vh, 440px)`,
  } as const;

  const mediaClassName =
    "max-h-full max-w-full object-contain rounded-md [width:auto] [height:auto]";

  const renderSlideMedia = (src: string, title: string) => {
    const isVideo = /\.(webm|mp4|mov|m4v)(\?|#|$)/i.test(src);
    if (isVideo) {
      return (
        <video
          src={src}
          className={mediaClassName}
          muted
          playsInline
          loop
          autoPlay
          aria-label={title}
        />
      );
    }
    return <img src={src} alt={title} className={mediaClassName} />;
  };

  return (
    <div
      className={`mx-auto flex min-h-0 flex-col ${fillHeight ? "h-full flex-1" : ""} ${className}`}
      style={{ width: rootWidth, maxWidth }}
    >
      <div
        className={`min-h-0 w-full ${fillHeight ? "flex min-h-0 flex-1 flex-col" : "flex justify-center"}`}
      >
        <div
          className="min-h-0 min-w-0 w-full flex-1 overflow-hidden rounded-lg"
          style={fillHeight ? undefined : viewportFixedStyle}
        >
          <div
            className="flex h-full transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {USAGE_GUIDE_SLIDES.map((slide) => {
              const isPerf = slide.description === USAGE_GUIDE_PERFORMANCE_TIPS;
              return (
              <div
                key={slide.id}
                className={`h-full w-full min-w-0 shrink-0 pr-0.5 ${
                  isPerf
                    ? "overflow-y-auto open-move-studio-panel-scroll"
                    : fillHeight
                      ? "overflow-hidden"
                      : "overflow-y-auto open-move-studio-panel-scroll"
                }`}
              >
                <div
                  className={`flex flex-col items-center pb-2 ${
                    isPerf ? "min-h-full" : fillHeight ? "h-full min-h-0" : "min-h-full"
                  }`}
                >
                  {isPerf ? (
                    <div className="mx-auto w-full max-w-[95%] px-1">
                      <div className={`rounded-lg border p-4 ${perfCardBg}`}>
                        <h4
                          className={`mb-3 text-center text-lg font-medium ${textPrimary}`}
                        >
                          {slide.title}
                        </h4>
                        <div className={`space-y-3 text-left text-sm ${textPrimary}`}>
                          <p className="mb-2">
                            <strong className={textPrimary}>For best performance</strong>
                          </p>
                          <ul className="ml-2 list-inside list-disc space-y-2">
                            <li>
                              Use Chrome or Firefox on desktop (known instability on mobile
                              browsers).
                            </li>
                            <li>Designed for 9:16 vertical videos.</li>
                            <li>Short 5-15 second videos are recommended.</li>
                            <li>
                              If recording solo, using an iPhone as a webcam (e.g. Continuity
                              Camera on Mac) on a tripod works well.
                            </li>
                          </ul>
                          <p className="mb-2">
                            <strong className={textPrimary}>Performance notes</strong>
                          </p>
                          <ul className="ml-2 list-inside list-disc space-y-2">
                            <li>
                              The web app can’t yet deliver both perfectly stable 60fps and
                              high-quality exports at the same time.
                            </li>
                            <li>
                              To improve results, close other GPU-heavy apps or tabs before
                              exporting.
                            </li>
                            <li>Shorter clips and lower resolutions export more reliably.</li>
                          </ul>
                          <p className="mb-2">
                            <strong className={textPrimary}>
                              A native mobile version is planned to support higher-quality
                              exports and stable frame rates. Stay tuned for future updates
                              and releases.
                            </strong>
                          </p>
                          <p className={`mt-3 text-xs ${textMuted}`}>
                            If these adjustments still do not solve your problem, feel free to
                            send a sample video for me to test at{" "}
                            <a
                              href="mailto:trey@mova-atletica.xyz"
                              className={linkClass}
                            >
                              trey@mova-atletica.xyz
                            </a>
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : slide.image ? (
                    <div className="flex h-full min-h-0 w-full flex-col gap-2 overflow-hidden px-1 pb-1">
                      <div className="shrink-0 px-2 text-center">
                        <h4
                          className={`mb-1 text-base font-medium leading-tight ${textPrimary}`}
                        >
                          {slide.title}
                        </h4>
                        <p
                          className={`text-left text-sm leading-snug sm:text-center ${textPrimary}`}
                        >
                          {slide.description}
                        </p>
                      </div>
                      <div
                        className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden rounded-lg p-1"
                        style={imgShellStyle}
                      >
                        {renderSlideMedia(slide.image, slide.title)}
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-2 text-center">
                      <h4 className={`mb-2 text-lg font-medium ${textPrimary}`}>
                        {slide.title}
                      </h4>
                      <p className={`text-sm ${textPrimary}`}>{slide.description}</p>
                    </div>
                  )}
                </div>
              </div>
            );
            })}
          </div>
        </div>
      </div>

      <div className="mt-2 flex shrink-0 items-center justify-center gap-3">
        <button
          type="button"
          onClick={() =>
            setCurrentSlide((prev) =>
              prev === 0 ? USAGE_GUIDE_SLIDES.length - 1 : prev - 1
            )
          }
          className={arrowBtn}
          aria-label="Previous slide"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <div className="flex items-center gap-0.5">
          {USAGE_GUIDE_SLIDES.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setCurrentSlide(index)}
              className="flex h-6 w-6 items-center justify-center rounded-full transition-opacity hover:opacity-90"
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === currentSlide ? "true" : undefined}
            >
              <span
                className="block h-2 w-2 rounded-full transition-transform"
                style={{
                  backgroundColor:
                    index === currentSlide ? dotActive : dotIdle,
                  transform: index === currentSlide ? "scale(1.15)" : "scale(1)",
                  boxShadow:
                    index === currentSlide
                      ? isDark
                        ? "0 0 0 1px rgba(255,255,255,0.4)"
                        : "0 0 0 1px rgba(0,0,0,0.15)"
                      : undefined,
                }}
              />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            setCurrentSlide((prev) =>
              prev === USAGE_GUIDE_SLIDES.length - 1 ? 0 : prev + 1
            )
          }
          className={arrowBtn}
          aria-label="Next slide"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
