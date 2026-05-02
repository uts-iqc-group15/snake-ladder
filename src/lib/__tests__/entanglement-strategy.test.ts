import { describe, expect, it } from 'vitest'
import {
  basicBellStrategy,
  biasedBellStrategy,
} from '@/lib/entanglement-strategy'

describe('biasedBellStrategy.parseResult', () => {
  // m0=player visible, m1=partner visible, m2=type (0=ladder, 1=snake)
  it('m0=0, m1=0, m2=0 → ladder / ladder', () => {
    expect(biasedBellStrategy.parseResult([0, 0, 0, 0])).toEqual({
      playerOutcome: 'ladder',
      partnerOutcome: 'ladder',
    })
  })

  it('m0=0, m1=0, m2=1 → snake / snake', () => {
    expect(biasedBellStrategy.parseResult([0, 0, 1, 1])).toEqual({
      playerOutcome: 'snake',
      partnerOutcome: 'snake',
    })
  })

  it('m0=0, m1=1, m2=0 → ladder / interference', () => {
    expect(biasedBellStrategy.parseResult([0, 1, 0, 0])).toEqual({
      playerOutcome: 'ladder',
      partnerOutcome: 'interference',
    })
  })

  it('m0=0, m1=1, m2=1 → snake / interference', () => {
    expect(biasedBellStrategy.parseResult([0, 1, 1, 1])).toEqual({
      playerOutcome: 'snake',
      partnerOutcome: 'interference',
    })
  })

  it('m0=1, m1=0, m2=0 → interference / ladder', () => {
    expect(biasedBellStrategy.parseResult([1, 0, 0, 0])).toEqual({
      playerOutcome: 'interference',
      partnerOutcome: 'ladder',
    })
  })

  it('m0=1, m1=0, m2=1 → interference / snake', () => {
    expect(biasedBellStrategy.parseResult([1, 0, 1, 1])).toEqual({
      playerOutcome: 'interference',
      partnerOutcome: 'snake',
    })
  })

  it('m0=1, m1=1, m2=0 → interference / interference', () => {
    expect(biasedBellStrategy.parseResult([1, 1, 0, 0])).toEqual({
      playerOutcome: 'interference',
      partnerOutcome: 'interference',
    })
  })

  it('m0=1, m1=1, m2=1 → interference / interference', () => {
    expect(biasedBellStrategy.parseResult([1, 1, 1, 1])).toEqual({
      playerOutcome: 'interference',
      partnerOutcome: 'interference',
    })
  })
})

describe('biasedBellStrategy.buildQASM', () => {
  it('emits 4-qubit QASM with rz gate when phase != 0', () => {
    const qasm = biasedBellStrategy.buildQASM({
      thetaA: 0.862,
      thetaB: 1.58,
      phase: 0.72,
    })
    expect(qasm).toContain('qreg q[4]')
    expect(qasm).toContain('creg c[4]')
    expect(qasm).toContain('ry(1.580) q[1]')
    expect(qasm).toContain('ry(0.862) q[0]')
    expect(qasm).toContain('z q[1]')
    expect(qasm).toContain('rz(0.720) q[0]')
    expect(qasm).toContain('h q[0]')
    expect(qasm).toContain('cx q[0], q[1]')
    expect(qasm).toContain('h q[2]')
    expect(qasm).toContain('cx q[2], q[3]')
    expect(qasm).toContain('measure q[0] -> c[0]')
    expect(qasm).toContain('measure q[1] -> c[1]')
    expect(qasm).toContain('measure q[2] -> c[2]')
    expect(qasm).toContain('measure q[3] -> c[3]')
  })

  it('omits rz gate when phase is 0', () => {
    const qasm = biasedBellStrategy.buildQASM({
      thetaA: 0.862,
      thetaB: 1.58,
      phase: 0,
    })
    expect(qasm).not.toContain('rz')
  })
})

describe('basicBellStrategy.parseResult', () => {
  it('00 → ladder / ladder', () => {
    expect(basicBellStrategy.parseResult([0, 0])).toEqual({
      playerOutcome: 'ladder',
      partnerOutcome: 'ladder',
    })
  })

  it('11 → snake / snake', () => {
    expect(basicBellStrategy.parseResult([1, 1])).toEqual({
      playerOutcome: 'snake',
      partnerOutcome: 'snake',
    })
  })

  it('01 → interference / interference (degenerate case)', () => {
    expect(basicBellStrategy.parseResult([0, 1])).toEqual({
      playerOutcome: 'interference',
      partnerOutcome: 'interference',
    })
  })

  it('10 → interference / interference (symmetric degenerate case)', () => {
    expect(basicBellStrategy.parseResult([1, 0])).toEqual({
      playerOutcome: 'interference',
      partnerOutcome: 'interference',
    })
  })

  it('throws when measurement array is shorter than 2 bits', () => {
    expect(() => basicBellStrategy.parseResult([])).toThrow(/≥2 bits/)
    expect(() => basicBellStrategy.parseResult([0])).toThrow(/≥2 bits/)
  })
})

describe('biasedBellStrategy.parseResult input validation', () => {
  it('throws when measurement array is shorter than 3 bits', () => {
    expect(() => biasedBellStrategy.parseResult([])).toThrow(/≥3 bits/)
    expect(() => biasedBellStrategy.parseResult([0, 0])).toThrow(/≥3 bits/)
  })
})
