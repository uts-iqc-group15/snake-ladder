# DESIGN.md — Snake & Ladder

> **Neon Arcade** — 80s arcade neon palette meets glassmorphism UI.
> A retro board game with frosted glass panels, built as a developer portfolio piece.

---

## 1. Design Overview

### Concept

Neon color palette inspired by 80s arcade games layered over a CRT scanline texture.
Glassmorphism (frosted glass) panels float over an animated gradient background with
subtle noise and color-shifting orbs, giving the glass surfaces visible content to blur.

### Mood Keywords

`neon` · `arcade` · `glassmorphism` · `glow` · `dark`

### Target

- Developer portfolio / demo
- Tech interviewers, recruiters, developer community

### Accessibility

- WCAG 2.2 AA compliant
- Minimum contrast ratio: 4.5:1 (body text), 3:1 (large text / UI elements)
- Neon glow effects are decorative only — information is never conveyed by color alone
- Snake/ladder cells must include `aria-label` describing the effect (e.g. "Snake: slide to 12")
- `prefers-reduced-motion` support required

---

## 2. Color System

### Core Palette

| Token | Value | Role |
|---|---|---|
| `--color-bg-deep` | `#0a0a1a` | Base background (void) |
| `--color-bg-surface` | `rgba(30, 20, 60, 0.7)` | Translucent surface layer |
| `--color-bg-gradient-start` | `#0f0c29` | Background gradient start |
| `--color-bg-gradient-mid` | `#302b63` | Background gradient mid |
| `--color-bg-gradient-end` | `#24243e` | Background gradient end |

### Neon Accents

| Token | Value | Role | AA on `#0a0a1a` |
|---|---|---|---|
| `--color-neon-pink` | `#ff2d95` | Primary accent, Player 1 | 5.2:1 |
| `--color-neon-cyan` | `#00f0ff` | Secondary accent, Player 2 | 8.6:1 |
| `--color-neon-yellow` | `#ffe156` | Highlight, ladder indicator | 12.1:1 |
| `--color-neon-green` | `#39ff14` | Success state, advance | 9.8:1 |
| `--color-neon-red` | `#ff3131` | Danger state, snake indicator | 4.6:1 |

### Board Colors

| Token | Value | Role |
|---|---|---|
| `--color-board-light` | `#2a1f4e` | Board light cell |
| `--color-board-dark` | `#1a1235` | Board dark cell |
| `--color-board-border` | `rgba(255, 255, 255, 0.06)` | Cell border |

### Glass Surface

| Token | Value | Role |
|---|---|---|
| `--color-glass` | `rgba(255, 255, 255, 0.06)` | Glass background |
| `--color-glass-hover` | `rgba(255, 255, 255, 0.10)` | Glass hover state |
| `--color-glass-border` | `rgba(255, 255, 255, 0.12)` | Glass border |
| `--blur-glass` | `12px` | backdrop-filter blur |
| `--shadow-glass` | `0 8px 32px rgba(0, 0, 0, 0.4)` | Glass drop shadow |

### Semantic Colors

| Token | Value | Role |
|---|---|---|
| `--color-text-primary` | `#f0f0f0` | Primary text |
| `--color-text-secondary` | `rgba(240, 240, 240, 0.65)` | Secondary text |
| `--color-text-muted` | `rgba(240, 240, 240, 0.55)` | Muted text (cell numbers) — 4.6:1 on `#0a0a1a`, 4.5:1 on `#1a1235` |
| `--color-player-1` | `var(--color-neon-pink)` | Player 1 |
| `--color-player-2` | `var(--color-neon-cyan)` | Player 2 |
| `--color-snake` | `var(--color-neon-red)` | Snake indicator |
| `--color-ladder` | `var(--color-neon-yellow)` | Ladder indicator |
| `--color-success` | `var(--color-neon-green)` | Win / success |

---

## 3. Typography

### Font Stack

```
--font-display: 'Press Start 2P', 'Courier New', monospace;
--font-body: 'Inter', 'Segoe UI', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

- **Display** (`Press Start 2P`): Game title only. Loaded from Google Fonts.
- **Body** (`Inter`): UI text, messages, buttons. System font fallback.
- **Mono** (`JetBrains Mono`): Coordinates, numeric displays.

### Type Scale

| Name | Size | Weight | Use |
|---|---|---|---|
| `title` | `1.5rem` / `2rem` (lg) | 400 | Game title (Press Start 2P) |
| `heading` | `1.125rem` / `1.25rem` (lg) | 700 | Section headings |
| `body` | `0.875rem` / `1rem` (lg) | 400 | General text, messages |
| `caption` | `0.75rem` | 500 | Board cell numbers, coordinates |
| `label` | `0.875rem` | 700 | Buttons, badges (meets 4.5:1 at this weight) |

### Text Effects

- Title: `text-shadow: 0 0 20px var(--color-neon-pink), 0 0 40px var(--color-neon-pink)`
- Neon text: `text-shadow: 0 0 8px currentColor`
- Body text: no shadow

---

## 4. Layout

### Background Treatment

The background must include visible content behind glass panels for glassmorphism to work:

1. **Gradient base**: `linear-gradient(135deg, #0f0c29, #302b63, #24243e)`
2. **Floating orbs**: 2-3 large blurred circles (`--color-neon-pink`, `--color-neon-cyan` at 15-20% opacity, 200-400px diameter) positioned with `position: absolute` and slow CSS drift animation
3. **CRT scanlines**: repeating-linear-gradient overlay (see Section 6)

This gives glass surfaces meaningful content to blur through.

### Responsive Breakpoints

| Name | Min Width | Behavior |
|---|---|---|
| `mobile` | `320px` (default) | Vertical stack: board then controls |
| `tablet` (md) | `768px` | Horizontal: board + controls side by side |
| `desktop` (lg) | `1024px` | Wider margins, larger board |

### Board Sizing

| Breakpoint | Board Size | Cell Size |
|---|---|---|
| mobile | `min(90vw, 360px)` | auto (grid) |
| tablet | `420px` | `42px` |
| desktop | `500px` | `50px` |

### Page Layout

```
┌─────────────────────────────────────┐
│  [Title - neon glow]                │  ← top
│                                     │
│  ┌──────────────┐  ┌───────────┐   │
│  │              │  │ Glass     │   │  ← md+: flex-row
│  │  Board       │  │ Panel     │   │
│  │  10 x 10     │  │           │   │
│  │              │  │ - Player  │   │
│  │              │  │ - Dice    │   │
│  │              │  │ - Roll    │   │
│  │              │  │ - Message │   │
│  └──────────────┘  └───────────┘   │
│                                     │
└─────────────────────────────────────┘
       ↑ mobile: flex-col, board first
```

### Glass Panel Recipe

```css
/* Apply to controls panel and any overlay surfaces */
.glass-panel {
  background: var(--color-glass);
  backdrop-filter: blur(var(--blur-glass));
  -webkit-backdrop-filter: blur(var(--blur-glass));
  border: 1px solid var(--color-glass-border);
  border-radius: 16px;
  box-shadow: var(--shadow-glass);
}
```

---

## 5. Components

### 5.1 Board (`board.tsx`)

- 10x10 CSS Grid
- Checkerboard pattern: `--color-board-light` / `--color-board-dark`
- Cell borders: `1px solid var(--color-board-border)`
- Board outer: `border-radius: 12px`, `overflow: hidden`
- Snake cells: icon + `box-shadow: inset 0 0 8px var(--color-snake)` + `aria-label="Snake: slide to {N}"`
- Ladder cells: icon + `box-shadow: inset 0 0 8px var(--color-ladder)` + `aria-label="Ladder: climb to {N}"`
- Cell numbers: `caption` size, `--color-text-muted`

### 5.2 Player Token

- Circle token: `24px` (mobile) / `28px` (desktop)
- P1: `--color-player-1` background + neon glow shadow
  - `box-shadow: 0 0 8px var(--color-player-1), 0 0 16px var(--color-player-1)`
- P2: `--color-player-2` background + neon glow shadow
  - `box-shadow: 0 0 8px var(--color-player-2), 0 0 16px var(--color-player-2)`
- Inner number text: `#fff`, `caption` size, bold

### 5.3 Controls Panel (`controls.tsx`)

- Glass panel (apply glass-panel recipe)
- Inner layout: `flex-col`, `gap: 1rem`
- `min-width: 220px` (desktop), `width: 100%` (mobile)

### 5.4 Current Player Display

- Sub-panel inside glass
- Player color border: `border-left: 3px solid var(--color-player-{1|2})`
- Text: `heading` size, current player color neon glow

### 5.5 Dice

- Two dice displayed side by side
- Size: `3.5rem` (mobile) / `4rem` (desktop)
- Unicode dice characters (U+2680 ~ U+2685)
- Glow: `text-shadow: 0 0 12px var(--color-neon-yellow)`
- Rolling animation: rotate + scale (see Section 6)

### 5.6 Roll Button

- `padding: 0.75rem 2rem`
- Background: `linear-gradient(135deg, #c4006e, #0098a8)` (darkened for 4.5:1 white text contrast)
- Glow: `box-shadow: var(--shadow-neon-pink)`
- Hover: intensified glow + `translateY(-2px)`
- Disabled: `opacity: 0.4`, no glow, `cursor: not-allowed`
- Disabled conditions: during dice roll animation, after game over
- `border-radius: 8px`, `font-weight: 700`

### 5.7 Reset Button

- Outline style: `border: 1.5px solid var(--color-glass-border)`
- Background: `transparent`
- Hover: `var(--color-glass-hover)`
- During active game: shows confirmation prompt before resetting

### 5.8 Message Area

- Snake/ladder event text: `--color-neon-yellow` + neon glow
- Win message: `--color-success` + neon glow
- Min height: `2rem` to prevent layout shift
- `body` size, center aligned

---

## 6. Motion & Animation

### Dice Roll

```css
@keyframes dice-roll {
  0%   { transform: rotate(0deg) scale(1); }
  25%  { transform: rotate(90deg) scale(1.15); }
  50%  { transform: rotate(180deg) scale(1); }
  75%  { transform: rotate(270deg) scale(1.15); }
  100% { transform: rotate(360deg) scale(1); }
}
/* duration: 0.4s, easing: ease-in-out */
```

### Neon Pulse (Title)

```css
@keyframes neon-pulse {
  0%, 100% { text-shadow: 0 0 20px var(--color-neon-pink), 0 0 40px var(--color-neon-pink); }
  50%      { text-shadow: 0 0 10px var(--color-neon-pink), 0 0 20px var(--color-neon-pink); }
}
/* duration: 2s, infinite */
```

### Player Move

```css
@keyframes token-move {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.3); }
  100% { transform: scale(1); }
}
/* duration: 0.3s, ease-out — plays once on move */
```

### Background Orb Drift

```css
@keyframes orb-drift {
  0%   { transform: translate(0, 0); }
  50%  { transform: translate(30px, -20px); }
  100% { transform: translate(0, 0); }
}
/* duration: 8-12s, infinite, ease-in-out */
```

### CRT Scanlines (Background Decoration)

```css
.scanlines::after {
  content: '';
  position: fixed;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.03) 2px,
    rgba(0, 0, 0, 0.03) 4px
  );
  pointer-events: none;
  z-index: 9999;
}
```

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

Define tokens via Tailwind v4 `@theme` directive:

```css
/* src/index.css */
@import "tailwindcss";

@theme {
  /* Background */
  --color-bg-deep: #0a0a1a;
  --color-bg-surface: rgba(30, 20, 60, 0.7);

  /* Neon */
  --color-neon-pink: #ff2d95;
  --color-neon-cyan: #00f0ff;
  --color-neon-yellow: #ffe156;
  --color-neon-green: #39ff14;
  --color-neon-red: #ff3131;

  /* Board */
  --color-board-light: #2a1f4e;
  --color-board-dark: #1a1235;

  /* Glass */
  --color-glass: rgba(255, 255, 255, 0.06);
  --color-glass-hover: rgba(255, 255, 255, 0.10);
  --color-glass-border: rgba(255, 255, 255, 0.12);

  /* Text */
  --color-text-primary: #f0f0f0;
  --color-text-secondary: rgba(240, 240, 240, 0.65);
  --color-text-muted: rgba(240, 240, 240, 0.55);

  /* Semantic */
  --color-player-1: var(--color-neon-pink);
  --color-player-2: var(--color-neon-cyan);
  --color-snake: var(--color-neon-red);
  --color-ladder: var(--color-neon-yellow);
  --color-success: var(--color-neon-green);

  /* Font Family */
  --font-display: 'Press Start 2P', 'Courier New', monospace;
  --font-body: 'Inter', 'Segoe UI', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* Shadows */
  --shadow-glass: 0 8px 32px rgba(0, 0, 0, 0.4);
  --shadow-neon-pink: 0 0 20px rgba(255, 45, 149, 0.4);
  --shadow-neon-cyan: 0 0 20px rgba(0, 240, 255, 0.4);

  /* Blur */
  --blur-glass: 12px;

  /* Border Radius */
  --radius-board: 12px;
  --radius-panel: 16px;
  --radius-button: 8px;
  --radius-badge: 20px;
  --radius-token: 9999px;
}
```

---

## 8. File Naming Convention

All source files use **kebab-case**:

```
src/
  app.tsx
  main.tsx
  components/
    board.tsx
    controls.tsx
  hooks/
    use-game.ts
  constants/
    board.ts
```
