import { useState, useCallback } from 'react'
import { TOTAL_CELLS, SNAKES, LADDERS } from '@/constants/board'

export interface GameState {
  positions: [number, number]
  currentPlayer: 0 | 1
  diceValue: number | null
  message: string
  isRolling: boolean
  gameOver: boolean
}

const INITIAL_STATE: GameState = {
  positions: [0, 0],
  currentPlayer: 0,
  diceValue: null,
  message: '',
  isRolling: false,
  gameOver: false,
}

function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

export function useGame() {
  const [state, setState] = useState<GameState>(INITIAL_STATE)

  const handleRoll = useCallback(async () => {
    setState((prev) => {
      if (prev.isRolling || prev.gameOver) return prev
      return { ...prev, isRolling: true, message: '' }
    })

    const value = rollDice()
    await sleep(400)

    setState((prev) => {
      if (!prev.isRolling) return prev

      const newPositions: [number, number] = [...prev.positions]
      const player = prev.currentPlayer
      const newPos = newPositions[player] + value

      if (newPos > TOTAL_CELLS) {
        return {
          ...prev,
          diceValue: value,
          isRolling: false,
          message: `Need exact ${TOTAL_CELLS - newPositions[player]} to win!`,
          currentPlayer: player === 0 ? 1 : 0,
        }
      }

      let finalPos = newPos
      let message = ''

      if (SNAKES[newPos]) {
        finalPos = SNAKES[newPos]
        message = `Snake! Slide down from ${newPos} to ${finalPos}`
      } else if (LADDERS[newPos]) {
        finalPos = LADDERS[newPos]
        message = `Ladder! Climb up from ${newPos} to ${finalPos}`
      }

      newPositions[player] = finalPos

      if (finalPos === TOTAL_CELLS) {
        return {
          ...prev,
          positions: newPositions,
          diceValue: value,
          isRolling: false,
          gameOver: true,
          message: `Player ${player + 1} wins!`,
        }
      }

      return {
        ...prev,
        positions: newPositions,
        diceValue: value,
        isRolling: false,
        message,
        currentPlayer: player === 0 ? 1 : 0,
      }
    })
  }, [])

  const reset = useCallback(() => {
    setState(INITIAL_STATE)
  }, [])

  return { state, handleRoll, reset }
}
