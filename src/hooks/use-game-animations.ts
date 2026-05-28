import type { Dispatch, SetStateAction } from 'react'
import { useMemoizedFn } from 'ahooks'
import { cellToCoord, coordToCell } from '@/constants/board'
import { sleep } from '@/lib/game-helpers'
import { useSettings } from '@/lib/settings'
import type { GameState } from '@/types/game'

export interface GameAnimations {
  setPosition: (player: 0 | 1, cell: number, recordPath?: boolean) => void
  hopAlongBoard: (
    player: 0 | 1,
    fromCell: number,
    toCell: number,
    stepMsOverride?: number,
  ) => Promise<void>
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
  const { timings } = useSettings()

  // Record a cell in the player's journey log. Skips no-op repeats so the
  // dotted-line replay doesn't draw degenerate zero-length segments.
  const recordPathStep = useMemoizedFn((player: 0 | 1, cell: number) => {
    setState((prev) => {
      const playerPath = prev.paths[player]
      if (playerPath[playerPath.length - 1] === cell) return prev
      const paths: [number[], number[]] = [
        player === 0 ? [...playerPath, cell] : prev.paths[0],
        player === 1 ? [...playerPath, cell] : prev.paths[1],
      ]
      return { ...prev, paths }
    })
  })

  const setPosition = useMemoizedFn(
    (player: 0 | 1, cell: number, recordPath = false) => {
      setState((prev) => {
        const positions: [number, number] = [...prev.positions]
        positions[player] = cell
        if (!recordPath) return { ...prev, positions }
        const playerPath = prev.paths[player]
        if (playerPath[playerPath.length - 1] === cell) {
          return { ...prev, positions }
        }
        const paths: [number[], number[]] = [
          player === 0 ? [...playerPath, cell] : prev.paths[0],
          player === 1 ? [...playerPath, cell] : prev.paths[1],
        ]
        return { ...prev, positions, paths }
      })
    },
  )

  const hopAlongBoard = useMemoizedFn(
    async (
      player: 0 | 1,
      fromCell: number,
      toCell: number,
      stepMsOverride?: number,
    ) => {
      if (fromCell === toCell) return
      const stepMs = stepMsOverride ?? timings.hopMs
      const dir = toCell > fromCell ? 1 : -1
      for (
        let cell = fromCell + dir;
        dir > 0 ? cell <= toCell : cell >= toCell;
        cell += dir
      ) {
        // Record every cell the piece touches so the post-game replay can
        // retrace the literal walk (and the bounce/tunnel detours).
        setPosition(player, cell, true)
        await sleep(stepMs)
      }
    },
  )

  const slideToCell = useMemoizedFn(
    async (player: 0 | 1, fromCell: number, toCell: number, isLadder: boolean) => {
      const a = cellToCoord(fromCell)
      const b = cellToCoord(toCell)
      const gridSpan = Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row))
      if (gridSpan === 0) {
        setPosition(player, toCell, true)
        return
      }
      // Densify so the token visits more intermediate cells — feels like a glide.
      const steps = gridSpan * 2
      const stepMs = isLadder ? timings.ladderStepMs : timings.snakeStepMs

      setState((prev) => ({ ...prev, slidingPlayer: player }))
      try {
        let prevCell = fromCell
        for (let i = 1; i <= steps; i++) {
          const t = i / steps
          const col = Math.round(a.col + (b.col - a.col) * t)
          const row = Math.round(a.row + (b.row - a.row) * t)
          const cell = coordToCell(col, row)
          if (cell !== prevCell) {
            // Slide intermediates animate the token but aren't part of the
            // logical journey — only the destination is recorded.
            setPosition(player, cell)
            prevCell = cell
            await sleep(stepMs)
          }
        }
        if (prevCell !== toCell) setPosition(player, toCell, true)
        else recordPathStep(player, toCell)
      } finally {
        setState((prev) => ({ ...prev, slidingPlayer: null }))
      }
    },
  )

  return { setPosition, hopAlongBoard, slideToCell }
}
