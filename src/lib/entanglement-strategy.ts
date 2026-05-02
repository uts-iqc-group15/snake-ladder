export type EntanglementOutcome = 'snake' | 'ladder' | 'interference'

export type EntanglementStrategyName = 'basic' | 'biased'

export interface EntanglementContext {
  /** Ry rotation angle (radians) on q[0] — biases the player's qubit. */
  thetaA: number
  /** Ry rotation angle (radians) on q[1] — biases the partner-appears flag. */
  thetaB: number
  /** Optional Rz phase on q[0]. Default 0 (Rz omitted from circuit). */
  phase?: number
}

/**
 * playerOutcome: snake/ladder/interference for the qubit the player landed on.
 * partnerOutcome:
 *   - 'snake' | 'ladder': partner is jointly resolved (basic Bell).
 *   - 'interference': partner is cancelled (won't trigger when landed on later).
 *   - null: partner stays uncollapsed; next visit measures it independently.
 */
export interface EntanglementParsed {
  playerOutcome: EntanglementOutcome
  partnerOutcome: EntanglementOutcome | null
}

export interface EntanglementStrategy {
  readonly name: EntanglementStrategyName
  readonly label: string
  buildQASM(ctx: EntanglementContext): string
  describe(ctx: EntanglementContext): string[]
  /**
   * Parse measurement bits from a Quokka result row into player/partner outcomes.
   *
   * Bit ordering convention (matches use-collapse.ts `result[0][i]`):
   *   measurements[0] = m0 = q[0] measurement
   *   measurements[1] = m1 = q[1] measurement
   *   measurements[2] = m2 = q[2] measurement  (4-qubit strategies only)
   *   measurements[3] = m3 = q[3] measurement  (4-qubit strategies only)
   *
   * Callers pass the full result row; strategies consume only what they need.
   */
  parseResult(measurements: readonly number[]): EntanglementParsed
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
  parseResult(measurements) {
    if (measurements.length < 2) {
      throw new Error(
        `basicBellStrategy.parseResult: expected ≥2 bits, got ${measurements.length}`,
      )
    }
    const [m0, m1] = measurements
    if (m0 === 0 && m1 === 0) {
      return { playerOutcome: 'ladder', partnerOutcome: 'ladder' }
    }
    if (m0 === 1 && m1 === 1) {
      return { playerOutcome: 'snake', partnerOutcome: 'snake' }
    }
    return { playerOutcome: 'interference', partnerOutcome: 'interference' }
  },
}

/**
 * Biased strategy with 4-qubit circuit (Sarah's spec):
 *
 *   q[0]/q[1] — biased pair (Ry → Z → Rz → H → CNOT) decide *visibility*:
 *     m0 = 0 → player's tile fires   | m0 = 1 → player interference (no move)
 *     m1 = 0 → partner's tile fires  | m1 = 1 → partner interference (no move)
 *
 *   q[2]/q[3] — pure Bell pair (H → CNOT) decide *type* (always m2 == m3):
 *     m2 = 0 → both tiles are ladders
 *     m2 = 1 → both tiles are snakes
 *
 * Outcome table (m3 is always equal to m2, not independently used):
 *   m0  m1  m2 | playerOutcome  partnerOutcome
 *   0   0   0  | ladder         ladder
 *   0   0   1  | snake          snake
 *   0   1   0  | ladder         interference
 *   0   1   1  | snake          interference
 *   1   0   0  | interference   ladder
 *   1   0   1  | interference   snake
 *   1   1   *  | interference   interference
 */
export const biasedBellStrategy: EntanglementStrategy = {
  name: 'biased',
  label: 'Biased visibility + Bell type (4 qubits)',
  buildQASM(ctx) {
    const phase = ctx.phase ?? 0
    const fmt = (n: number) => n.toFixed(3)
    const lines = [
      'OPENQASM 2.0;',
      'qreg q[4];',
      'creg c[4];',
      `ry(${fmt(ctx.thetaB)}) q[1];`,
      `ry(${fmt(ctx.thetaA)}) q[0];`,
      'z q[1];',
    ]
    if (phase !== 0) lines.push(`rz(${fmt(phase)}) q[0];`)
    lines.push(
      'h q[0];',
      'cx q[0], q[1];',
      'h q[2];',
      'cx q[2], q[3];',
      'measure q[0] -> c[0];',
      'measure q[1] -> c[1];',
      'measure q[2] -> c[2];',
      'measure q[3] -> c[3];',
    )
    return lines.join('\n')
  },
  describe(ctx) {
    const phase = ctx.phase ?? 0
    return [
      `Circuit (4 qubits): Ry(${ctx.thetaB.toFixed(3)}) q[1] · Ry(${ctx.thetaA.toFixed(3)}) q[0] · Z q[1]${
        phase ? ` · Rz(${phase.toFixed(3)}) q[0]` : ''
      } · H q[0] · CNOT(q[0],q[1]) | H q[2] · CNOT(q[2],q[3])`,
      'Mapping: q[0]=player visible (0→fires, 1→interference), q[1]=partner visible (0→fires, 1→interference)',
      'Mapping: q[2]/q[3]=Bell type, always correlated (0→ladder, 1→snake)',
    ]
  },
  parseResult(measurements) {
    if (measurements.length < 3) {
      throw new Error(
        `biasedBellStrategy.parseResult: expected ≥3 bits, got ${measurements.length}`,
      )
    }
    const [m0, m1, m2] = measurements
    const playerOutcome: EntanglementOutcome =
      m0 === 1 ? 'interference' : m2 === 0 ? 'ladder' : 'snake'
    const partnerOutcome: EntanglementOutcome =
      m1 === 1 ? 'interference' : m2 === 0 ? 'ladder' : 'snake'
    return { playerOutcome, partnerOutcome }
  },
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
