import { useSettings, type MovementSpeed, type DiceSpeed } from '@/lib/settings'
import { useDebugMode } from '@/hooks/use-debug-mode'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

const MOVEMENT_OPTIONS: { value: MovementSpeed; label: string; hint: string }[] = [
  { value: 'slow', label: 'Slow', hint: 'Easier to follow' },
  { value: 'normal', label: 'Normal', hint: 'Default pace' },
  { value: 'fast', label: 'Fast', hint: 'Quick games' },
]

const DICE_OPTIONS: { value: DiceSpeed; label: string; hint: string }[] = [
  { value: 'slow', label: 'Slow', hint: 'Dramatic roll' },
  { value: 'normal', label: 'Normal', hint: 'Balanced' },
  { value: 'fast', label: 'Fast', hint: 'Snappy' },
]

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { settings, setSettings } = useSettings()
  const debug = useDebugMode()

  if (!open) return null

  const tunnelPercent = Math.round(settings.tunnelProbability * 100)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.75)] cursor-pointer"
      onClick={onClose}
    >
      <div
        className="flex flex-col gap-6 p-8 card-panel max-w-md w-[min(90vw,28rem)] cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-bold text-text">Settings</h2>
          <button
            className="text-text-secondary hover:text-text cursor-pointer text-2xl leading-none"
            onClick={onClose}
            aria-label="Close settings"
          >
            &times;
          </button>
        </div>

        <SettingGroup
          label="Player movement speed"
          description="How fast tokens hop and slide along the board."
          value={settings.movementSpeed}
          options={MOVEMENT_OPTIONS}
          onChange={(v) => setSettings({ ...settings, movementSpeed: v })}
        />

        <SettingGroup
          label="Dice roll duration"
          description="How long the dice spins before revealing its face."
          value={settings.diceSpeed}
          options={DICE_OPTIONS}
          onChange={(v) => setSettings({ ...settings, diceSpeed: v })}
        />

        {debug && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-text">
                Tunnel probability
                <span className="ml-2 text-[0.65rem] font-mono uppercase tracking-wider text-[var(--color-neon-yellow)]">
                  debug
                </span>
              </div>
              <div className="text-sm font-mono text-[var(--color-neon-cyan)]">
                {tunnelPercent}%
              </div>
            </div>
            <div className="text-xs text-text-secondary">
              Chance to phase one square past the opponent when you land on
              their cell. Only applied while debug mode (<span className="font-mono">?d=1</span>) is on —
              normal play stays at the 10% default.
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={tunnelPercent}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  tunnelProbability: Number(e.target.value) / 100,
                })
              }
              className="w-full accent-[var(--color-neon-cyan)] cursor-pointer"
              aria-label="Tunnel probability percent"
            />
            <div className="flex justify-between text-[0.65rem] font-mono text-text-secondary">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        )}

        <div className="text-xs text-text-secondary">
          Settings are saved on this device.
        </div>
      </div>
    </div>
  )
}

interface SettingGroupProps<T extends string> {
  label: string
  description: string
  value: T
  options: { value: T; label: string; hint: string }[]
  onChange: (value: T) => void
}

function SettingGroup<T extends string>({
  label,
  description,
  value,
  options,
  onChange,
}: SettingGroupProps<T>) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-bold text-text">{label}</div>
      <div className="text-xs text-text-secondary">{description}</div>
      <div className="grid grid-cols-3 gap-2 mt-1">
        {options.map((opt) => {
          const active = opt.value === value
          return (
            <button
              key={opt.value}
              className={`py-2 px-2 text-xs font-bold rounded-[var(--radius-button)] border cursor-pointer transition-all ${
                active
                  ? 'bg-[rgba(0,240,255,0.1)] border-[var(--color-neon-cyan)] text-[var(--color-neon-cyan)]'
                  : 'bg-transparent border-[var(--color-border)] text-text-secondary hover:bg-[var(--color-surface-hover)]'
              }`}
              onClick={() => onChange(opt.value)}
            >
              <div>{opt.label}</div>
              <div className="text-[0.65rem] font-normal opacity-80 mt-0.5">{opt.hint}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
