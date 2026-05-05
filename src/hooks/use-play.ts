import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { useMemoizedFn } from 'ahooks'
import type { UseMutationResult } from '@tanstack/react-query'
import { TOTAL_CELLS } from '@/constants/board'
import { computeDisplacement, rollDie, sleep } from '@/lib/game-helpers'
import type {
  CollapseParams,
  CollapseResult,
  GamePhase,
  GameState,
  LogEntry,
} from '@/types/game'

interface UsePlayDeps {
  setState: Dispatch<SetStateAction<GameState>>
  stateRef: MutableRefObject<GameState>
  addLog: (type: LogEntry['type'], message: string) => void
  hopAlongBoard: (player: 0 | 1, fromCell: number, toCell: number) => Promise<void>
  slideToCell: (
    player: 0 | 1,
    fromCell: number,
    toCell: number,
    isLadder: boolean,
  ) => Promise<void>
  collapseMutation: UseMutationResult<CollapseResult, Error, CollapseParams>
}

export interface PlayActions {
  handleRoll: (forced?: number) => Promise<void>
}

export function usePlay({
  setState,
  stateRef,
  addLog,
  hopAlongBoard,
  slideToCell,
  collapseMutation,
}: UsePlayDeps): PlayActions {
  const handleRoll = useMemoizedFn(async (forced?: number) => {
    const snap = stateRef.current
    if (
      snap.phase !== 'play' ||
      snap.isRolling ||
      snap.gameOver ||
      collapseMutation.isPending
    ) {
      return
    }

    setState((prev) => ({ ...prev, isRolling: true, message: '' }))

    const die = forced && forced >= 1 && forced <= 6 ? forced : rollDie()
    await sleep(400)

    const player = snap.currentPlayer
    const currentCell = snap.positions[player]
    const rawTarget = currentCell + die
    const targetCell = Math.min(rawTarget, TOTAL_CELLS)
    const msg = `Rolled ${die}: cell ${currentCell} → ${targetCell}`

    setState((prev) => ({ ...prev, dice: die, message: msg }))

    await hopAlongBoard(player, currentCell, targetCell)

    if (targetCell >= TOTAL_CELLS) {
      setState((prev) => ({
        ...prev,
        isRolling: false,
        gameOver: true,
        phase: 'gameover' as GamePhase,
        message: `Player ${player + 1} wins! ${msg}`,
      }))
      return
    }

    const settled = stateRef.current
    const uncollapsedQubit = settled.qubits.find(
      (q) => q.cell === targetCell && q.collapsed === null,
    )

    if (uncollapsedQubit) {
      setState((prev) => ({
        ...prev,
        isRolling: false,
        isCollapsing: true,
        message: `${msg} | Quantum measurement...`,
      }))
      collapseMutation.mutate({ qubit: uncollapsedQubit, player, targetCell })
      return
    }

    const collapsedQubit = settled.qubits.find(
      (q) =>
        q.cell === targetCell && (q.collapsed === 'snake' || q.collapsed === 'ladder'),
    )

    if (collapsedQubit) {
      const outcome = collapsedQubit.collapsed as 'snake' | 'ladder'
      const newCell =
        collapsedQubit.destinationCell ??
        computeDisplacement(outcome, targetCell, addLog)
      addLog(
        'info',
        `Player ${player + 1} hit existing ${outcome} at cell ${targetCell} → cell ${newCell}`,
      )

      setState((prev) => ({
        ...prev,
        message: `${outcome === 'ladder' ? 'Ladder' : 'Snake'}! ${
          outcome === 'ladder' ? 'Climbing' : 'Sliding'
        }...`,
      }))

      await slideToCell(player, targetCell, newCell, outcome === 'ladder')

      let chainCell = newCell
      let chainOutcome: 'snake' | 'ladder' = outcome
      const visited = new Set<number>([targetCell])

      while (chainCell !== TOTAL_CELLS && !visited.has(chainCell)) {
        visited.add(chainCell)
        const next = stateRef.current.qubits.find(
          (q) =>
            q.cell === chainCell &&
            (q.collapsed === 'snake' || q.collapsed === 'ladder') &&
            q.destinationCell !== undefined &&
            q.destinationCell !== chainCell,
        )
        if (!next) break

        const nextOutcome = next.collapsed as 'snake' | 'ladder'
        const nextDest = next.destinationCell!
        addLog(
          'info',
          `Chain! Player ${player + 1} hit existing ${nextOutcome} at cell ${chainCell} → cell ${nextDest}`,
        )
        setState((prev) => ({
          ...prev,
          message: `${nextOutcome === 'ladder' ? 'Ladder' : 'Snake'}! ${
            nextOutcome === 'ladder' ? 'Climbing' : 'Sliding'
          }... (chain)`,
        }))
        await slideToCell(player, chainCell, nextDest, nextOutcome === 'ladder')
        chainCell = nextDest
        chainOutcome = nextOutcome
      }

      const uncollapsedAtFinal =
        chainCell !== TOTAL_CELLS
          ? stateRef.current.qubits.find(
              (q) => q.cell === chainCell && q.collapsed === null,
            )
          : undefined

      if (uncollapsedAtFinal) {
        addLog(
          'info',
          `Chain! Player ${player + 1} landed on another qubit at cell ${chainCell}`,
        )
        setState((prev) => ({
          ...prev,
          isRolling: false,
          isCollapsing: true,
          message: `${chainOutcome === 'ladder' ? 'Ladder' : 'Snake'}! → cell ${chainCell} | Chain reaction...`,
        }))
        collapseMutation.mutate({
          qubit: uncollapsedAtFinal,
          player,
          targetCell: chainCell,
        })
        return
      }

      const gameOver = chainCell === TOTAL_CELLS
      setState((prev) => ({
        ...prev,
        isRolling: false,
        gameOver,
        phase: gameOver ? ('gameover' as GamePhase) : prev.phase,
        currentPlayer: gameOver
          ? prev.currentPlayer
          : ((player === 0 ? 1 : 0) as 0 | 1),
        message: gameOver
          ? `Player ${player + 1} wins!`
          : `${chainOutcome === 'ladder' ? 'Ladder' : 'Snake'}! → cell ${chainCell}`,
      }))
      return
    }

    setState((prev) => ({
      ...prev,
      isRolling: false,
      message: msg,
      currentPlayer: (player === 0 ? 1 : 0) as 0 | 1,
    }))
  })

  return { handleRoll }
}
