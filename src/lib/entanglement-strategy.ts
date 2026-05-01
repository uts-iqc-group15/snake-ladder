export type EntanglementOutcome = 'snake' | 'ladder' | 'interference'

export type EntanglementStrategyName = 'basic' | 'biased'

export interface EntanglementContext {
  ladderProbA: number
  ladderProbB: number
  /** Optional Rz phase on q[0]. Default 0 (Rz omitted from circuit). */
  phase?: number
}

export interface EntanglementStrategy {
  readonly name: EntanglementStrategyName
  readonly label: string
  buildQASM(ctx: EntanglementContext): string
  describe(ctx: EntanglementContext): string[]
  parseResult(m0: number, m1: number): EntanglementOutcome
}

const sharedParseResult = (m0: number, m1: number): EntanglementOutcome => {
  if (m0 === 0 && m1 === 0) return 'ladder'
  if (m0 === 1 && m1 === 1) return 'snake'
  return 'interference'
}

export const basicBellStrategy: EntanglementStrategy = {
  name: 'basic',
  label: 'Basic Bell',
  buildQASM() {
    return `OPENQASM 2.0;
qreg q[2];
creg c[2];
h q[0];
cx q[0], q[1];
measure q[0] -> c[0];
measure q[1] -> c[1];`
  },
  describe() {
    return [
      'Circuit: H → CNOT creates Bell state (|00⟩+|11⟩)/√2',
      'Outcomes: 00(50%)=both ladders, 11(50%)=both snakes',
    ]
  },
  parseResult: sharedParseResult,
}

export const biasedBellStrategy: EntanglementStrategy = {
  name: 'biased',
  label: 'Biased Bell (Ry → H → CNOT)',
  buildQASM(ctx) {
    const thetaA = 2 * Math.acos(Math.sqrt(ctx.ladderProbA))
    const thetaB = 2 * Math.acos(Math.sqrt(ctx.ladderProbB))
    const phase = ctx.phase ?? 0
    const lines = [
      'OPENQASM 2.0;',
      'qreg q[2];',
      'creg c[2];',
      `ry(${parseFloat(thetaB.toFixed(4))}) q[1];`,
      `ry(${parseFloat(thetaA.toFixed(4))}) q[0];`,
      'z q[1];',
    ]
    if (phase !== 0) lines.push(`rz(${parseFloat(phase.toFixed(4))}) q[0];`)
    lines.push('h q[0];', 'cx q[0], q[1];')
    lines.push('measure q[0] -> c[0];', 'measure q[1] -> c[1];')
    return lines.join('\n')
  },
  describe(ctx) {
    const phase = ctx.phase ?? 0
    return [
      `Circuit: Ry(θ_b)·Ry(θ_a)·Z${phase ? '·Rz(φ)' : ''}·H·CNOT (biased entanglement)`,
      `Per-qubit bias: P(ladder|A)=${ctx.ladderProbA}, P(ladder|B)=${ctx.ladderProbB}`,
      'Outcomes: all four basis states possible; 01/10 → interference',
    ]
  },
  parseResult: sharedParseResult,
}

export const ENTANGLEMENT_STRATEGIES: Record<
  EntanglementStrategyName,
  EntanglementStrategy
> = {
  basic: basicBellStrategy,
  biased: biasedBellStrategy,
}

/** Default strategy used by `useGame()`. Swap here to change game-wide behavior. */
export const DEFAULT_ENTANGLEMENT_STRATEGY: EntanglementStrategy = biasedBellStrategy
