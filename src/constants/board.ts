export const BOARD_SIZE = 10
export const TOTAL_CELLS = BOARD_SIZE * BOARD_SIZE

// Qubit placement: must be at least 5 tiles from start (1) and end (100)
export const PLACEMENT_MIN = 6
export const PLACEMENT_MAX = 95

/**
 * entangledParams (entangled cells only): direct rotation angles for the biased
 * Bell circuit `Ry(θ_b) q[1] · Ry(θ_a) q[0] · Z q[1] · Rz(φ) q[0] · H q[0] · CX`.
 *   thetaA → Ry on q[0] (player's qubit)
 *   thetaB → Ry on q[1] (partner-appears flag)
 *   phase  → Rz on q[0] (correlation skew)
 */
export interface QubitConfig {
  label: string
  ladderProb: number
  snakeProb: number
  entangled: boolean
  entangledParams?: {
    thetaA: number
    thetaB: number
    phase: number
  }
}

export const QUBIT_CONFIGS: QubitConfig[] = [
  { label: '90/10', ladderProb: 0.9, snakeProb: 0.1, entangled: false },
  { label: '60/40', ladderProb: 0.6, snakeProb: 0.4, entangled: false },
  { label: '40/60', ladderProb: 0.4, snakeProb: 0.6, entangled: false },
  { label: '10/90', ladderProb: 0.1, snakeProb: 0.9, entangled: false },
  {
    // Sarah's circuit: ~40/40/10/10 over (m1 m0) ∈ {00,01,10,11}.
    // Player marginal P(m0=0)=0.5, partner-appears marginal P(m1=0)=0.8.
    label: '50/50',
    ladderProb: 0.5,
    snakeProb: 0.5,
    entangled: true,
    entangledParams: {
      thetaA: 0.862,
      thetaB: 1.58,
      phase: 0.72,
    },
  },
]

export function isValidPlacement(cell: number, occupiedCells: number[]): boolean {
  return cell >= PLACEMENT_MIN && cell <= PLACEMENT_MAX && !occupiedCells.includes(cell)
}

// Roll → { magnitude, direction: -1 | 1 }
export const X_VECTOR_TABLE: Record<number, { magnitude: number; direction: -1 | 1 }> = {
  1: { magnitude: 1, direction: -1 },
  2: { magnitude: 1, direction: 1 },
  3: { magnitude: 2, direction: -1 },
  4: { magnitude: 2, direction: 1 },
  5: { magnitude: 3, direction: -1 },
  6: { magnitude: 3, direction: 1 },
}

// Y_VECTOR_MATRIX[dice1 - 1][dice2 - 1] → Y magnitude = ceil((d1+d2)/2)
export const Y_VECTOR_MATRIX: number[][] = [
  [1, 2, 2, 3, 3, 4],
  [2, 2, 2, 3, 4, 4],
  [2, 3, 3, 3, 4, 5],
  [3, 3, 3, 4, 5, 5],
  [3, 4, 4, 4, 5, 6],
  [4, 4, 4, 5, 6, 6],
]

export interface Coord {
  col: number
  row: number
}

export function cellToCoord(cell: number): Coord {
  const row = Math.floor((cell - 1) / BOARD_SIZE)
  let col = (cell - 1) % BOARD_SIZE
  if (row % 2 === 1) col = BOARD_SIZE - 1 - col
  return { col, row }
}

export function coordToCell(col: number, row: number): number {
  const actualCol = row % 2 === 1 ? BOARD_SIZE - 1 - col : col
  return row * BOARD_SIZE + actualCol + 1
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
