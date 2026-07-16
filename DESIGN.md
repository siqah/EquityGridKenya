# EquityGrid Kenya — Design System

This document serves as the single source of truth for the **EquityGrid Kenya** UI/UX design system. The styling tokens are defined in `frontend/tailwind.config.js`, and this spec describes how they are mapped and extended.

---

## 1. Design Principles

*   **Regulator / Analytical Views:** Dense, analytical layouts utilizing cool, professional neutrals combined with a `primary` navy color for administrative authority.
*   **Household / Public Views:** Spacious layouts with generous whitespace, slightly larger body text, and warmer microcopy. They use the same token colors (do not invent new ones).
*   **Accessibility First:** Maintains WCAG-compliant contrast for body text on cards, and primary text on white backgrounds. Status tier colors (`green`, `yellow`, `red`) are reserved for indicator labels and status pills—never for long blocks of text.

---

## 2. Typography Specification

| Role | Tailwind Classes | Application |
|---|---|---|
| **Page Title** | `text-base md:text-lg font-bold text-body` | Main app headers |
| **Section Title** | `text-sm font-bold text-primary` | Table headings, card subtitles |
| **Household Hero** | `text-2xl sm:text-3xl font-bold text-slate-900` | Account Overview dashboard titles |
| **Body Text** | `text-sm text-body` | Default paragraph and label text |
| **Muted Text** | `text-xs text-muted` | Footnotes, helper captions, secondary metadata |
| **Data / Mono** | `font-mono text-body` | SHA-256 account hashes, scoring logs |

*   **Font Family:** [Inter](https://fonts.google.com/specimen/Inter) (imported in `frontend/index.html` and configured as Tailwind `font-sans`).

---

## 3. Color System

Tokens are extended directly in `frontend/tailwind.config.js`:

| Token | Hex Value | Purpose |
|---|---|---|
| `primary` | `#1B3A6B` | Brand identity; headers, primary buttons, active navigation borders |
| `surface` | `#FFFFFF` | Core container background; cards, modals, dropdown lists |
| `surface-muted`| `#F9FAFB` | Soft panels; striped table rows, background layout grids |
| `border` | `#E5E7EB` | Dividers; borders for inputs, cards, and rules |
| `body` | `#111827` | Primary typography color |
| `muted` | `#6B7280` | Muted labels, secondary captions, placeholders |
| `tier-green` | `#16A34A` | GREEN target classification status (Lifeline eligible) |
| `tier-yellow`| `#D97706` | YELLOW target classification status (Standard retail terms) |
| `tier-red` | `#DC2626` | RED target classification status (Subsidy leakage / high-draw) |
| `navactive` | `#EFF6FF` | Navigation sidebar background hover, active buttons |

---

## 4. Spacing, Layout & Shapes

*   **Page Wrapper Padding:** `p-5 md:p-8` on main `PageFade` containers. Maximum content width is constrained between `max-w-[1100px]` and `max-w-[1440px]`.
*   **Card Container Padding:** `p-4` to `p-6` with standard cards (`.card` class) having `rounded-xl border border-border shadow-card`.
*   **Grid Gaps:** `gap-3` to `gap-6` for component grouping; **household-specific** report pages use `gap-8` for sections.
*   **Border Radius:** `rounded-xl` (12px) for inputs and cards; `rounded-full` for status capsules.

---

## 5. Basemaps & Visualization

*   **Basemap Selection:** Uses CARTO **Dark Matter** styling in `KenyaDeckMap.jsx`. All controls, legends, and tooltip popups use dark mode matching `slate-950` / `slate-900`.
*   **3D Extrusions:** County and heat-map layers use a **matte deck.gl material** (`shininess: 0`, zero specular) to ensure clear visualization without light streaks or specular highlights.

---

## 6. Voice & AI Integrations

To protect API secrets, access keys must **never** be shipped in the frontend client code or configured in `frontend/.env.production` for public deployments.

### Local Development Setup
For local development, keys are proxied via Vite and configured in `frontend/.env.local`:
*   `ANTHROPIC_API_KEY`: Key for Claude advisor prompts (proxied to `/anthropic`).
*   `VITE_ELEVENLABS_VOICE_ID`: Voice UUID for speech generation (safe to expose).
*   `ELEVENLABS_API_KEY` (or `VITE_ELEVENLABS_API_KEY`): xi-api-key for speech generation.

### Production Deployments
In the unified monolithic deployment (Docker/Render/Railway), the frontend directly routes speech and advisor requests through the host. To support this securely:
*   Configure `ANTHROPIC_API_KEY` and `ELEVENLABS_API_KEY` as secure env variables on your hosting provider.
*   The monolithic FastAPI gateway manages endpoint routing to the external LLM/TTS services, preventing credential leakage to the browser.
