import { useState, useCallback, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { sendToQuokka } from '@/lib/quokka'
import { buildSingleQubitQASM } from '@/lib/qasm-builder'
import type { LogEntry } from '@/hooks/use-game'

// ── POC Constants ───────────────────────────────────────

const BOARD_SIZE = 4
const TOTAL_CELLS = 16
const DICE_MAX = 6
const PLACEMENT_MIN = 2
const PLACEMENT_MAX = 15

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

export type PocPhase = 'setup' | 'play' | 'gameover'

export interface PocGameState {
  phase: PocPhase
  positions: [number, number]
  currentPlayer: 0 | 1
  dice: number | null
  qubits: PocQubit[]
  selectedConfigIndex: number | null
  setupDone: [boolean, boolean]
  message: string
  isRolling: boolean
  isCollapsing: boolean
  gameOver: boolean
  logs: LogEntry[]
}

// ── Helpers ─────────────────────────────────────────────

let qubitIdCounter = 0

function createInitialState(): PocGameState {
  qubitIdCounter = 0
  return {
    phase: 'setup',
    positions: [1, 1],
    currentPlayer: 0,
    dice: null,
    qubits: [],
    selectedConfigIndex: null,
    setupDone: [false, false],
    message: 'Player 1: Select a qubit type, then click a cell to place it',
    isRolling: false,
    isCollapsing: false,
    gameOver: false,
    logs: [],
  }
}

function isValidPlacement(cell: number, occupiedCells: number[]): boolean {
  return cell >= PLACEMENT_MIN && cell <= PLACEMENT_MAX && !occupiedCells.includes(cell)
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

  // ── Setup actions ──

  const selectQubit = useCallback((configIndex: number) => {
    setState((prev) => {
      if (prev.phase !== 'setup') return prev
      return { ...prev, selectedConfigIndex: configIndex }
    })
  }, [])

  const placeQubit = useCallback((cell: number) => {
    setState((prev) => {
      if (prev.phase !== 'setup' || prev.selectedConfigIndex === null) return prev

      const occupiedCells = prev.qubits.map((q) => q.cell)
      if (!isValidPlacement(cell, occupiedCells)) return prev

      const player = prev.currentPlayer
      const configIndex = prev.selectedConfigIndex

      const newQubit: PocQubit = {
        id: `poc_qb_${++qubitIdCounter}`,
        cell,
        owner: player,
        configIndex,
        collapsed: null,
      }

      const newQubits = [...prev.qubits, newQubit]
      const newSetupDone: [boolean, boolean] = [...prev.setupDone]
      newSetupDone[player] = true

      // P1 done → switch to P2
      if (player === 0 && !newSetupDone[1]) {
        return {
          ...prev,
          qubits: newQubits,
          setupDone: newSetupDone,
          selectedConfigIndex: null,
          currentPlayer: 1 as const,
          message: 'Player 2: Select a qubit type, then click a cell to place it',
        }
      }

      // Both done → start play
      return {
        ...prev,
        qubits: newQubits,
        setupDone: newSetupDone,
        selectedConfigIndex: null,
        phase: 'play' as PocPhase,
        currentPlayer: 0 as const,
        message: "Player 1's turn - Roll or pick a number!",
      }
    })
  }, [])

  const randomPlaceAll = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== 'setup') return prev

      const player = prev.currentPlayer
      if (prev.setupDone[player]) return prev

      const occupiedCells = prev.qubits.map((q) => q.cell)
      const configIndex = Math.floor(Math.random() * QUBIT_CONFIGS.length)

      let cell: number
      do {
        cell = PLACEMENT_MIN + Math.floor(Math.random() * (PLACEMENT_MAX - PLACEMENT_MIN + 1))
      } while (occupiedCells.includes(cell))

      const newQubit: PocQubit = {
        id: `poc_qb_${++qubitIdCounter}`,
        cell,
        owner: player,
        configIndex,
        collapsed: null,
      }

      const newQubits = [...prev.qubits, newQubit]
      const newSetupDone: [boolean, boolean] = [...prev.setupDone]
      newSetupDone[player] = true

      if (player === 0 && !newSetupDone[1]) {
        return {
          ...prev,
          qubits: newQubits,
          setupDone: newSetupDone,
          selectedConfigIndex: null,
          currentPlayer: 1 as const,
          message: 'Player 2: Select a qubit type, then click a cell to place it',
        }
      }

      return {
        ...prev,
        qubits: newQubits,
        setupDone: newSetupDone,
        selectedConfigIndex: null,
        phase: 'play' as PocPhase,
        currentPlayer: 0 as const,
        message: "Player 1's turn - Roll or pick a number!",
      }
    })
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

  // ── Play actions ──

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

  return {
    state,
    selectQubit,
    placeQubit,
    randomPlaceAll,
    handleRoll,
    reset,
    BOARD_SIZE,
    TOTAL_CELLS,
    QUBIT_CONFIGS,
    PLACEMENT_MIN,
    PLACEMENT_MAX,
  }
}
