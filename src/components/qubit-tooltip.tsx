import type { QubitConfig } from '@/constants/board'
import { QubitIcon } from '@/components/qubit-icon'

export function ProbabilityBar({
  label,
  pct,
  color,
}: {
  label: string
  pct: number
  color: string
}) {
  return (
    <div className="flex items-center gap-2 text-[0.7rem]">
      <span className="w-12 text-text-secondary">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-[var(--color-border-subtle)] overflow-hidden">
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="w-9 text-right font-mono font-bold">{pct}%</span>
    </div>
  )
}

export function QubitTooltipBody({ config }: { config: QubitConfig }) {
  const ladderPct = Math.round(config.ladderProb * 100)
  const snakePct = Math.round(config.snakeProb * 100)
  return (
    <div className="flex flex-col gap-1.5 min-w-[160px]">
      <div className="flex items-center gap-1.5 font-bold">
        <QubitIcon entangled={config.entangled} />
        <span>Qubit [{config.label}]</span>
        {config.entangled && (
          <span className="text-[var(--color-neon-yellow)] text-[0.65rem] font-mono">
            ENTANGLED
          </span>
        )}
      </div>
      <ProbabilityBar label="Ladder" pct={ladderPct} color="var(--color-ladder)" />
      <ProbabilityBar label="Snake" pct={snakePct} color="var(--color-snake)" />
    </div>
  )
}
