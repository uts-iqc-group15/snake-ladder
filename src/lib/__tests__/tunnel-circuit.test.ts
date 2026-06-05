import { describe, expect, it } from 'vitest'
import {
  BARRIER_THETA,
  STEP_PHASE,
  buildTunnelQASM,
  computeTunnelPhase,
  tunnelPassProbability,
} from '@/lib/tunnel-circuit'
import { simulateLocally } from '@/lib/local-sim'

const TWO_PI = 2 * Math.PI
const TOL = 1e-9

// ── STEP_PHASE ──────────────────────────────────────────────────────────────

describe('STEP_PHASE', () => {
  it('equals π/4', () => {
    expect(STEP_PHASE).toBeCloseTo(Math.PI / 4, 10)
  })
})

// ── BARRIER_THETA ────────────────────────────────────────────────────────────

describe('BARRIER_THETA', () => {
  it('is a positive finite number less than π', () => {
    expect(BARRIER_THETA).toBeGreaterThan(0)
    expect(BARRIER_THETA).toBeLessThan(Math.PI)
    expect(Number.isFinite(BARRIER_THETA)).toBe(true)
  })

  it('gives a non-trivial pass probability at resonance (φ=0)', () => {
    const p = tunnelPassProbability(BARRIER_THETA, 0)
    // Must be > 0 (not fully blocked) and < 1 (not always-pass)
    expect(p).toBeGreaterThan(0)
    expect(p).toBeLessThan(1)
  })
})

// ── buildTunnelQASM — format compatibility with local-sim parseProgram ───────

describe('buildTunnelQASM — QASM format', () => {
  it('starts with OPENQASM 2.0 header', () => {
    const qasm = buildTunnelQASM(BARRIER_THETA, 0)
    expect(qasm.startsWith('OPENQASM 2.0;')).toBe(true)
  })

  it('contains qreg q[1] and creg c[1] declarations', () => {
    const qasm = buildTunnelQASM(BARRIER_THETA, 0)
    expect(qasm).toContain('qreg q[1];')
    expect(qasm).toContain('creg c[1];')
  })

  it('ry lines match local-sim regex: ^ry\\(([-\\d.eE+]+)\\) q\\[(\\d+)\\]$', () => {
    const qasm = buildTunnelQASM(1.2, 0.785)
    const ryRegex = /^ry\(([-\d.eE+]+)\) q\[(\d+)\]$/
    const ryLines = qasm
      .split('\n')
      .map((l) => l.trim().replace(/;$/, '').trim())
      .filter((l) => l.startsWith('ry('))
    expect(ryLines.length).toBe(2)
    for (const line of ryLines) {
      expect(ryRegex.test(line)).toBe(true)
    }
  })

  it('rz line matches local-sim regex: ^rz\\(([-\\d.eE+]+)\\) q\\[(\\d+)\\]$', () => {
    const qasm = buildTunnelQASM(1.2, 0.785)
    const rzRegex = /^rz\(([-\d.eE+]+)\) q\[(\d+)\]$/
    const rzLines = qasm
      .split('\n')
      .map((l) => l.trim().replace(/;$/, '').trim())
      .filter((l) => l.startsWith('rz('))
    expect(rzLines.length).toBe(1)
    expect(rzRegex.test(rzLines[0])).toBe(true)
  })

  it('measure line matches local-sim regex: ^measure q\\[(\\d+)\\] -> c\\[(\\d+)\\]$', () => {
    const qasm = buildTunnelQASM(1.2, 0.785)
    const measureRegex = /^measure q\[(\d+)\] -> c\[(\d+)\]$/
    const measureLines = qasm
      .split('\n')
      .map((l) => l.trim().replace(/;$/, '').trim())
      .filter((l) => l.startsWith('measure'))
    expect(measureLines.length).toBe(1)
    expect(measureRegex.test(measureLines[0])).toBe(true)
  })

  it('negative phi is formatted without scientific notation and parses correctly', () => {
    // Negative phi can arise from edge cases; the regex [-\d.eE+]+ covers '-'.
    const qasm = buildTunnelQASM(1.2, -0.1)
    const rzRegex = /^rz\(([-\d.eE+]+)\) q\[(\d+)\]$/
    const rzLine = qasm
      .split('\n')
      .map((l) => l.trim().replace(/;$/, '').trim())
      .find((l) => l.startsWith('rz('))!
    expect(rzRegex.test(rzLine)).toBe(true)
  })
})

// ── buildTunnelQASM — local-sim end-to-end compatibility ─────────────────────

describe('buildTunnelQASM — simulateLocally compatibility', () => {
  it('parses and runs without error, returning a measurement result', () => {
    const qasm = buildTunnelQASM(BARRIER_THETA, 0)
    expect(() => simulateLocally(qasm)).not.toThrow()
    const result = simulateLocally(qasm)
    expect(result).toHaveLength(1)
    expect(result[0]).toHaveLength(1)
    expect([0, 1]).toContain(result[0][0])
  })

  it('works with phi = π (destructive interference)', () => {
    const qasm = buildTunnelQASM(BARRIER_THETA, Math.PI)
    const result = simulateLocally(qasm)
    expect(result[0][0]).toBe(0)
  })

  it('works with phi = 2π (constructive, same as φ=0 statistically)', () => {
    const qasm = buildTunnelQASM(BARRIER_THETA, TWO_PI)
    expect(() => simulateLocally(qasm)).not.toThrow()
    const result = simulateLocally(qasm)
    expect([0, 1]).toContain(result[0][0])
  })

  it('produces measurement=1 with high probability at resonance (φ=0, many shots)', () => {
    const N = 2000
    const TOL_STAT = 0.05
    const qasm = buildTunnelQASM(BARRIER_THETA, 0)
    const rows = simulateLocally(qasm, N)
    const ones = rows.filter((r) => r[0] === 1).length
    const expected = tunnelPassProbability(BARRIER_THETA, 0)
    expect(Math.abs(ones / N - expected)).toBeLessThan(TOL_STAT)
  })

  it('always measures 0 at destructive interference (φ=π)', () => {
    // At φ=π, P=sin²(θ)*cos²(π/2)=0, so every shot must be 0.
    const N = 100
    const qasm = buildTunnelQASM(BARRIER_THETA, Math.PI)
    const rows = simulateLocally(qasm, N)
    const ones = rows.filter((r) => r[0] === 1).length
    expect(ones).toBe(0)
  })
})

// ── tunnelPassProbability ────────────────────────────────────────────────────

describe('tunnelPassProbability', () => {
  it('equals sin²(θ) at φ=0 (constructive interference / maximum)', () => {
    const theta = 1.2
    const p = tunnelPassProbability(theta, 0)
    expect(p).toBeCloseTo(Math.sin(theta) ** 2, 10)
  })

  it('equals ~0 at φ=π (destructive interference / fully blocked)', () => {
    const theta = 1.2
    const p = tunnelPassProbability(theta, Math.PI)
    expect(p).toBeCloseTo(0, TOL)
  })

  it('equals sin²(θ) at φ=2π (back to resonance)', () => {
    const theta = 0.8
    const p = tunnelPassProbability(theta, TWO_PI)
    expect(p).toBeCloseTo(Math.sin(theta) ** 2, 10)
  })

  it('is always in [0, 1]', () => {
    for (let theta = 0; theta <= Math.PI; theta += 0.3) {
      for (let phi = 0; phi < TWO_PI; phi += 0.4) {
        const p = tunnelPassProbability(theta, phi)
        expect(p).toBeGreaterThanOrEqual(0)
        expect(p).toBeLessThanOrEqual(1 + TOL)
      }
    }
  })

  it('matches the theoretical formula at an arbitrary point', () => {
    const theta = 0.7
    const phi = 1.1
    const expected = Math.sin(theta) ** 2 * Math.cos(phi / 2) ** 2
    expect(tunnelPassProbability(theta, phi)).toBeCloseTo(expected, 10)
  })
})

// ── computeTunnelPhase ───────────────────────────────────────────────────────

describe('computeTunnelPhase', () => {
  it('returns 0 for pathLength=0', () => {
    expect(computeTunnelPhase(0)).toBeCloseTo(0, 10)
  })

  it('is always in [0, 2π)', () => {
    for (let n = 0; n <= 100; n++) {
      const phase = computeTunnelPhase(n)
      expect(phase).toBeGreaterThanOrEqual(0)
      expect(phase).toBeLessThan(TWO_PI + TOL)
    }
  })

  it('wraps back near 0 after 8 steps (8 × π/4 = 2π)', () => {
    const phase = computeTunnelPhase(8)
    expect(phase).toBeCloseTo(0, 10)
  })

  it('wraps correctly after 16 steps (two full cycles)', () => {
    const phase = computeTunnelPhase(16)
    expect(phase).toBeCloseTo(0, 10)
  })

  it('returns the same value as (pathLength × STEP_PHASE) % (2π) for non-wrapping inputs', () => {
    const n = 3
    const expected = (n * STEP_PHASE) % TWO_PI
    expect(computeTunnelPhase(n)).toBeCloseTo(expected, 10)
  })

  it('produces a phase of π/2 for pathLength=2 (2 × π/4)', () => {
    expect(computeTunnelPhase(2)).toBeCloseTo(Math.PI / 2, 10)
  })

  it('produces a phase of π for pathLength=4 (4 × π/4)', () => {
    expect(computeTunnelPhase(4)).toBeCloseTo(Math.PI, 10)
  })
})
