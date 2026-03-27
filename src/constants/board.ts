export const BOARD_SIZE = 10
export const TOTAL_CELLS = BOARD_SIZE * BOARD_SIZE

export const SNAKES: Record<number, number> = {
  16: 6,
  47: 26,
  49: 11,
  56: 53,
  62: 19,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  98: 78,
}

export const LADDERS: Record<number, number> = {
  1: 38,
  4: 14,
  9: 31,
  21: 42,
  28: 84,
  36: 44,
  51: 67,
  71: 91,
  80: 100,
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

// Y_VECTOR_MATRIX[dice1 - 1][dice2 - 1] → Y magnitude
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
