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
  parseResult(m0: number, m1: number): EntanglementParsed
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
  parseResult(m0, m1) {
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
 * Biased strategy with split semantics:
 *   q[0] (player's qubit): 0 → ladder, 1 → snake
 *   q[1] (partner flag):   0 → partner stays active (re-measured later),
 *                          1 → partner is cancelled (interference, no movement)
 */
export const biasedBellStrategy: EntanglementStrategy = {
  name: 'biased',
  label: 'Biased Bell (Ry → Z → Rz → H → CNOT)',
  buildQASM(ctx) {
    const phase = ctx.phase ?? 0
    const fmt = (n: number) => n.toFixed(3)
    const lines = [
      'OPENQASM 2.0;',
      'qreg q[2];',
      'creg c[2];',
      `ry(${fmt(ctx.thetaB)}) q[1];`,
      `ry(${fmt(ctx.thetaA)}) q[0];`,
      'z q[1];',
    ]
    if (phase !== 0) lines.push(`rz(${fmt(phase)}) q[0];`)
    lines.push('h q[0];', 'cx q[0], q[1];')
    lines.push('measure q[0] -> c[0];', 'measure q[1] -> c[1];')
    return lines.join('\n')
  },
  describe(ctx) {
    const phase = ctx.phase ?? 0
    return [
      `Circuit: Ry(${ctx.thetaB.toFixed(3)}) q[1] · Ry(${ctx.thetaA.toFixed(3)}) q[0] · Z q[1]${
        phase ? ` · Rz(${phase.toFixed(3)}) q[0]` : ''
      } · H q[0] · CNOT(q[0],q[1])`,
      'Mapping: q[0] 0→ladder / 1→snake (player), q[1] 0→partner active / 1→partner cancelled',
    ]
  },
  parseResult(m0, m1) {
    const playerOutcome: EntanglementOutcome = m0 === 0 ? 'ladder' : 'snake'
    const partnerOutcome: EntanglementOutcome | null =
      m1 === 0 ? null : 'interference'
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
