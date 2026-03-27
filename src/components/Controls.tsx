import type { GameState } from '@/hooks/use-game'

const DICE_FACES = ['\u2680', '\u2681', '\u2682', '\u2683', '\u2684', '\u2685']

interface ControlsProps {
  state: GameState
  onRoll: () => void
  onReset: () => void
}

export function Controls({ state, onRoll, onReset }: ControlsProps) {
  const { positions, currentPlayer, dice, message, isRolling, gameOver } = state

  const playerColor = currentPlayer === 0 ? 'var(--color-player-1)' : 'var(--color-player-2)'

  return (
    <div className="glass-panel flex flex-col gap-4 p-5 w-full md:min-w-[220px] md:w-auto">
      {/* Current player */}
      <div
        className="text-lg font-bold px-4 py-3 rounded-lg bg-[rgba(255,255,255,0.04)]"
        style={{
          borderLeft: `3px solid ${playerColor}`,
          textShadow: `0 0 8px ${playerColor}`,
        }}
      >
        {gameOver ? `Player ${currentPlayer + 1} wins!` : `Player ${currentPlayer + 1}'s Turn`}
      </div>

      {/* Player positions */}
      <div className="flex justify-center gap-3">
        <span className="px-3 py-1 rounded-[var(--radius-badge)] bg-player-1 text-sm font-bold text-white">
          P1: ({positions[0].col}, {positions[0].row})
        </span>
        <span className="px-3 py-1 rounded-[var(--radius-badge)] bg-player-2 text-sm font-bold text-white">
          P2: ({positions[1].col}, {positions[1].row})
        </span>
      </div>

      {/* Dice */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-2">
          <div
            className={`text-[3.5rem] lg:text-[4rem] select-none ${isRolling ? 'animate-dice-roll' : ''}`}
            style={{ textShadow: '0 0 12px var(--color-neon-yellow)' }}
          >
            {dice ? DICE_FACES[dice[0] - 1] : '\uD83C\uDFB2'}
          </div>
          <div
            className={`text-[3.5rem] lg:text-[4rem] select-none ${isRolling ? 'animate-dice-roll' : ''}`}
            style={{ textShadow: '0 0 12px var(--color-neon-yellow)' }}
          >
            {dice ? DICE_FACES[dice[1] - 1] : '\uD83C\uDFB2'}
          </div>
        </div>
        {dice && (
          <div className="text-2xl font-bold font-mono text-text-secondary">
            ({dice[0]}, {dice[1]})
          </div>
        )}
      </div>

      {/* Roll button */}
      <button
        className="py-3 px-8 text-[0.875rem] font-bold text-white rounded-[var(--radius-button)] bg-linear-to-br from-[#c4006e] to-[#0098a8] shadow-[var(--shadow-neon-pink)] cursor-pointer transition-all duration-150 hover:translate-y-[-2px] hover:shadow-[0_0_30px_rgba(255,45,149,0.6)] active:translate-y-0 disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed disabled:translate-y-0"
        onClick={onRoll}
        disabled={isRolling || gameOver}
      >
        Roll Dice
      </button>

      {/* Reset button */}
      <button
        className="py-2 px-6 text-sm text-white rounded-[var(--radius-button)] bg-transparent border-[1.5px] border-[var(--color-glass-border)] cursor-pointer transition-colors duration-200 hover:bg-[var(--color-glass-hover)]"
        onClick={onReset}
      >
        New Game
      </button>

      {/* Message */}
      {message && (
        <div
          className="text-sm min-h-8 px-2 py-1 text-center leading-relaxed"
          style={{
            color: gameOver ? 'var(--color-success)' : 'var(--color-neon-yellow)',
            textShadow: `0 0 8px ${gameOver ? 'var(--color-success)' : 'var(--color-neon-yellow)'}`,
          }}
        >
          {message}
        </div>
      )}
    </div>
  )
}
