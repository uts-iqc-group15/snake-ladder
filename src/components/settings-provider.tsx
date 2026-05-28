import type { ReactNode } from 'react'
import { useLocalStorageState } from 'ahooks'
import {
  DEFAULT_SETTINGS,
  resolveTimings,
  SettingsContext,
  type Settings,
} from '@/lib/settings'

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useLocalStorageState<Partial<Settings>>(
    'snake-ladder:settings',
    { defaultValue: DEFAULT_SETTINGS },
  )
  // Merge with defaults so settings added in later versions get sensible
  // fallbacks even when older shapes are still cached locally.
  const settings: Settings = { ...DEFAULT_SETTINGS, ...(stored ?? {}) }
  const timings = resolveTimings(settings)

  return (
    <SettingsContext.Provider
      value={{
        settings,
        setSettings: (next) => setStored(next),
        timings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}
