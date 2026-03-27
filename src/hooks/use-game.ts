import { useState, useCallback, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  BOARD_SIZE,
  TOTAL_CELLS,
  PLACEMENT_MIN,
  PLACEMENT_MAX,
  QUBIT_CONFIGS,
  isValidPlacement,
  X_VECTOR_TABLE,
  Y_VECTOR_MATRIX,
  cellToCoord,
  coordToCell,
  clamp,
} from '@/constants/board'
import { sendToQuokka } from '@/lib/quokka'
import { buildSingleQubitQASM, buildEntangledQASM } from '@/lib/qasm-builder'

// ── Types ────────────────────────────────────────────────

export interface PlacedQubit {
  id: string
  cell: number
  owner: 0 | 1
  configIndex: number
  collapsed: null | 'snake' | 'ladder' | 'interference'
  destinationCell?: number
  entangledPartnerId?: string
}

export interface LogEntry {
  timestamp: number
  type: 'info' | 'qasm' | 'result' | 'error'
  message: string
}

export type GamePhase = 'setup' | 'passing' | 'play' | 'gameover'

export interface GameState {
  phase: GamePhase
  positions: [number, number]
  currentPlayer: 0 | 1
  dice: number | null
  qubits: PlacedQubit[]
  selectedConfigIndex: number | null
  setupRemaining: [number[], number[]]
  message: string
  isRolling: boolean
  isCollapsing: boolean
  gameOver: boolean
  logs: LogEntry[]
}

interface CollapseParams {
  qubit: PlacedQubit
  player: 0 | 1
  targetCell: number
}

interface CollapseResult {
  qubitId: string
  outcome: 'snake' | 'ladder' | 'interference'
  partnerId?: string
  partnerOutcome?: 'snake' | 'ladder' | 'interference'
}

// ── Helpers ──────────────────────────────────────────────

const INITIAL_SETUP: [number[], number[]] = [
  [0, 1, 2, 3, 4],
  [0, 1, 2, 3, 4],
]

const INITIAL_STATE: GameState = {
  phase: 'setup',
  positions: [1, 1],
  currentPlayer: 0,
  dice: null,
  qubits: [],
  selectedConfigIndex: null,
  setupRemaining: [[...INITIAL_SETUP[0]], [...INITIAL_SETUP[1]]],
  message: 'Player 1: Select a qubit and place it on the board',
  isRolling: false,
  isCollapsing: false,
  gameOver: false,
  logs: [],
}

function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

let qubitIdCounter = 0
function nextQubitId(): string {
  return `qb_${++qubitIdCounter}`
}

function wrapCol(col: number): number {
  return ((col % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE
}

function linkEntangledQubits(qubits: PlacedQubit[]): PlacedQubit[] {
  const entangled = qubits.filter((q) => QUBIT_CONFIGS[q.configIndex].entangled)
  if (entangled.length !== 2) return qubits
  const [a, b] = entangled
  return qubits.map((q) => {
    if (q.id === a.id) return { ...q, entangledPartnerId: b.id }
    if (q.id === b.id) return { ...q, entangledPartnerId: a.id }
    return q
  })
}

function computeDisplacement(
  outcome: 'snake' | 'ladder',
  targetCell: number,
  addLog: (type: LogEntry['type'], message: string) => void,
): number {
  const xRoll = rollDie()
  const yRoll1 = rollDie()
  const yRoll2 = rollDie()
  const xVec = X_VECTOR_TABLE[xRoll]
  const dx = xVec.magnitude * xVec.direction
  const yMag = Y_VECTOR_MATRIX[yRoll1 - 1][yRoll2 - 1]
  const dy = outcome === 'ladder' ? yMag : -yMag

  addLog(
    'info',
    `Vector: X=${xRoll}→dx=${dx > 0 ? '+' : ''}${dx}, Y=(${yRoll1},${yRoll2})→dy=${dy > 0 ? '+' : ''}${dy}`,
  )

  const coord = cellToCoord(targetCell)
  const newCol = wrapCol(coord.col + dx)
  const newRow = clamp(coord.row + dy, 0, BOARD_SIZE - 1)
  return coordToCell(newCol, newRow)
}

// ── Hook ─────────────────────────────────────────────────

export function useGame() {
  const [state, setState] = useState<GameState>({ ...INITIAL_STATE })
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
    mutationFn: async ({ qubit }: CollapseParams): Promise<CollapseResult> => {
      const config = QUBIT_CONFIGS[qubit.configIndex]

      try {
        if (config.entangled && qubit.entangledPartnerId) {
          const qasm = buildEntangledQASM()
          addLog('info', `Measuring ENTANGLED qubit [${config.label}] at cell ${qubit.cell}...`)
          addLog('qasm', qasm)

          const result = await sendToQuokka(qasm)
          const [m0, m1] = [result[0][0], result[0][1]]

          if (m0 === 0 && m1 === 0) {
            addLog('result', `Entangled: [${m0},${m1}] → Both Ladders!`)
            return { qubitId: qubit.id, outcome: 'ladder', partnerId: qubit.entangledPartnerId, partnerOutcome: 'ladder' }
          }
          if (m0 === 1 && m1 === 1) {
            addLog('result', `Entangled: [${m0},${m1}] → Both Snakes!`)
            return { qubitId: qubit.id, outcome: 'snake', partnerId: qubit.entangledPartnerId, partnerOutcome: 'snake' }
          }
          addLog('result', `Entangled: [${m0},${m1}] → Interference! Nothing happens.`)
          return { qubitId: qubit.id, outcome: 'interference', partnerId: qubit.entangledPartnerId, partnerOutcome: 'interference' }
        }

        const qasm = buildSingleQubitQASM(config.ladderProb)
        addLog('info', `Measuring qubit [${config.label}] at cell ${qubit.cell}...`)
        addLog('qasm', qasm)

        const result = await sendToQuokka(qasm)
        const measurement = result[0][0]
        const outcome: 'snake' | 'ladder' = measurement === 0 ? 'ladder' : 'snake'
        addLog('result', `Measurement: ${measurement} → ${outcome === 'ladder' ? 'Ladder!' : 'Snake!'}`)

        return { qubitId: qubit.id, outcome }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        addLog('error', `Quokka error: ${msg}. Using local fallback.`)

        const fallback = rollDie() <= Math.ceil(config.ladderProb * 6) ? 'ladder' : 'snake'
        addLog('result', `Fallback: ${fallback === 'ladder' ? 'Ladder!' : 'Snake!'}`)

        return { qubitId: qubit.id, outcome: fallback }
      }
    },

    onSuccess: (data, { player, targetCell }) => {
      applyCollapseToState(data, player, targetCell)
    },
  })

  const applyCollapseToState = useCallback(
    (data: CollapseResult, player: 0 | 1, targetCell: number) => {
      const { qubitId, outcome, partnerId, partnerOutcome } = data

      if (outcome === 'interference') {
        setState((prev) => ({
          ...prev,
          qubits: prev.qubits.map((q) =>
            q.id === qubitId || q.id === partnerId
              ? { ...q, collapsed: 'interference' as const }
              : q,
          ),
          isCollapsing: false,
          currentPlayer: (player === 0 ? 1 : 0) as 0 | 1,
          message: 'Quantum interference! Both entangled qubits cancelled out.',
        }))
        return
      }

      const newCell = computeDisplacement(outcome, targetCell, addLog)
      addLog('info', `Player ${player + 1}: cell ${targetCell} → cell ${newCell}`)

      setState((prev) => {
        const newPositions: [number, number] = [...prev.positions]
        newPositions[player] = newCell
        const gameOver = newCell === TOTAL_CELLS

        let newQubits = prev.qubits.map((q) =>
          q.id === qubitId ? { ...q, collapsed: outcome, destinationCell: newCell } : q,
        )
        if (partnerId && partnerOutcome && partnerOutcome !== 'interference') {
          newQubits = newQubits.map((q) =>
            q.id === partnerId ? { ...q, collapsed: partnerOutcome } : q,
          )
        }

        return {
          ...prev,
          positions: newPositions,
          qubits: newQubits,
          isCollapsing: false,
          gameOver,
          phase: gameOver ? ('gameover' as GamePhase) : prev.phase,
          currentPlayer: gameOver ? prev.currentPlayer : ((player === 0 ? 1 : 0) as 0 | 1),
          message: gameOver
            ? `Player ${player + 1} wins!`
            : `${outcome === 'ladder' ? 'Ladder' : 'Snake'}! → cell ${newCell}`,
        }
      })
    },
    [addLog],
  )

  // ── Setup actions ──

  const selectQubit = useCallback((configIndex: number) => {
    setState((prev) => {
      if (prev.phase !== 'setup') return prev
      if (!prev.setupRemaining[prev.currentPlayer].includes(configIndex)) return prev
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
  }, [])

  const randomPlaceAll = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== 'setup') return prev

      const player = prev.currentPlayer
      const remaining = prev.setupRemaining[player]
      if (remaining.length === 0) return prev

      const occupiedCells = prev.qubits.map((q) => q.cell)
      const newQubits = [...prev.qubits]
      const newRemaining: [number[], number[]] = [
        [...prev.setupRemaining[0]],
        [...prev.setupRemaining[1]],
      ]

      for (const configIndex of [...remaining]) {
        let cell: number
        do {
          cell = PLACEMENT_MIN + Math.floor(Math.random() * (PLACEMENT_MAX - PLACEMENT_MIN + 1))
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
  }, [])

  const confirmPass = useCallback(() => {
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
  }, [])

  // ── Play action ──

  const handleRoll = useCallback(async () => {
    const snap = stateRef.current
    if (snap.phase !== 'play' || snap.isRolling || snap.gameOver || collapseMutation.isPending) {
      return
    }

    setState((prev) => ({ ...prev, isRolling: true, message: '' }))

    const die = rollDie()
    await sleep(400)

    const current = stateRef.current
    if (!current.isRolling) return

    const player = current.currentPlayer
    const currentCell = current.positions[player]
    let targetCell = currentCell + die

    if (targetCell > TOTAL_CELLS) {
      targetCell = TOTAL_CELLS - (targetCell - TOTAL_CELLS)
    }

    const msg = `Rolled ${die}: cell ${currentCell} → ${targetCell}`
    const newPositions: [number, number] = [...current.positions]
    newPositions[player] = targetCell

    if (targetCell === TOTAL_CELLS) {
      setState((prev) => ({
        ...prev,
        positions: newPositions,
        dice: die,
        isRolling: false,
        gameOver: true,
        phase: 'gameover' as GamePhase,
        message: `Player ${player + 1} wins! ${msg}`,
      }))
      return
    }

    const qubitOnCell = current.qubits.find(
      (q) => q.cell === targetCell && q.collapsed === null,
    )

    if (qubitOnCell) {
      setState((prev) => ({
        ...prev,
        positions: newPositions,
        dice: die,
        isRolling: false,
        isCollapsing: true,
        message: `${msg} | Quantum measurement...`,
      }))
      collapseMutation.mutate({ qubit: qubitOnCell, player, targetCell })
    } else {
      setState((prev) => ({
        ...prev,
        positions: newPositions,
        dice: die,
        isRolling: false,
        message: msg,
        currentPlayer: (player === 0 ? 1 : 0) as 0 | 1,
      }))
    }
  }, [collapseMutation])

  // ── Reset ──

  const reset = useCallback(() => {
    qubitIdCounter = 0
    logsRef.current = []
    setState({
      ...INITIAL_STATE,
      setupRemaining: [[...INITIAL_SETUP[0]], [...INITIAL_SETUP[1]]],
      logs: [],
    })
  }, [])

  return { state, selectQubit, placeQubit, randomPlaceAll, confirmPass, handleRoll, reset }
}
