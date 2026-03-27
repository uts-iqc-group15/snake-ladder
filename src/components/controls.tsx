import type { GameState } from '@/hooks/use-game'
import { QUBIT_CONFIGS } from '@/constants/board'
import { Dice } from '@/components/dice'

interface ControlsProps {
  state: GameState
  onRoll: () => void
  onReset: () => void
  onSelectQubit: (configIndex: number) => void
  onRandomPlace: () => void
}

export function Controls({ state, onRoll, onReset, onSelectQubit, onRandomPlace }: ControlsProps) {
  const {
    phase,
    currentPlayer,
    dice,
    message,
    isRolling,
    isCollapsing,
    gameOver,
    positions,
    selectedConfigIndex,
    setupRemaining,
  } = state

  const playerColor = currentPlayer === 0 ? 'var(--color-player-1)' : 'var(--color-player-2)'
  const playerTint =
    currentPlayer === 0 ? 'bg-[rgba(155,35,53,0.08)]' : 'bg-[rgba(44,74,124,0.08)]'

  const isPlay = phase === 'play' || phase === 'gameover'

  return (
    <div className="card-panel flex flex-col gap-4 p-5 w-full md:min-w-[280px] md:w-[280px]">
      {/* Current player */}
      <div
        className={`text-lg font-bold px-4 py-3 rounded-lg text-text ${playerTint}`}
        style={{ borderLeft: `3px solid ${playerColor}` }}
      >
        {gameOver
          ? `Player ${currentPlayer + 1} wins!`
          : phase === 'setup'
            ? `Player ${currentPlayer + 1} - Setup`
            : `Player ${currentPlayer + 1}'s Turn`}
      </div>

      {/* Setup phase: qubit selector */}
      {phase === 'setup' && (
        <div className="flex flex-col gap-2">
          <div className="text-xs text-text-secondary font-bold uppercase tracking-wider">
            Select a Qubit to Place
          </div>
          <div className="flex flex-col gap-1.5">
            {setupRemaining[currentPlayer].map((configIdx) => {
              const config = QUBIT_CONFIGS[configIdx]
              const isSelected = selectedConfigIndex === configIdx
              return (
                <button
                  key={configIdx}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-mono cursor-pointer transition-all border ${
                    isSelected
                      ? 'border-[var(--color-neon-cyan)] bg-[rgba(0,240,255,0.1)] text-[var(--color-neon-cyan)]'
                      : 'border-[var(--color-border)] bg-transparent text-text-secondary hover:bg-[var(--color-surface-hover)]'
                  }`}
                  onClick={() => onSelectQubit(configIdx)}
                >
                  <span className="text-base">{config.entangled ? '\u269B' : '\u2B50'}</span>
                  <span>
                    [{config.label}]
                    {config.entangled && (
                      <span className="ml-1 text-xs text-[var(--color-neon-yellow)]">Entangled</span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
          {selectedConfigIndex !== null && (
            <div className="text-xs text-[var(--color-neon-yellow)] mt-1">
              Click a cell (6-95) to place the qubit
            </div>
          )}
          <button
            className="mt-1 py-2 px-4 text-xs font-bold text-text-secondary rounded-[var(--radius-button)] bg-transparent border-[1.5px] border-[var(--color-border)] cursor-pointer transition-colors duration-200 hover:bg-[var(--color-surface-hover)]"
            onClick={onRandomPlace}
          >
            Random Place All
          </button>
        </div>
      )}

      {/* Play phase: dice & positions */}
      {isPlay && (
        <>
          {/* Player positions */}
          <div className="flex justify-center gap-3">
            <span className="px-3 py-1 rounded-[var(--radius-badge)] bg-player-1 text-sm font-bold text-text-inverse">
              P1: Cell {positions[0]}
            </span>
            <span className="px-3 py-1 rounded-[var(--radius-badge)] bg-player-2 text-sm font-bold text-text-inverse">
              P2: Cell {positions[1]}
            </span>
          </div>

          {/* Dice */}
          <div className="flex flex-col items-center gap-3">
            <Dice value={dice ?? 6} rolling={isRolling} />
            <div className="text-xl font-bold font-mono text-text-secondary h-7">
              {dice ? `${dice}` : '\u00A0'}
            </div>
          </div>

          {/* Roll button */}
          <button
            className="py-3 px-8 text-[0.875rem] font-bold text-text-inverse rounded-[var(--radius-button)] bg-player-1 cursor-pointer transition-all duration-150 hover:brightness-90 hover:translate-y-[-1px] hover:shadow-[var(--shadow-button)] active:translate-y-0 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
            onClick={onRoll}
            disabled={isRolling || isCollapsing || gameOver}
          >
            {isCollapsing ? 'Measuring...' : 'Roll Dice'}
          </button>
        </>
      )}

      {/* Reset button */}
      <button
        className="py-2 px-6 text-sm text-text-secondary rounded-[var(--radius-button)] bg-transparent border-[1.5px] border-[var(--color-border)] cursor-pointer transition-colors duration-200 hover:bg-[var(--color-surface-hover)]"
        onClick={onReset}
      >
        New Game
      </button>

      {/* Message */}
      <div
        className={`text-sm min-h-12 px-2 py-1 text-center leading-relaxed ${
          gameOver
            ? 'text-success font-bold'
            : message.includes('Snake')
              ? 'text-snake'
              : message.includes('Ladder')
                ? 'text-ladder'
                : message.includes('Interference') || message.includes('interference')
                  ? 'text-[var(--color-neon-cyan)]'
                  : 'text-text-secondary'
        }`}
      >
        {message || '\u00A0'}
      </div>
    </div>
  )
}
