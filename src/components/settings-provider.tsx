import type { ReactNode } from 'react'
import { useLocalStorageState } from 'ahooks'
import {
  DEFAULT_SETTINGS,
  resolveTimings,
  SettingsContext,
  type Settings,
} from '@/lib/settings'

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useLocalStorageState<Settings>('snake-ladder:settings', {
    defaultValue: DEFAULT_SETTINGS,
  })
  const settings = stored ?? DEFAULT_SETTINGS
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
