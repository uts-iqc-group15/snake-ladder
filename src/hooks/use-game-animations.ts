import type { Dispatch, SetStateAction } from 'react'
import { useMemoizedFn } from 'ahooks'
import { cellToCoord, coordToCell } from '@/constants/board'
import { HOP_MS, LADDER_STEP_MS, SNAKE_STEP_MS, sleep } from '@/lib/game-helpers'
import type { GameState } from '@/types/game'

export interface GameAnimations {
  setPosition: (player: 0 | 1, cell: number) => void
  hopAlongBoard: (player: 0 | 1, fromCell: number, toCell: number) => Promise<void>
  slideToCell: (
    player: 0 | 1,
    fromCell: number,
    toCell: number,
    isLadder: boolean,
  ) => Promise<void>
}

export function useGameAnimations(
  setState: Dispatch<SetStateAction<GameState>>,
): GameAnimations {
  const setPosition = useMemoizedFn((player: 0 | 1, cell: number) => {
    setState((prev) => {
      const positions: [number, number] = [...prev.positions]
      positions[player] = cell
      return { ...prev, positions }
    })
  })

  const hopAlongBoard = useMemoizedFn(
    async (player: 0 | 1, fromCell: number, toCell: number) => {
      if (fromCell === toCell) return
      const dir = toCell > fromCell ? 1 : -1
      for (
        let cell = fromCell + dir;
        dir > 0 ? cell <= toCell : cell >= toCell;
        cell += dir
      ) {
        setPosition(player, cell)
        await sleep(HOP_MS)
      }
    },
  )

  const slideToCell = useMemoizedFn(
    async (player: 0 | 1, fromCell: number, toCell: number, isLadder: boolean) => {
      const a = cellToCoord(fromCell)
      const b = cellToCoord(toCell)
      const gridSpan = Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row))
      if (gridSpan === 0) {
        setPosition(player, toCell)
        return
      }
      // Densify so the token visits more intermediate cells — feels like a glide.
      const steps = gridSpan * 2
      const stepMs = isLadder ? LADDER_STEP_MS : SNAKE_STEP_MS

      setState((prev) => ({ ...prev, slidingPlayer: player }))
      try {
        let prevCell = fromCell
        for (let i = 1; i <= steps; i++) {
          const t = i / steps
          const col = Math.round(a.col + (b.col - a.col) * t)
          const row = Math.round(a.row + (b.row - a.row) * t)
          const cell = coordToCell(col, row)
          if (cell !== prevCell) {
            setPosition(player, cell)
            prevCell = cell
            await sleep(stepMs)
          }
        }
        if (prevCell !== toCell) setPosition(player, toCell)
      } finally {
        setState((prev) => ({ ...prev, slidingPlayer: null }))
      }
    },
  )

  return { setPosition, hopAlongBoard, slideToCell }
}
