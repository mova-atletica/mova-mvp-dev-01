# Mova product-in-use reels

Remotion compositor for 1080×1920 Instagram reels. Props-only — no Supabase here.

## Quick start

From the **repo root** (Remotion is installed brownfield alongside Next):

```bash
npm install
npm run reels:studio
```

Or from this folder: `npm run studio` (delegates to root).

Drop real media into **both** places if you use Studio and the Partner page:

| File | Remotion Studio | Partner Player (Next) |
|------|-----------------|------------------------|
| Plate | `reels/public/plate.mp4` | `public/reels/plate.mp4` → `/reels/plate.mp4` |
| UI recording | `reels/public/ui.mp4` | `public/reels/ui.mp4` → `/reels/ui.mp4` |

Putting a file only under `reels/ui.mp4` (package root) does **not** get served.

## Recipes

Edit knobs in `recipes/reel-01.json` and `recipes/reel-02.json`:

- UI entry: `entry`, `uiStartFrame`, `uiAnimDurationFrames`, `x`, `y`, `scale`
- Chart HUD: `chartGlassTone`, `chartX`/`chartY`/`chartWidth`/`chartHeight`, `glassOpacity`, `glassBlur` — samples plate + overlays. Joint chips use activity visualConfig. Device frame: `borderRadius`, `glassBorderOpacity`, `glassShadow`, …
- CTA: `ctaText`, `ctaStartFrame`

Changing recipes clearly changes Studio defaults and the Partner page recipe picker.

## Partner preview (live activities)

1. Run the Next app (`npm run dev` from repo root).
2. Sign in as a **partner** tier user.
3. Open `/partner/reel-compositor` (not linked from main nav).  
   Allowed even when Phase B partner surfaces are hidden — still requires PartnerGate.
4. Upload plate / UI clips **or** pick activities; tune entry + park X/Y (focal point) with sliders.
5. **Hydrate & preview** — angles are display-smoothed; chart stays clipped inside the glass card.
6. **Export MP4** — one-click browser render (`@remotion/web-renderer`). Keep the tab open until download finishes.

## Render one reel (CLI)

```bash
# from repo root
npm run reels:render
# with props JSON from the Partner page:
npx remotion render reels/src/index.ts ProductInUse reels/out/reel.mp4 --props=./props.json
```

Signed activity URLs expire — refresh hydrate on the Partner page for long sessions.

## Architecture

- `src/ProductInUse.tsx` — plate → overlays → chart → glass UI → CTA
- Next owns auth + hydration; Remotion never holds secrets
- See `docs/superpowers/specs/2026-09-21-product-in-use-reel-compositor-design.md`
