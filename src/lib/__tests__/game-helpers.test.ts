import { afterEach, describe, expect, it, vi } from 'vitest'
import { computeDisplacement } from '@/lib/game-helpers'

// Silent log collector — matches the addLog signature used in production.
function makeLogger(): (type: string, message: string) => void {
  return () => {}
}

afterEach(() => {
  vi.restoreAllMocks()
})

// Helper: stub Math.random to return values from a fixed sequence.
// After the sequence is exhausted it cycles back to 0 (die = 1).
function mockRandomSequence(values: number[]) {
  let i = 0
  vi.spyOn(Math, 'random').mockImplementation(() => {
    const v = values[i % values.length]
    i++
    return v
  })
}

// rollDie() = Math.floor(random * 6) + 1
// random = 0      → die 1
// random ≈ 0.167  → die 2
// random ≈ 0.334  → die 3
// random = 0.5    → die 4
// random ≈ 0.667  → die 5
// random = 0.84   → die 6
const R = {
  die1: 0,       // floor(0 * 6) + 1 = 1
  die2: 1 / 6,   // floor(1) + 1 = 2
  die3: 2 / 6,   // floor(2) + 1 = 3
  die4: 0.5,     // floor(3) + 1 = 4
  die5: 4 / 6,   // floor(4) + 1 = 5
  die6: 0.84,    // floor(5.04) + 1 = 6
}

describe('computeDisplacement — snake directionality invariant', () => {
  it('snake on row 0 (cell 6): without fix would yield newCell >= targetCell; fix clamps to targetCell - 1', () => {
    // cell 6 → coord {col:5, row:0}
    // xRoll=4 → dx=+2; yRoll1=1,yRoll2=1 → yMag=1, dy=-1
    // newRow = clamp(0 - 1, 0, 9) = 0  (row stays 0 — the bug trigger)
    // newCol = wrapCol(5 + 2) = 7
    // coordToCell(7, 0) = 8  (8 >= 6 → bug without fix)
    // With fix: adjusted = max(1, 6 - 1) = 5
    mockRandomSequence([R.die4, R.die1, R.die1])
    const result = computeDisplacement('snake', 6, makeLogger())
    expect(result).toBeLessThan(6)
    expect(result).toBeGreaterThanOrEqual(1)
    expect(result).toBe(5)
  })

  it('snake on row 0 (cell 1): clamp lower bound never returns 0 or negative', () => {
    // cell 1 → coord {col:0, row:0}
    // xRoll=6 → dx=+3; yRoll1=1,yRoll2=1 → yMag=1, dy=-1
    // newRow = clamp(0 - 1, 0, 9) = 0
    // newCol = wrapCol(0 + 3) = 3
    // coordToCell(3, 0) = 4  (4 >= 1 → bug without fix)
    // With fix: adjusted = max(1, 1 - 1) = max(1, 0) = 1
    mockRandomSequence([R.die6, R.die1, R.die1])
    const result = computeDisplacement('snake', 1, makeLogger())
    expect(result).toBeGreaterThanOrEqual(1)
    expect(result).toBe(1)
  })

  it('snake on mid-board (cell 50) is not affected by the clamp when newCell is already lower', () => {
    // cell 50 → coord: row=floor(49/10)=4, col=49%10=9; row 4 is even → col=9
    // xRoll=1 → dx=-1; yRoll1=1,yRoll2=1 → yMag=1, dy=-1
    // newRow = clamp(4 - 1, 0, 9) = 3
    // newCol = wrapCol(9 - 1) = 8
    // row 3 is odd → actualCol = 10-1-8 = 1 → coordToCell = 3*10 + 1 + 1 = 32
    // 32 < 50 → invariant satisfied, no clamp triggered
    mockRandomSequence([R.die1, R.die1, R.die1])
    const result = computeDisplacement('snake', 50, makeLogger())
    expect(result).toBeLessThan(50)
    expect(result).toBeGreaterThanOrEqual(1)
  })
})

describe('computeDisplacement — ladder directionality invariant', () => {
  it('ladder on row 9 (cell 95): without fix would yield newCell <= targetCell; fix clamps to targetCell + 1', () => {
    // cell 95 → coord: row=floor(94/10)=9, col=94%10=4; row 9 is odd → col=10-1-4=5
    // xRoll=6 → dx=+3; yRoll1=1,yRoll2=1 → yMag=1, dy=+1
    // newRow = clamp(9 + 1, 0, 9) = 9  (row stays 9 — the bug trigger)
    // newCol = wrapCol(5 + 3) = 8
    // row 9 odd → actualCol = 10-1-8 = 1 → coordToCell = 9*10 + 1 + 1 = 92
    // 92 <= 95 → bug without fix
    // With fix: adjusted = min(100, 95 + 1) = 96
    mockRandomSequence([R.die6, R.die1, R.die1])
    const result = computeDisplacement('ladder', 95, makeLogger())
    expect(result).toBeGreaterThan(95)
    expect(result).toBeLessThanOrEqual(100)
    expect(result).toBe(96)
  })

  it('ladder on mid-board (cell 50) is not affected by the clamp when newCell is already higher', () => {
    // cell 50 → coord: row=4, col=9 (even row)
    // xRoll=1 → dx=-1; yRoll1=1,yRoll2=1 → yMag=1, dy=+1
    // newRow = clamp(4 + 1, 0, 9) = 5
    // newCol = wrapCol(9 - 1) = 8
    // row 5 is odd → actualCol = 10-1-8 = 1 → coordToCell = 5*10 + 1 + 1 = 52
    // 52 > 50 → invariant satisfied, no clamp triggered
    mockRandomSequence([R.die1, R.die1, R.die1])
    const result = computeDisplacement('ladder', 50, makeLogger())
    expect(result).toBeGreaterThan(50)
    expect(result).toBeLessThanOrEqual(100)
  })
})

describe('computeDisplacement — invariant holds across many random rolls', () => {
  it('snake outcome always produces result < targetCell for cell 6', () => {
    // Run 200 calls with free Math.random; the fix must guarantee result < 6 for every call.
    for (let i = 0; i < 200; i++) {
      const result = computeDisplacement('snake', 6, makeLogger())
      expect(result).toBeLessThan(6)
      expect(result).toBeGreaterThanOrEqual(1)
    }
  })

  it('ladder outcome always produces result > targetCell for cell 95', () => {
    for (let i = 0; i < 200; i++) {
      const result = computeDisplacement('ladder', 95, makeLogger())
      expect(result).toBeGreaterThan(95)
      expect(result).toBeLessThanOrEqual(100)
    }
  })
})
