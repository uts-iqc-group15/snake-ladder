import { describe, expect, it } from 'vitest'
import {
  buildCurveSamples,
  isResonant,
  tunnelPassProbability,
  BARRIER_THETA,
} from '@/lib/tunnel-circuit'

const TWO_PI = 2 * Math.PI
const TOL = 1e-9

// ── buildCurveSamples ────────────────────────────────────────────────────────

describe('buildCurveSamples', () => {
  it('returns arrays of length 120', () => {
    const { phis, probs } = buildCurveSamples(BARRIER_THETA)
    expect(phis).toHaveLength(120)
    expect(probs).toHaveLength(120)
  })

  it('phi 배열의 첫 값은 0, 마지막 값은 2π', () => {
    const { phis } = buildCurveSamples(BARRIER_THETA)
    expect(phis[0]).toBeCloseTo(0, 10)
    expect(phis[119]).toBeCloseTo(TWO_PI, 10)
  })

  it('probs 값은 모두 [0, 1] 범위', () => {
    const { probs } = buildCurveSamples(BARRIER_THETA)
    for (let i = 0; i < probs.length; i++) {
      expect(probs[i]).toBeGreaterThanOrEqual(0)
      expect(probs[i]).toBeLessThanOrEqual(1 + TOL)
    }
  })

  it('probs[0] = tunnelPassProbability(theta, 0) (φ=0, 최대)', () => {
    const theta = BARRIER_THETA
    const { probs } = buildCurveSamples(theta)
    expect(probs[0]).toBeCloseTo(tunnelPassProbability(theta, 0), 10)
  })

  it('probs 중 φ≈π 근처에서 거의 0 (파괴적 간섭)', () => {
    const { phis, probs } = buildCurveSamples(BARRIER_THETA)
    // 가장 π에 가까운 샘플을 찾는다
    let minDiff = Infinity
    let minProb = 1
    for (let i = 0; i < phis.length; i++) {
      const diff = Math.abs(phis[i] - Math.PI)
      if (diff < minDiff) {
        minDiff = diff
        minProb = probs[i]
      }
    }
    // φ=π에서는 P=0이어야 하므로 근방 샘플은 매우 작아야 함
    expect(minProb).toBeLessThan(0.01)
  })

  it('theta를 다르게 하면 probs[0]이 달라진다', () => {
    const { probs: probs1 } = buildCurveSamples(0.5)
    const { probs: probs2 } = buildCurveSamples(1.2)
    // sin²(0.5) ≠ sin²(1.2)
    expect(probs1[0]).not.toBeCloseTo(probs2[0], 5)
  })

  it('같은 θ로 두 번 호출하면 동일한 배열을 반환', () => {
    const r1 = buildCurveSamples(BARRIER_THETA)
    const r2 = buildCurveSamples(BARRIER_THETA)
    expect(Array.from(r1.phis)).toEqual(Array.from(r2.phis))
    expect(Array.from(r1.probs)).toEqual(Array.from(r2.probs))
  })
})

// ── isResonant ───────────────────────────────────────────────────────────────

describe('isResonant', () => {
  it('φ=0 에서 공명 (cos²(0/2)=1 > 0.9)', () => {
    expect(isResonant(0)).toBe(true)
  })

  it('φ=2π 에서 공명 (cos²(π)=1 > 0.9)', () => {
    expect(isResonant(TWO_PI)).toBe(true)
  })

  it('φ=π 에서 비공명 (cos²(π/2)=0 < 0.9)', () => {
    expect(isResonant(Math.PI)).toBe(false)
  })

  it('φ=π/2 에서 비공명 (cos²(π/4) ≈ 0.5 < 0.9)', () => {
    expect(isResonant(Math.PI / 2)).toBe(false)
  })

  it('공명 임계값 근방(0.9) 경계 검증', () => {
    // cos²(φ/2) = 0.9  →  φ/2 = arccos(√0.9)  →  φ = 2·arccos(√0.9)
    const phiBoundary = 2 * Math.acos(Math.sqrt(0.9))
    // 경계 바로 아래(작은 φ, 더 공명 방향)는 true
    expect(isResonant(phiBoundary * 0.99)).toBe(true)
    // 경계 바로 위는 false
    expect(isResonant(phiBoundary * 1.01)).toBe(false)
  })

  it('같은 칸이라도 pathLength 달라 φ 다르면 공명 판정이 다를 수 있다', () => {
    // pathLength=0 → φ=0 → 공명
    // pathLength=4 → φ=π → 비공명
    const phi0 = 0
    const phiPi = Math.PI
    expect(isResonant(phi0)).toBe(true)
    expect(isResonant(phiPi)).toBe(false)
  })
})
