# EquityGrid Kenya — Design system

Single source of truth for **EquityGrid Kenya** UI: tokens live in `frontend/tailwind.config.js`; this document describes how to use them and when to extend them.

## Principles

- **Regulator views**: dense, analytical, cool neutrals + `primary` navy for authority.
- **Household views**: more whitespace, slightly larger body text, warmer microcopy; still use the same palette (do not invent new brand colours).
- **Accessibility**: maintain WCAG-friendly contrast for `body` on `surface` and `primary` on white; tier colours are for **status**, not large text blocks on saturated backgrounds.

## Typography

| Role | Tailwind | Spec |
|------|-----------|------|
| Page title (header) | `text-base md:text-lg font-bold text-body` | App header |
| Section title | `text-sm font-bold text-primary` | Cards, tables |
| Household hero | `text-2xl sm:text-3xl font-bold text-slate-900` | My Account dashboard only |
| Body | `text-sm text-body` | Default paragraphs |
| Muted / helper | `text-xs text-muted` | Captions, footnotes |
| Data / mono | `font-mono` + `text-body` | Account hashes, scores |

**Font stack**: `Inter` (see `frontend/index.html`); Tailwind `font-sans` per `tailwind.config.js`.

## Colour tokens (`theme.extend.colors`)

| Token | Hex | Use |
|-------|-----|-----|
| `primary` | `#1B3A6B` | Headers, primary buttons, nav active border |
| `surface` | `#FFFFFF` | Cards, modals |
| `surface-muted` | `#F9FAFB` | Striped rows, soft panels |
| `border` | `#E5E7EB` | Card and input borders |
| `body` | `#111827` | Primary text |
| `muted` | `#6B7280` | Secondary labels |
| `tier-green` | `#16A34A` | GREEN classification |
| `tier-yellow` | `#D97706` | YELLOW classification |
| `tier-red` | `#DC2626` | RED classification |
| `navactive` | `#EFF6FF` | Sidebar / filter hover |

**Do not** use raw hex in new components unless mapping a chart library; prefer Tailwind tokens.

## Spacing & layout

- **Page padding**: `p-5 md:p-8` on main `PageFade` wrappers; max width `max-w-[1100px]`–`max-w-[1440px]` depending on page.
- **Card padding**: `p-4`–`p-6`; use `rounded-xl border border-border shadow-card` for default cards (`.card` in `index.css`).
- **Grid gaps**: `gap-3`–`gap-6` for related groups; **household** pages may use `gap-8` between major sections.
- **Navbar**: fixed header `h-16`; main content `pt-16 lg:ml-[260px]` to clear sidebar + header.

## Radius & shadow

- **Cards / inputs**: `rounded-xl` (12px); **household** modals / hero cards may use `rounded-2xl`.
- **Pills / toggles**: `rounded-full` with inner `p-0.5` track + `shadow` on active segment.
- **Shadow**: `shadow-card` from Tailwind theme (`0 1px 2px rgba(17, 24, 39, 0.04)`).

## Components

- **`.card`**: `@apply bg-surface border border-border rounded-xl shadow-card` (`index.css`).
- **Tables**: `.table-pro` for regulator tables.
- **Maps**: full-bleed map areas use explicit height (`h-[350px] md:h-[500px]` on Vitals) + `card` wrapper with `overflow-hidden`.

## Motion

- **Page enter**: `.animate-fade-in` (`fade-in-up` in `index.css`).
- **NAJI mic (idle)**: `.naji-mic-pulse` — slow ring pulse on the mic control only (`index.css`).

## Kenya map (Vitals)

- **Basemap**: CARTO **Dark Matter** (`KenyaDeckMap.jsx`) — full dark chrome (controls, tooltips, county drawer) matches the map card (`slate-950` / `slate-900`).
- **3D**: County extrusion + heat-map hex extrusion use **matte** deck.gl material (`shininess: 0`, zero specular) so extrusion reads as solid colour blocks without light streaks.
- **Bounds**: Kenya bbox filter + `maxBounds` unchanged from prior behaviour.

## Voice & AI (dev)

| Variable | Where | Purpose |
|----------|--------|---------|
| `ANTHROPIC_API_KEY` | `frontend/.env.local` | Claude via Vite proxy `/anthropic` (not exposed to browser bundle). |
| `VITE_ELEVENLABS_VOICE_ID` | `frontend/.env.local` | ElevenLabs voice UUID; safe to expose if needed. |
| `VITE_ELEVENLABS_MODEL_ID` | optional | e.g. `eleven_turbo_v2_5` |
| `VITE_ELEVENLABS_API_KEY` **or** `ELEVENLABS_API_KEY` | `frontend/.env.local` | Injected on the **dev server** proxy to `/elevenlabs` only — prefer **non-VITE** `ELEVENLABS_API_KEY` in production-like setups so the key never ships to the client. |

Production: mirror `/anthropic` and `/elevenlabs` on your gateway; do not rely on Vite proxy.

## When to update this file

Any change to **global** typography, **semantic** colours, **spacing scale** for page shells, or **voice/env** contracts should update **both** `tailwind.config.js` (if tokens change) and this document.
