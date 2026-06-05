import { createContext, useContext } from 'react'

export type MovementSpeed = 'slow' | 'normal' | 'fast'
export type DiceSpeed = 'slow' | 'normal' | 'fast'

export interface Settings {
  movementSpeed: MovementSpeed
  diceSpeed: DiceSpeed
}

export const DEFAULT_SETTINGS: Settings = {
  movementSpeed: 'normal',
  diceSpeed: 'normal',
}

const MOVEMENT_HOP_MS: Record<MovementSpeed, number> = {
  slow: 240,
  normal: 140,
  fast: 70,
}

const MOVEMENT_LADDER_STEP_MS: Record<MovementSpeed, number> = {
  slow: 130,
  normal: 70,
  fast: 35,
}

const MOVEMENT_SNAKE_STEP_MS: Record<MovementSpeed, number> = {
  slow: 110,
  normal: 60,
  fast: 30,
}

const DICE_DURATION_MS: Record<DiceSpeed, number> = {
  slow: 1400,
  normal: 800,
  fast: 350,
}

export interface ResolvedTimings {
  hopMs: number
  ladderStepMs: number
  snakeStepMs: number
  diceDurationMs: number
}

export function resolveTimings(settings: Settings): ResolvedTimings {
  return {
    hopMs: MOVEMENT_HOP_MS[settings.movementSpeed],
    ladderStepMs: MOVEMENT_LADDER_STEP_MS[settings.movementSpeed],
    snakeStepMs: MOVEMENT_SNAKE_STEP_MS[settings.movementSpeed],
    diceDurationMs: DICE_DURATION_MS[settings.diceSpeed],
  }
}

export interface SettingsContextValue {
  settings: Settings
  setSettings: (next: Settings) => void
  timings: ResolvedTimings
}

export const SettingsContext = createContext<SettingsContextValue | null>(null)

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) {
    return {
      settings: DEFAULT_SETTINGS,
      setSettings: () => {},
      timings: resolveTimings(DEFAULT_SETTINGS),
    }
  }
  return ctx
}
