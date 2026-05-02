import {
  BOARD_SIZE,
  QUBIT_CONFIGS,
  TOTAL_CELLS,
  X_VECTOR_TABLE,
  Y_VECTOR_MATRIX,
  cellToCoord,
  coordToCell,
  clamp,
} from '@/constants/board'
import type { GameState, LogEntry, PlacedQubit } from '@/types/game'

export const HOP_MS = 140
export const LADDER_STEP_MS = 70
export const SNAKE_STEP_MS = 60

export const INITIAL_SETUP: [number[], number[]] = [
  [0, 1, 2, 3, 4],
  [0, 1, 2, 3, 4],
]

export const INITIAL_STATE: GameState = {
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
  slidingPlayer: null,
  gameOver: false,
  logs: [],
}

export function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

let qubitIdCounter = 0
export function nextQubitId(): string {
  return `qb_${++qubitIdCounter}`
}
export function resetQubitIdCounter(): void {
  qubitIdCounter = 0
}

export function wrapCol(col: number): number {
  return ((col % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE
}

export function linkEntangledQubits(qubits: PlacedQubit[]): PlacedQubit[] {
  const entangled = qubits.filter((q) => QUBIT_CONFIGS[q.configIndex].entangled)
  if (entangled.length !== 2) return qubits
  const [a, b] = entangled
  return qubits.map((q) => {
    if (q.id === a.id) return { ...q, entangledPartnerId: b.id }
    if (q.id === b.id) return { ...q, entangledPartnerId: a.id }
    return q
  })
}

export function computeDisplacement(
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
  const newCell = coordToCell(newCol, newRow)

  if (outcome === 'snake' && newCell >= targetCell) {
    const adjusted = Math.max(1, targetCell - 1)
    addLog('info', `Snake clamped: would have landed on ${newCell} (≥ ${targetCell}); falling back to ${adjusted}`)
    return adjusted
  }
  if (outcome === 'ladder' && newCell <= targetCell) {
    const adjusted = Math.min(TOTAL_CELLS, targetCell + 1)
    addLog('info', `Ladder clamped: would have landed on ${newCell} (≤ ${targetCell}); falling back to ${adjusted}`)
    return adjusted
  }
  return newCell
}
