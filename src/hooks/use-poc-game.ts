import { useState, useCallback, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { sendToQuokka } from '@/lib/quokka'
import { buildSingleQubitQASM, buildEntangledQASM } from '@/lib/qasm-builder'
import type { LogEntry } from '@/hooks/use-game'

// ── POC Constants ───────────────────────────────────────

const BOARD_SIZE = 4
const TOTAL_CELLS = 16
const DICE_MAX = 6

interface QubitConfig {
  label: string
  ladderProb: number
  snakeProb: number
  entangled: boolean
}

const QUBIT_CONFIGS: QubitConfig[] = [
  { label: '80/20', ladderProb: 0.8, snakeProb: 0.2, entangled: false },
  { label: '50/50', ladderProb: 0.5, snakeProb: 0.5, entangled: true },
]

// ── Types ───────────────────────────────────────────────

export interface PocQubit {
  id: string
  cell: number
  configIndex: number
  collapsed: null | 'snake' | 'ladder' | 'interference'
  destinationCell?: number
  entangledPartnerId?: string
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
    qubits: [
      { id: 'poc_qb_0', cell: 5, configIndex: 0, collapsed: null },
      { id: 'poc_qb_1', cell: 8, configIndex: 1, collapsed: null, entangledPartnerId: 'poc_qb_2' },
      { id: 'poc_qb_2', cell: 12, configIndex: 1, collapsed: null, entangledPartnerId: 'poc_qb_1' },
    ],
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

  interface CollapseResult {
    qubitId: string
    outcome: 'snake' | 'ladder' | 'interference'
    partnerId?: string
    partnerOutcome?: 'snake' | 'ladder' | 'interference'
  }

  const collapseMutation = useMutation({
    mutationFn: async ({
      qubit,
    }: {
      qubit: PocQubit
      targetCell: number
    }): Promise<CollapseResult> => {
      const config = QUBIT_CONFIGS[qubit.configIndex]

      try {
        // ── Entangled qubit ──
        if (config.entangled && qubit.entangledPartnerId) {
          const qasm = buildEntangledQASM()
          addLog('info', `Measuring ENTANGLED qubit [${config.label}] at cell ${qubit.cell}...`)
          addLog('info', `Circuit: H\u2192CNOT creates Bell state (|00\u27E9+|11\u27E9)/\u221A2`)
          addLog('info', `Outcomes: 00(50%)=ladder, 11(50%)=snake`)
          addLog('qasm', qasm)

          const result = await sendToQuokka(qasm)
          const [m0, m1] = [result[0][0], result[0][1]]

          if (m0 === 0 && m1 === 0) {
            addLog('result', `Entangled: [${m0},${m1}] \u2192 Ladder!`)
            return { qubitId: qubit.id, outcome: 'ladder', partnerId: qubit.entangledPartnerId, partnerOutcome: 'ladder' }
          }
          if (m0 === 1 && m1 === 1) {
            addLog('result', `Entangled: [${m0},${m1}] \u2192 Snake!`)
            return { qubitId: qubit.id, outcome: 'snake', partnerId: qubit.entangledPartnerId, partnerOutcome: 'snake' }
          }
          addLog('result', `Entangled: [${m0},${m1}] \u2192 Interference! Nothing happens.`)
          return { qubitId: qubit.id, outcome: 'interference', partnerId: qubit.entangledPartnerId, partnerOutcome: 'interference' }
        }

        // ── Single qubit ──
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

        if (config.entangled && qubit.entangledPartnerId) {
          const fallback = Math.random() < 0.5 ? 'ladder' : 'snake'
          return { qubitId: qubit.id, outcome: fallback, partnerId: qubit.entangledPartnerId, partnerOutcome: fallback }
        }

        const fallback = Math.random() < config.ladderProb ? 'ladder' : 'snake'
        addLog(
          'result',
          `Fallback: ${fallback === 'ladder' ? 'Ladder!' : 'Snake!'}`,
        )
        return { qubitId: qubit.id, outcome: fallback }
      }
    },

    onSuccess: (data, { targetCell }) => {
      const { qubitId, outcome, partnerId, partnerOutcome } = data

      // Interference: nothing happens, just mark both qubits
      if (outcome === 'interference') {
        setState((prev) => ({
          ...prev,
          qubits: prev.qubits.map((q) =>
            q.id === qubitId || q.id === partnerId
              ? { ...q, collapsed: 'interference' as const }
              : q,
          ),
          isCollapsing: false,
          message: 'Quantum interference! Entangled qubits cancelled out.',
        }))
        return
      }

      // Ladder / Snake displacement
      const displacement = outcome === 'ladder' ? BOARD_SIZE : -BOARD_SIZE
      const newCell = Math.max(1, Math.min(TOTAL_CELLS, targetCell + displacement))

      addLog('info', `${outcome === 'ladder' ? 'Ladder' : 'Snake'}! Cell ${targetCell} \u2192 ${newCell}`)

      setState((prev) => {
        const gameOver = newCell >= TOTAL_CELLS
        let newQubits = prev.qubits.map((q) =>
          q.id === qubitId ? { ...q, collapsed: outcome, destinationCell: newCell } : q,
        )
        // Also collapse the entangled partner visually
        if (partnerId && partnerOutcome && partnerOutcome !== 'interference') {
          newQubits = newQubits.map((q) =>
            q.id === partnerId ? { ...q, collapsed: partnerOutcome } : q,
          )
        }

        return {
          ...prev,
          position: newCell,
          qubits: newQubits,
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

  const handleRoll = useCallback(async (manualDie?: number) => {
    const snap = stateRef.current
    if (snap.phase !== 'play' || snap.isRolling || snap.gameOver || collapseMutation.isPending)
      return

    setState((prev) => ({ ...prev, isRolling: true, message: '' }))
    const die = manualDie ?? rollDie()
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
