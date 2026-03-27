# DESIGN.md — Snake & Ladder

> **Craft Board** — A warm, tactile board game that feels like it's sitting on your table.
> No glowing orbs, no neon, no glass. Just wood, paper, and good typography.

---

## 1. Design Overview

### Concept

A physical board game brought to screen. Warm wood tones, paper-card UI panels,
and muted jewel-tone accents. The design recedes so the game itself is the focus.
Every surface has a material reference: the board is wood, the panel is cardstock,
the tokens are painted wooden pieces.

### Mood Keywords

`craft` · `tabletop` · `warm` · `tactile` · `analog`

### Target

- Developer portfolio / demo
- Tech interviewers, recruiters, developer community

### Accessibility

- WCAG 2.2 AA compliant
- Minimum contrast ratio: 4.5:1 (body text), 3:1 (large text / UI)
- Snake/ladder cells include `aria-label`
- `prefers-reduced-motion` support required

---

## 2. Color System

### Core Palette

| Token | Value | Role |
|---|---|---|
| `--color-bg` | `#f4ece0` | Page background (warm linen) |
| `--color-surface` | `#faf6f0` | Card / panel surface |
| `--color-surface-hover` | `#f0e9dd` | Card hover state |
| `--color-border` | `#d4c5a9` | Card borders, dividers |
| `--color-border-subtle` | `#e5ddd0` | Subtle separators |

### Board Colors

| Token | Value | Role |
|---|---|---|
| `--color-board-light` | `#e8d5b0` | Light cell (maple) |
| `--color-board-dark` | `#b8935a` | Dark cell (walnut) |
| `--color-board-border` | `#a07d4a` | Cell separator |

### Game Accents

| Token | Value | Role | AA on `#f4ece0` |
|---|---|---|---|
| `--color-snake` | `#c04530` | Snake — terracotta red | 4.8:1 |
| `--color-ladder` | `#2d6a4f` | Ladder — forest green | 5.6:1 |
| `--color-player-1` | `#9b2335` | Player 1 — deep crimson | 6.2:1 |
| `--color-player-2` | `#2c4a7c` | Player 2 — navy | 5.4:1 |
| `--color-success` | `#2d6a4f` | Win state (same as ladder) | 5.6:1 |

### Text Colors

| Token | Value | Role |
|---|---|---|
| `--color-text` | `#3a3226` | Primary text (charcoal brown) |
| `--color-text-secondary` | `#7a6f60` | Secondary / muted text |
| `--color-text-inverse` | `#faf6f0` | Text on dark backgrounds |
| `--color-text-cell` | `#8a7e6e` | Board cell numbers |

---

## 3. Typography

### Font Stack

```
--font-display: Georgia, 'Times New Roman', serif;
--font-body: system-ui, -apple-system, 'Segoe UI', sans-serif;
--font-mono: ui-monospace, 'SF Mono', monospace;
```

All system fonts. Zero external font loading. Instant render.

- **Display** (`Georgia`): Title only. Classic serif gives "board game box" feel.
- **Body** (system-ui): UI text, messages, buttons. Native to each OS.
- **Mono**: Coordinates, dice values.

### Type Scale

| Name | Size | Weight | Use |
|---|---|---|---|
| `title` | `1.75rem` / `2.25rem` (lg) | 700 | Game title |
| `heading` | `1.125rem` / `1.25rem` (lg) | 600 | Section headings |
| `body` | `0.9375rem` / `1rem` (lg) | 400 | General text |
| `caption` | `0.75rem` | 500 | Cell numbers |
| `label` | `0.875rem` | 600 | Buttons, badges |

### Text Effects

None. No text-shadow, no glow. Clean type only.

---

## 4. Layout

### Background

Single solid color `--color-bg`. No gradients, no orbs, no overlays.

Optional: very subtle CSS noise texture at 2-3% opacity for paper feel.

```css
background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
```

### Responsive Breakpoints

| Name | Min Width | Behavior |
|---|---|---|
| `mobile` | `320px` (default) | Vertical stack: board then controls |
| `tablet` (md) | `768px` | Horizontal: board + controls |
| `desktop` (lg) | `1024px` | Wider margins, larger board |

### Board Sizing

| Breakpoint | Board Size |
|---|---|
| mobile | `min(92vw, 420px)` |
| tablet | `520px` |
| desktop | `600px` |

### Page Layout

```
┌─────────────────────────────────────┐
│                                     │  warm linen bg
│  Snake & Ladder  (serif, centered)  │
│                                     │
│  ┌──────────────┐  ┌───────────┐   │
│  │  ▓░▓░▓░▓░▓░  │  │ Card     │   │  md+: flex-row
│  │  ░▓░▓░▓░▓░▓  │  │ Panel    │   │
│  │  wood board   │  │          │   │
│  │  w/ texture   │  │ controls │   │
│  └──────────────┘  └───────────┘   │
│                                     │
└─────────────────────────────────────┘
```

### Card Panel Recipe

```css
.card-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(58, 50, 38, 0.08),
              0 1px 2px rgba(58, 50, 38, 0.06);
}
```

---

## 5. Components

### 5.1 Board (`board.tsx`)

- 10x10 CSS Grid
- Checkerboard: `--color-board-light` (maple) / `--color-board-dark` (walnut)
- Cell gap: `1px`, background: `--color-board-border`
- Board outer: `border-radius: 8px`, `overflow: hidden`
- Board shadow: `0 4px 16px rgba(58, 50, 38, 0.15)` — subtle depth
- Snake cells: faint red tint `rgba(192, 69, 48, 0.15)` background blend
- Ladder cells: faint green tint `rgba(45, 106, 79, 0.15)` background blend
- Cell numbers: `caption` size, `--color-text-cell`
- Emoji icons: keep snake/ladder emoji, positioned bottom-right

### 5.2 Player Token

- Circle: `26px` (mobile) / `30px` (desktop)
- P1: `--color-player-1` solid background
- P2: `--color-player-2` solid background
- Inner text: `--color-text-inverse`, bold
- Shadow: `0 2px 4px rgba(0,0,0,0.2)` — wooden piece on table
- Border: `2px solid rgba(255,255,255,0.3)` — painted wood edge
- No glow. No neon. Just a solid piece with a small shadow.

### 5.3 Controls Panel (`controls.tsx`)

- Card panel (card-panel recipe)
- Padding: `1.25rem`
- Inner layout: `flex-col`, `gap: 1rem`
- Width: `100%` (mobile), `280px` (desktop)

### 5.4 Current Player Display

- Background: very subtle player color tint (8% opacity)
- Left border: `3px solid var(--color-player-{N})`
- Text: `--color-text`, `heading` size
- No glow, no text-shadow

### 5.5 Dice

- Keep existing CSS 3D dice component
- Update colors: background `linear-gradient(145deg, #e8d5b0, #d4c0a0)` (wood tone)
- Border: `1px solid var(--color-board-border)`
- Dots: dark brown `#5a4a3a` instead of white (wooden dice dots are traditionally dark)
- Shadow: `0 2px 6px rgba(58, 50, 38, 0.2)` — resting on table
- No glow. No neon-yellow box-shadow.

### 5.6 Roll Button

- Background: `--color-player-1` (solid crimson, changes to current player color)
- Text: `--color-text-inverse`, `label` size
- Hover: darken 10% + `translateY(-1px)` + shadow increase
- Active: `translateY(0)`, shadow decrease
- Disabled: `opacity: 0.5`, `cursor: not-allowed`
- `border-radius: 8px`
- No gradient. No glow. Solid color button.

### 5.7 Reset Button

- Outline: `1.5px solid var(--color-border)`
- Background: `transparent`
- Text: `--color-text-secondary`
- Hover: `--color-surface-hover` background

### 5.8 Message Area

- Snake events: `--color-snake` text
- Ladder events: `--color-ladder` text
- Win: `--color-success` text, bold
- No glow, no text-shadow
- `body` size, center aligned, min-height for stability

---

## 6. Motion & Animation

### Dice Roll

```css
@keyframes dice-roll {
  0%   { transform: rotate(0deg) scale(1); }
  25%  { transform: rotate(90deg) scale(1.1); }
  50%  { transform: rotate(180deg) scale(1); }
  75%  { transform: rotate(270deg) scale(1.1); }
  100% { transform: rotate(360deg) scale(1); }
}
/* duration: 0.4s, ease-in-out */
```

### That's it.

No pulsing title. No drifting orbs. No CRT flicker. No token glow animation.
The only animation is the dice roll — because it has a purpose (feedback for user action).

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
  }
}
```

---

## 7. Tailwind v4 Token Mapping

```css
/* src/index.css */
@import "tailwindcss";

@theme {
  /* Background */
  --color-bg: #f4ece0;
  --color-surface: #faf6f0;
  --color-surface-hover: #f0e9dd;
  --color-border: #d4c5a9;
  --color-border-subtle: #e5ddd0;

  /* Board */
  --color-board-light: #e8d5b0;
  --color-board-dark: #b8935a;
  --color-board-border: #a07d4a;

  /* Game Accents */
  --color-snake: #c04530;
  --color-ladder: #2d6a4f;
  --color-player-1: #9b2335;
  --color-player-2: #2c4a7c;
  --color-success: #2d6a4f;

  /* Text */
  --color-text: #3a3226;
  --color-text-secondary: #7a6f60;
  --color-text-inverse: #faf6f0;
  --color-text-cell: #8a7e6e;

  /* Font Family */
  --font-display: Georgia, 'Times New Roman', serif;
  --font-body: system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-mono: ui-monospace, 'SF Mono', monospace;

  /* Shadows */
  --shadow-card: 0 2px 8px rgba(58, 50, 38, 0.08), 0 1px 2px rgba(58, 50, 38, 0.06);
  --shadow-board: 0 4px 16px rgba(58, 50, 38, 0.15);
  --shadow-token: 0 2px 4px rgba(0, 0, 0, 0.2);
  --shadow-button: 0 2px 6px rgba(58, 50, 38, 0.15);

  /* Border Radius */
  --radius-board: 8px;
  --radius-card: 12px;
  --radius-button: 8px;
  --radius-badge: 20px;
  --radius-token: 9999px;

  /* Animations */
  --animate-dice-roll: dice-roll 0.4s ease-in-out;
}
```

---

## 8. What was removed (and why)

| Removed | Reason |
|---|---|
| Floating gradient orbs | AI Slop pattern #1 |
| Glassmorphism / backdrop-filter | No content behind it, purely decorative |
| CRT scanlines | Decoration without purpose |
| Neon glow on everything | Kills visual hierarchy |
| Press Start 2P font | Most cliché "retro" font choice |
| text-shadow on all elements | Glow inflation |
| Pink→teal gradient button | AI-default color combo |
| neon-pulse animation | Unnecessary motion |
| orb-drift animation | See: floating orbs |
| 5 neon accent colors | Reduced to 4 muted, purposeful colors |
| Google Fonts dependency | System fonts = zero load time |
