import { useState, useCallback, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { sendToQuokka } from '@/lib/quokka'
import { buildSingleQubitQASM } from '@/lib/qasm-builder'
import type { LogEntry } from '@/hooks/use-game'

// ── POC Constants ───────────────────────────────────────

const BOARD_SIZE = 4
const TOTAL_CELLS = 16
const DICE_MAX = 6

interface QubitConfig {
  label: string
  ladderProb: number
  snakeProb: number
}

const QUBIT_CONFIGS: QubitConfig[] = [
  { label: '80/20', ladderProb: 0.8, snakeProb: 0.2 },
  { label: '20/80', ladderProb: 0.2, snakeProb: 0.8 },
]

// ── Types ───────────────────────────────────────────────

export interface PocQubit {
  id: string
  cell: number
  owner: 0 | 1
  configIndex: number
  collapsed: null | 'snake' | 'ladder'
  destinationCell?: number
}

export interface PocGameState {
  phase: 'play' | 'gameover'
  positions: [number, number]
  currentPlayer: 0 | 1
  dice: number | null
  qubits: PocQubit[]
  message: string
  isRolling: boolean
  isCollapsing: boolean
  gameOver: boolean
  logs: LogEntry[]
}

// ── Helpers ─────────────────────────────────────────────

function createInitialState(): PocGameState {
  return {
    phase: 'play',
    positions: [1, 1],
    currentPlayer: 0,
    dice: null,
    qubits: [
      { id: 'poc_qb_0', cell: 6, owner: 0, configIndex: 0, collapsed: null },
      { id: 'poc_qb_1', cell: 11, owner: 1, configIndex: 1, collapsed: null },
    ],
    message: "Player 1's turn - Pick a number!",
    isRolling: false,
    isCollapsing: false,
    gameOver: false,
    logs: [],
  }
}

function rollDie(): number {
  return Math.floor(Math.random() * DICE_MAX) + 1
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

// ── Hook ────────────────────────────────────────────────

export function usePocGame() {
  const [state, setState] = useState<PocGameState>(createInitialState)
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  })
  const logsRef = useRef<LogEntry[]>([])

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    const entry: LogEntry = { timestamp: Date.now(), type, message }
    logsRef.current = [...logsRef.current, entry]
    setState((prev) => ({ ...prev, logs: logsRef.current }))
  }, [])

  // ── Quokka mutation ──

  const collapseMutation = useMutation({
    mutationFn: async ({
      qubit,
    }: {
      qubit: PocQubit
      player: 0 | 1
      targetCell: number
    }): Promise<{ qubitId: string; outcome: 'snake' | 'ladder' }> => {
      const config = QUBIT_CONFIGS[qubit.configIndex]
      try {
        const theta = 2 * Math.acos(Math.sqrt(config.ladderProb))
        const qasm = buildSingleQubitQASM(config.ladderProb)
        addLog('info', `P${qubit.owner + 1}'s qubit [${config.label}] at cell ${qubit.cell}...`)
        addLog(
          'info',
          `Circuit: ladderProb=${config.ladderProb} \u2192 \u03B8=${theta.toFixed(4)}rad \u2192 ry(${theta.toFixed(4)})`,
        )
        addLog('qasm', qasm)

        const result = await sendToQuokka(qasm)
        const measurement = result[0][0]
        const outcome: 'snake' | 'ladder' = measurement === 0 ? 'ladder' : 'snake'
        addLog(
          'result',
          `Measurement: ${measurement} \u2192 ${outcome === 'ladder' ? 'Ladder!' : 'Snake!'}`,
        )
        return { qubitId: qubit.id, outcome }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        addLog('error', `Quokka error: ${msg}. Using local fallback.`)
        const fallback = Math.random() < config.ladderProb ? 'ladder' : 'snake'
        addLog(
          'result',
          `Fallback: ${fallback === 'ladder' ? 'Ladder!' : 'Snake!'}`,
        )
        return { qubitId: qubit.id, outcome: fallback }
      }
    },

    onSuccess: (data, { player, targetCell }) => {
      const { qubitId, outcome } = data
      const displacement = outcome === 'ladder' ? BOARD_SIZE : -BOARD_SIZE
      const newCell = Math.max(1, Math.min(TOTAL_CELLS, targetCell + displacement))

      addLog('info', `Player ${player + 1}: ${outcome === 'ladder' ? 'Ladder' : 'Snake'}! Cell ${targetCell} \u2192 ${newCell}`)

      setState((prev) => {
        const newPositions: [number, number] = [...prev.positions]
        newPositions[player] = newCell
        const gameOver = newCell >= TOTAL_CELLS
        const nextPlayer = gameOver ? prev.currentPlayer : ((player === 0 ? 1 : 0) as 0 | 1)

        return {
          ...prev,
          positions: newPositions,
          qubits: prev.qubits.map((q) =>
            q.id === qubitId ? { ...q, collapsed: outcome, destinationCell: newCell } : q,
          ),
          isCollapsing: false,
          gameOver,
          phase: gameOver ? 'gameover' : 'play',
          currentPlayer: nextPlayer,
          message: gameOver
            ? `Player ${player + 1} wins!`
            : `${outcome === 'ladder' ? 'Ladder' : 'Snake'}! \u2192 cell ${newCell}`,
        }
      })
    },
  })

  // ── Actions ──

  const handleRoll = useCallback(async (manualDie?: number) => {
    const snap = stateRef.current
    if (snap.phase !== 'play' || snap.isRolling || snap.gameOver || collapseMutation.isPending)
      return

    const player = snap.currentPlayer
    setState((prev) => ({ ...prev, isRolling: true, message: '' }))
    const die = manualDie ?? rollDie()
    await sleep(400)

    const current = stateRef.current
    if (!current.isRolling) return

    const currentCell = current.positions[player]
    const targetCell = Math.min(currentCell + die, TOTAL_CELLS)

    if (targetCell >= TOTAL_CELLS) {
      const newPositions: [number, number] = [...current.positions]
      newPositions[player] = targetCell
      setState((prev) => ({
        ...prev,
        positions: newPositions,
        dice: die,
        isRolling: false,
        gameOver: true,
        phase: 'gameover',
        message: `Player ${player + 1} wins! Rolled ${die}: cell ${currentCell} \u2192 ${targetCell}`,
      }))
      return
    }

    const qubitOnCell = current.qubits.find(
      (q) => q.cell === targetCell && q.collapsed === null,
    )

    const newPositions: [number, number] = [...current.positions]
    newPositions[player] = targetCell

    if (qubitOnCell) {
      setState((prev) => ({
        ...prev,
        positions: newPositions,
        dice: die,
        isRolling: false,
        isCollapsing: true,
        message: `P${player + 1} rolled ${die}: cell ${currentCell} \u2192 ${targetCell} | Quantum measurement...`,
      }))
      collapseMutation.mutate({ qubit: qubitOnCell, player, targetCell })
    } else {
      const nextPlayer = (player === 0 ? 1 : 0) as 0 | 1
      setState((prev) => ({
        ...prev,
        positions: newPositions,
        dice: die,
        isRolling: false,
        currentPlayer: nextPlayer,
        message: `P${player + 1} rolled ${die}: cell ${currentCell} \u2192 ${targetCell}`,
      }))
    }
  }, [collapseMutation, addLog])

  const reset = useCallback(() => {
    logsRef.current = []
    setState(createInitialState())
  }, [])

  return { state, handleRoll, reset, BOARD_SIZE, TOTAL_CELLS, QUBIT_CONFIGS }
}
