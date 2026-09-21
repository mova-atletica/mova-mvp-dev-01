# Product-in-use reel compositor (Remotion)

**Date:** 2026-09-21  
**Status:** Approved for implementation planning  
**Approach:** Partner Player page + sibling Remotion package (`reels/`)

## Goal

Build a minimal Remotion compositor for 1080×1920 Instagram-style reels (~8–20s) that layers:

1. Plate video (activity session and/or iOS/media export)
2. Live analysis overlays (skeleton, joint chips, geometry — from poses + `visualConfig`)
3. Per-segment animated charts (joint angle or sport-specific)
4. Product UI screen recording inside a vertical glass “device” frame
5. Optional short CTA text outro

Preview and hydrate via a **Partner-gated** Next.js page. Composition stays props-only (no Supabase inside Remotion). Structure supports ~8 recipes later; ship one composition + ≥2 example recipes first.

## Non-goals

- React Three Fiber / 3D
- Full WYSIWYG editor
- Generative AI video
- Batch renderer for all recipes
- Captions, music sync, phone SVG bezels, watermarking
- Transparent prebaked `overlaySrc` media (alpha video is impractical; live overlays replace this)
- Public / non-partner access
- In-browser MP4 encode on day one (CLI render with serialized props is enough)
- Remotion Lambda / production “export to Reels” job (same props shape later)

## Architecture

```
mova-mvp-dev-01/
├── reels/                              # Remotion package (own package.json)
│   ├── package.json
│   ├── remotion.config.ts
│   ├── src/
│   │   ├── index.ts                    # registerRoot
│   │   ├── Root.tsx                    # Composition id="ProductInUse"
│   │   ├── ProductInUse.tsx            # main composition
│   │   ├── chart/AngleSeriesChart.tsx
│   │   ├── overlay/PoseOverlayCanvas.tsx
│   │   ├── ui/GlassDeviceFrame.tsx
│   │   ├── helpers/entryAnim.ts
│   │   └── types.ts
│   ├── recipes/reel-01.json, reel-02.json
│   ├── public/ui.mp4                   # placeholder + README note
│   └── README.md
│
└── src/app/partner/reel-compositor/
    └── page.tsx                        # PartnerGate → hydrate → Player
```

### Boundaries

| Layer | Responsibility |
|---|---|
| **Next (`/partner/reel-compositor`)** | `PartnerGate`, activity list, segment builder, call `loadActivityHydration`, pass `inputProps` to `@remotion/player` |
| **Remotion (`reels/`)** | Render 1080×1920 from props only — never holds Supabase keys |
| **Existing product libs** | `loadActivityHydration`, `OpenMoveAngleSeries`, `visualConfig`, pose/effect draw helpers (reuse/extract for overlay layer) |

No main-nav link. Partner-only URL (manually assigned `tier === "partner"` in Supabase), same exclusivity model as other partner surfaces / Coach access.

### Future product path (“export to Reels”)

Same `inputProps` → headless `remotion render` or a server job. Auth and hydration stay on the Next edge; Remotion remains a render worker.

## Output & timing

- Composition size: **1080 × 1920**
- Default fps: **30**
- Duration: `sum(segments[].durationInFrames)` (from video metadata or recipe override)
- CTA draws inside that window — no separate outro media segment in v1

## Data & recipe shape

### Recipe (committed JSON under `reels/recipes/`)

Tunable knobs only — no secrets. Optional default `activityIds` for demos; Partner page overrides.

```ts
type Recipe = {
  id: string
  fps: 30

  /** Defaults for Partner page; length 1–2 */
  activityIds?: string[]

  uiSrc: string                      // e.g. "/ui.mp4" from reels/public
  uiStartFrame: number
  uiAnimDurationFrames: number
  entry: "bottom" | "side" | "scale" | "fade"
  x: number                          // normalized 0–1 (device center)
  y: number
  scale: number
  borderRadius: number

  /** Always present — tunable like Studio label chips */
  glassColor: string                 // e.g. "#ffffff"
  glassOpacity: number               // 0–1
  glassBlur: number                  // px
  glassBorderOpacity?: number        // default ~0.25
  glassShadow?: number               // modest default

  ctaText?: string
  ctaStartFrame?: number
  ctaDurationFrames?: number         // default ~45

  /** Per-slot chart defaults (overridden per segment on page) */
  segmentChartDefaults?: SegmentChartConfig[]
}
```

### Segment sources (runtime + recipe overrides)

```ts
type SegmentChartConfig =
  | null
  | { kind: "jointAngle"; joint: keyof OpenMoveAngleSeries }
  | { kind: "sport"; seriesKey: string }

type SegmentSource =
  | {
      source: "activity"
      activityId: string
    }
  | {
      source: "media"
      plateSrc: string               // iOS export or other file URL/path
      activityId?: string            // optional: analysis only (poses/angles/visualConfig)
    }

type ResolvedSegment = {
  plateUrl: string
  durationInFrames: number
  poses?: unknown[]
  poseTimestamps?: number[] | null
  frameIntervalSec?: number | null
  visualConfig?: VisualOverlayPreset | null
  angles?: OpenMoveAngleSeries | null
  sportAnalysisKind?: string | null
  sportAnalysis?: unknown | null
  chart: SegmentChartConfig
  overlays: "on" | "off"           // default on for activity; off when media is pre-baked
}
```

### Runtime Player `inputProps`

```ts
type ProductInUseProps = Recipe & {
  segments: ResolvedSegment[]
}
```

### Coordinate system

- Device park position: **normalized 0–1** for `x` / `y` relative to composition width/height.
- Instagram-safe clamps (documented constants): keep UI out of extreme bottom/right (e.g. max park ~`y ≈ 0.72`, `x ≈ 0.78` at default scale).

### Hydration

Reuse `loadActivityHydration(supabase, activityId)` which already returns:

- `videoUrl` (signed)
- `poses`, `poseTimestamps`, `frameIntervalSec`
- `angles` (`OpenMoveAngleSeries`)
- `visualConfig`
- `sportAnalysis` / `sportAnalysisKind`

For `source: "media"`: plate = `plateSrc`; if `activityId` set, hydrate analysis fields only and ignore activity `videoUrl`.

## Composition layers (bottom → top)

1. **Plate timeline** — hard-cut `Sequence`/`Series` of segment videos; object-fit cover, center crop to 9:16.
2. **Live overlay** — when `overlays === "on"`: draw skeleton / joint chips / geometry from `poses` + `visualConfig` at the current segment-local frame. Reuse/extract product draw logic (export / effects path); v1 core set only (skeleton + joint chips ± geometry). Skip heavy effects (e.g. muybridge) initially.
3. **Chart** — per-segment selection; progressive reveal by segment-local frame; resets on cut. `jointAngle` fully in v1; sport kinds added incrementally.
4. **Glass device** — `uiSrc` inside rounded CSS glass frame (`backdrop-filter`, translucent fill, soft border, light shadow). Knobs always applied.
5. **CTA** — optional text fade after `ctaStartFrame`.

### UI entry animation

- Before `uiStartFrame`: hidden
- During `uiAnimDurationFrames`: interpolate position/opacity/scale with `Easing.out(Easing.cubic)`
- Presets: `bottom` | `side` | `scale` | `fade`
- After: hold (no fancy exit in v1)

### Glass

Always on and always tunable, mirroring Studio chip controls (`labelBgColor` / `labelBgOpacity` / `labelBlurPx`):

- Defaults can match chip glass (~`#ffffff` @ `0.22`, blur `14`)

Device frame uses **CSS only**. Overlay chips on video keep their own config via `visualConfig`.

## Partner page UX

**Route:** `/partner/reel-compositor`  
**Gate:** `PartnerGate` (`tier === "partner"`)

Minimal controls (not a full editor):

1. Select recipe (`reel-01`, `reel-02`, …)
2. Configure 1–2 segments (activity vs media, optional linked analysis, chart, overlays on/off)
3. `uiSrc` path (default placeholder)
4. Optional glass number inputs (or recipe-JSON-only in first cut)
5. `@remotion/player` preview (letterboxed)
6. Export guidance: serialize props + `npx remotion render ProductInUse …` (full in-browser encode later)

### Failure modes

- Missing plate URL → error banner
- Chart selected but no angles → hide chart + note
- Overlays on but no poses → skip overlay + note

## Example recipes

### reel-01 — “Product insert”

- 1 segment (activity default)
- UI `entry: "bottom"`, larger `scale`, stronger glass
- Chart: joint angle (e.g. left knee)
- Overlays on
- CTA near end (e.g. desktop beta / iOS soon — copy via prop)

### reel-02 — “Two-set story”

- 2 segments (two activity IDs)
- UI `entry: "side"`, smaller scale, lighter glass, later `uiStartFrame`
- Different chart per segment
- CTA after the cut

## Done when

- [ ] `cd reels && npm i` works; composition registers `ProductInUse`
- [ ] Partner page loads for partner tier only; inaccessible from main nav
- [ ] Hydrate 1–2 segments → Player shows plate + overlay (when data present) + UI animating in with glass + optional chart/CTA
- [ ] Changing recipe knobs clearly changes preview
- [ ] Media plate source works with optional linked `activityId`
- [ ] README: swap media, edit recipe, Partner preview, CLI render
- [ ] ≥2 example recipes with distinct feels
- [ ] Code stays small: one main composition + recipes + thin helpers

## Implementation notes (for planning)

- Prefer extracting shared pose-overlay draw helpers from existing export/effects code rather than forking styles.
- Remotion may need `@remotion/player` in the Next app and Remotion packages in `reels/`; keep dependency boundaries clear.
- Signed activity URLs expire — refresh on Partner page load; document TTL for long Studio sessions.
- Placeholder `ui.mp4` may be empty/gitignored; README documents drop path.

## Out of scope until later

- Every Studio effect in Remotion
- Sport chart kinds beyond the first 1–2 needed
- Service-role headless hydrate without Partner session
- Batch of all 8 recipes
- Productized download button with server encode
