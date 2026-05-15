import { describe, expect, it } from 'vitest'
import { simulateLocally } from '@/lib/local-sim'
import { buildSingleQubitQASM } from '@/lib/qasm-builder'
import { biasedBellStrategy, basicBellStrategy } from '@/lib/entanglement-strategy'

const N = 5000
const TOL = 0.04

describe('local-sim — single qubit Ry', () => {
  it('P(measure=0) ≈ ladderProb', () => {
    const ladderProb = 0.7
    const qasm = buildSingleQubitQASM(ladderProb)
    const rows = simulateLocally(qasm, N)
    const zeros = rows.filter((r) => r[0] === 0).length
    expect(Math.abs(zeros / N - ladderProb)).toBeLessThan(TOL)
  })
})

describe('local-sim — basic Bell', () => {
  it('produces only correlated 00 or 11 with 50/50 split', () => {
    const qasm = basicBellStrategy.buildQASM({ thetaA: 0, thetaB: 0 })
    const rows = simulateLocally(qasm, N)
    for (const r of rows) expect(r[0]).toBe(r[1])
    const zeros = rows.filter((r) => r[0] === 0).length
    expect(Math.abs(zeros / N - 0.5)).toBeLessThan(TOL)
  })
})

describe('local-sim — biased Bell (4 qubits)', () => {
  it('joint (m0,m1) distribution matches analytical formula', () => {
    const ctx = { thetaA: 0.862, thetaB: 1.58, phase: 0.72 }
    const qasm = biasedBellStrategy.buildQASM(ctx)
    const rows = simulateLocally(qasm, N)
    const counts = { '00': 0, '01': 0, '10': 0, '11': 0 } as Record<string, number>
    for (const r of rows) counts[`${r[1]}${r[0]}`]++

    // Analytical (see local-sim.ts derivation):
    //   |A|² = (1 + sin(θa)·cos(φ))/2,  |B|² = (1 − sin(θa)·cos(φ))/2
    //   P(m1=q1, m0=q0) = (q1?sb²:cb²) · (q0?|B|²:|A|²)  where the q0 axis is swapped by CX:
    //     P(m1=0,m0=0)=cb²·|A|², P(m1=0,m0=1)=sb²·|B|²,
    //     P(m1=1,m0=0)=sb²·|A|², P(m1=1,m0=1)=cb²·|B|²
    const cb2 = Math.cos(ctx.thetaB / 2) ** 2
    const sb2 = Math.sin(ctx.thetaB / 2) ** 2
    const k = Math.sin(ctx.thetaA) * Math.cos(ctx.phase)
    const A2 = (1 + k) / 2
    const B2 = (1 - k) / 2
    const expected = {
      '00': cb2 * A2,
      '01': sb2 * B2,
      '10': sb2 * A2,
      '11': cb2 * B2,
    }
    for (const key of ['00', '01', '10', '11'] as const) {
      expect(Math.abs(counts[key] / N - expected[key])).toBeLessThan(TOL)
    }
  })

  it('m2 and m3 are always correlated (Bell pair)', () => {
    const qasm = biasedBellStrategy.buildQASM({ thetaA: 0.862, thetaB: 1.58, phase: 0.72 })
    const rows = simulateLocally(qasm, N)
    for (const r of rows) expect(r[2]).toBe(r[3])
  })
})
