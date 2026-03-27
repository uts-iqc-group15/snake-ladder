import type { GameState } from '@/hooks/useGame'
import styles from './Controls.module.css'

const DICE_FACES = ['\u2680', '\u2681', '\u2682', '\u2683', '\u2684', '\u2685']

interface ControlsProps {
  state: GameState
  onRoll: () => void
  onReset: () => void
}

export function Controls({ state, onRoll, onReset }: ControlsProps) {
  const { positions, currentPlayer, diceValue, message, isRolling, gameOver } = state

  return (
    <div className={styles.controls}>
      <div className={styles.currentPlayer} data-player={currentPlayer}>
        {gameOver ? `Player ${currentPlayer + 1} wins!` : `Player ${currentPlayer + 1}'s Turn`}
      </div>

      <div className={styles.positions}>
        <span className={styles.p1Badge}>P1: {positions[0]}</span>
        <span className={styles.p2Badge}>P2: {positions[1]}</span>
      </div>

      <div className={styles.diceArea}>
        <div className={`${styles.dice} ${isRolling ? styles.rolling : ''}`}>
          {diceValue ? DICE_FACES[diceValue - 1] : '\uD83C\uDFB2'}
        </div>
        {diceValue && <div className={styles.diceResult}>{diceValue}</div>}
      </div>

      <button
        className={styles.rollBtn}
        onClick={onRoll}
        disabled={isRolling || gameOver}
      >
        Roll Dice
      </button>

      <button className={styles.resetBtn} onClick={onReset}>
        New Game
      </button>

      {message && <div className={styles.message}>{message}</div>}
    </div>
  )
}
