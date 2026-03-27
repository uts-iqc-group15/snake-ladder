import { useState, useCallback } from 'react'
import {
  BOARD_SIZE,
  SNAKES,
  LADDERS,
  X_VECTOR_TABLE,
  Y_VECTOR_MATRIX,
  cellToCoord,
  coordToCell,
  clamp,
} from '@/constants/board'
import type { Coord } from '@/constants/board'

export interface GameState {
  positions: [Coord, Coord]
  currentPlayer: 0 | 1
  dice: [number, number] | null
  message: string
  isRolling: boolean
  gameOver: boolean
}

const START: Coord = { col: 0, row: 0 }

const INITIAL_STATE: GameState = {
  positions: [{ ...START }, { ...START }],
  currentPlayer: 0,
  dice: null,
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

    const dice1 = rollDice()
    const dice2 = rollDice()
    await sleep(400)

    setState((prev) => {
      if (!prev.isRolling) return prev

      const player = prev.currentPlayer
      const pos = prev.positions[player]

      const xVector = X_VECTOR_TABLE[dice1]
      const dx = xVector.magnitude * xVector.direction
      const dy = Y_VECTOR_MATRIX[dice1 - 1][dice2 - 1]

      const newCol = clamp(pos.col + dx, 0, BOARD_SIZE - 1)
      const newRow = clamp(pos.row + dy, 0, BOARD_SIZE - 1)

      const cell = coordToCell(newCol, newRow)
      let message = `Rolled (${dice1}, ${dice2}) → X:${dx > 0 ? '+' : ''}${dx}, Y:+${dy}`

      let finalCol = newCol
      let finalRow = newRow

      if (SNAKES[cell]) {
        const target = cellToCoord(SNAKES[cell])
        finalCol = target.col
        finalRow = target.row
        message += ` | Snake! ${cell} → ${SNAKES[cell]}`
      } else if (LADDERS[cell]) {
        const target = cellToCoord(LADDERS[cell])
        finalCol = target.col
        finalRow = target.row
        message += ` | Ladder! ${cell} → ${LADDERS[cell]}`
      }

      const newPositions: [Coord, Coord] = [...prev.positions]
      newPositions[player] = { col: finalCol, row: finalRow }

      const finalCell = coordToCell(finalCol, finalRow)
      if (finalCell === 100) {
        return {
          ...prev,
          positions: newPositions,
          dice: [dice1, dice2] as [number, number],
          isRolling: false,
          gameOver: true,
          message: `Player ${player + 1} wins! ${message}`,
        }
      }

      return {
        ...prev,
        positions: newPositions,
        dice: [dice1, dice2] as [number, number],
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
