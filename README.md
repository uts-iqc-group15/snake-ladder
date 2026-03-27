# Snake & Ladder

A quantum-powered Snake & Ladder board game built with React, TypeScript, and Vite.

## Prerequisites

- [Bun](https://bun.sh) (v1.3+)

### Install Bun

```bash
# macOS / Linux
curl -fsSL https://bun.sh/install | bash

# Windows (via PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"

# Or via Homebrew
brew install oven-sh/bun/bun
```

## Getting Started

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Open http://localhost:5173
```

## Scripts

| Command              | Description                  |
| -------------------- | ---------------------------- |
| `bun run dev`        | Start development server     |
| `bun run build`      | Type-check and build for production |
| `bun run preview`    | Preview production build     |
| `bun run lint`       | Run ESLint                   |
| `bun run typecheck`  | Run TypeScript type checking |
| `bun run test`       | Run unit tests               |
| `bun run test:watch` | Run tests in watch mode      |
| `bun run test:coverage` | Run tests with coverage   |

## Tech Stack

- **Runtime**: Bun
- **Framework**: React 19
- **Language**: TypeScript 6
- **Bundler**: Vite 8
- **Testing**: Vitest + React Testing Library
- **Linting**: ESLint 9 (flat config)
- **Git Hooks**: Husky + lint-staged
