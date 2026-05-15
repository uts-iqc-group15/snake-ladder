import type { Dispatch, SetStateAction } from 'react'
import { useMemoizedFn } from 'ahooks'
import {
  PLACEMENT_MAX,
  PLACEMENT_MIN,
  isValidPlacement,
} from '@/constants/board'
import { linkEntangledQubits, nextQubitId } from '@/lib/game-helpers'
import type { GamePhase, GameState, PlacedQubit } from '@/types/game'

export interface SetupActions {
  selectQubit: (configIndex: number) => void
  placeQubit: (cell: number) => void
  randomPlaceAll: (maxCell?: number) => void
  confirmPass: () => void
}

export function useSetup(
  setState: Dispatch<SetStateAction<GameState>>,
): SetupActions {
  const selectQubit = useMemoizedFn((configIndex: number) => {
    setState((prev) => {
      if (prev.phase !== 'setup') return prev
      if (!prev.setupRemaining[prev.currentPlayer].includes(configIndex)) return prev
      return { ...prev, selectedConfigIndex: configIndex }
    })
  })

  const placeQubit = useMemoizedFn((cell: number) => {
    setState((prev) => {
      if (prev.phase !== 'setup' || prev.selectedConfigIndex === null) return prev

      const occupiedCells = prev.qubits.map((q) => q.cell)
      if (!isValidPlacement(cell, occupiedCells)) return prev

      const player = prev.currentPlayer
      const configIndex = prev.selectedConfigIndex

      const newQubit: PlacedQubit = {
        id: nextQubitId(),
        cell,
        owner: player,
        configIndex,
        collapsed: null,
      }

      const newRemaining: [number[], number[]] = [
        [...prev.setupRemaining[0]],
        [...prev.setupRemaining[1]],
      ]
      const idx = newRemaining[player].indexOf(configIndex)
      newRemaining[player].splice(idx, 1)

      const newQubits = [...prev.qubits, newQubit]
      const playerDone = newRemaining[player].length === 0

      if (playerDone && player === 0) {
        return {
          ...prev,
          qubits: newQubits,
          setupRemaining: newRemaining,
          selectedConfigIndex: null,
          phase: 'passing' as GamePhase,
          currentPlayer: 1 as const,
          message: '',
        }
      }

      if (playerDone && player === 1) {
        return {
          ...prev,
          qubits: linkEntangledQubits(newQubits),
          setupRemaining: newRemaining,
          selectedConfigIndex: null,
          phase: 'passing' as GamePhase,
          currentPlayer: 0 as const,
          message: '',
        }
      }

      return {
        ...prev,
        qubits: newQubits,
        setupRemaining: newRemaining,
        selectedConfigIndex: null,
        message: `Player ${player + 1}: Select a qubit and place it (${newRemaining[player].length} left)`,
      }
    })
  })

  const randomPlaceAll = useMemoizedFn((maxCell?: number) => {
    setState((prev) => {
      if (prev.phase !== 'setup') return prev

      const player = prev.currentPlayer
      const remaining = prev.setupRemaining[player]
      if (remaining.length === 0) return prev

      const upper = Math.min(maxCell ?? PLACEMENT_MAX, PLACEMENT_MAX)
      const occupiedCells = prev.qubits.map((q) => q.cell)
      const newQubits = [...prev.qubits]
      const newRemaining: [number[], number[]] = [
        [...prev.setupRemaining[0]],
        [...prev.setupRemaining[1]],
      ]

      for (const configIndex of [...remaining]) {
        let cell: number
        do {
          cell =
            PLACEMENT_MIN +
            Math.floor(Math.random() * (upper - PLACEMENT_MIN + 1))
        } while (occupiedCells.includes(cell))

        occupiedCells.push(cell)
        newQubits.push({
          id: nextQubitId(),
          cell,
          owner: player,
          configIndex,
          collapsed: null,
        })

        const idx = newRemaining[player].indexOf(configIndex)
        newRemaining[player].splice(idx, 1)
      }

      const finalQubits = player === 1 ? linkEntangledQubits(newQubits) : newQubits

      return {
        ...prev,
        qubits: finalQubits,
        setupRemaining: newRemaining,
        selectedConfigIndex: null,
        phase: 'passing' as GamePhase,
        currentPlayer: (player === 0 ? 1 : 0) as 0 | 1,
        message: '',
      }
    })
  })

  const confirmPass = useMemoizedFn(() => {
    setState((prev) => {
      if (prev.phase !== 'passing') return prev
      if (prev.setupRemaining[prev.currentPlayer].length > 0) {
        return {
          ...prev,
          phase: 'setup' as GamePhase,
          message: `Player ${prev.currentPlayer + 1}: Select a qubit and place it on the board`,
        }
      }
      return {
        ...prev,
        phase: 'play' as GamePhase,
        message: `Player ${prev.currentPlayer + 1}'s turn - Roll the dice!`,
      }
    })
  })

  return { selectQubit, placeQubit, randomPlaceAll, confirmPass }
}
