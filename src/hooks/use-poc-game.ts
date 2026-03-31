import { useState, useCallback, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { sendToQuokka } from '@/lib/quokka'
import { buildSingleQubitQASM } from '@/lib/qasm-builder'
import type { LogEntry } from '@/hooks/use-game'

// ── POC Constants ───────────────────────────────────────

const BOARD_SIZE = 4
const TOTAL_CELLS = 16
const DICE_MAX = 3

interface QubitConfig {
  label: string
  ladderProb: number
  snakeProb: number
}

const QUBIT_CONFIGS: QubitConfig[] = [
  { label: '80/20', ladderProb: 0.8, snakeProb: 0.2 },
  { label: '20/80', ladderProb: 0.2, snakeProb: 0.8 },
]

// Fixed qubit positions for prototype (cell 6 and 11)
const QUBIT_CELLS = [6, 11]

// ── Types ───────────────────────────────────────────────

export interface PocQubit {
  id: string
  cell: number
  configIndex: number
  collapsed: null | 'snake' | 'ladder'
  destinationCell?: number
}

export interface PocGameState {
  phase: 'play' | 'gameover'
  position: number
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
    position: 1,
    dice: null,
    qubits: QUBIT_CELLS.map((cell, i) => ({
      id: `poc_qb_${i}`,
      cell,
      configIndex: i,
      collapsed: null,
    })),
    message: 'Roll the dice!',
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
      targetCell: number
    }): Promise<{ qubitId: string; outcome: 'snake' | 'ladder' }> => {
      const config = QUBIT_CONFIGS[qubit.configIndex]
      try {
        const theta = 2 * Math.acos(Math.sqrt(config.ladderProb))
        const qasm = buildSingleQubitQASM(config.ladderProb)
        addLog('info', `Measuring qubit [${config.label}] at cell ${qubit.cell}...`)
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

    onSuccess: (data, { targetCell }) => {
      const { qubitId, outcome } = data
      // Ladder: up one row (+4), Snake: down one row (-4)
      const displacement = outcome === 'ladder' ? BOARD_SIZE : -BOARD_SIZE
      const newCell = Math.max(1, Math.min(TOTAL_CELLS, targetCell + displacement))

      addLog('info', `${outcome === 'ladder' ? 'Ladder' : 'Snake'}! Cell ${targetCell} \u2192 ${newCell}`)

      setState((prev) => {
        const gameOver = newCell >= TOTAL_CELLS
        return {
          ...prev,
          position: newCell,
          qubits: prev.qubits.map((q) =>
            q.id === qubitId ? { ...q, collapsed: outcome, destinationCell: newCell } : q,
          ),
          isCollapsing: false,
          gameOver,
          phase: gameOver ? 'gameover' : 'play',
          message: gameOver
            ? 'You win!'
            : `${outcome === 'ladder' ? 'Ladder' : 'Snake'}! \u2192 cell ${newCell}`,
        }
      })
    },
  })

  // ── Actions ──

  const handleRoll = useCallback(async () => {
    const snap = stateRef.current
    if (snap.phase !== 'play' || snap.isRolling || snap.gameOver || collapseMutation.isPending)
      return

    setState((prev) => ({ ...prev, isRolling: true, message: '' }))
    const die = rollDie()
    await sleep(400)

    const current = stateRef.current
    if (!current.isRolling) return

    const targetCell = Math.min(current.position + die, TOTAL_CELLS)

    if (targetCell >= TOTAL_CELLS) {
      setState((prev) => ({
        ...prev,
        position: targetCell,
        dice: die,
        isRolling: false,
        gameOver: true,
        phase: 'gameover',
        message: `You win! Rolled ${die}: cell ${current.position} \u2192 ${targetCell}`,
      }))
      return
    }

    const qubitOnCell = current.qubits.find(
      (q) => q.cell === targetCell && q.collapsed === null,
    )

    if (qubitOnCell) {
      setState((prev) => ({
        ...prev,
        position: targetCell,
        dice: die,
        isRolling: false,
        isCollapsing: true,
        message: `Rolled ${die}: cell ${current.position} \u2192 ${targetCell} | Quantum measurement...`,
      }))
      collapseMutation.mutate({ qubit: qubitOnCell, targetCell })
    } else {
      setState((prev) => ({
        ...prev,
        position: targetCell,
        dice: die,
        isRolling: false,
        message: `Rolled ${die}: cell ${current.position} \u2192 ${targetCell}`,
      }))
    }
  }, [collapseMutation, addLog])

  const reset = useCallback(() => {
    logsRef.current = []
    setState(createInitialState())
  }, [])

  return { state, handleRoll, reset, BOARD_SIZE, TOTAL_CELLS, QUBIT_CONFIGS }
}
