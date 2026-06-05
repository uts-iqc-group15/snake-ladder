/**
 * Quantum tunneling circuit — path-dependent interferometer.
 *
 * The tunnel barrier is modelled as a single-qubit Mach-Zehnder-like
 * interferometer:  ry(θ) · rz(φ) · ry(θ) · measure
 *
 * Pass probability:  P = sin²(θ) · cos²(φ/2)
 *
 * φ is accumulated from the player's travelled path length so the same
 * cell reached via different routes yields different passage rates.
 * This is the path-interference (double-slit) signature that proves the
 * circuit is quantum rather than a biased RNG.
 */

/** Phase accumulation per board step (π/4 → period = 8 steps = 2π). */
export const STEP_PHASE = Math.PI / 4

/**
 * Default barrier rotation angle for one wall layer.
 *
 * Choice rationale:
 *   - θ = π/2  → sin²(θ) = 1  → maximal pass rate; feels like no barrier.
 *   - θ = π    → sin²(θ) = 0  → always blocked; useless.
 *   - θ = 1.2  → sin²(1.2) ≈ 0.864 → baseline pass rate ~86 % at φ=0
 *     (resonance).  At φ=π the term cos²(π/2)=0 so passage is impossible.
 *     The φ-dependent modulation is most dramatic near this value, which
 *     gives players the best "feel" for the wave-like interference effect.
 *
 * We intentionally keep the resonance pass rate high (~86 %) so that
 * tunnelling feels like a real physics effect rather than a coin-flip, while
 * still showing near-zero probability at the destructive-interference point.
 */
export const BARRIER_THETA = 1.2

/**
 * Build an OPENQASM 2.0 string for the tunnel interferometer circuit.
 *
 * Output format is designed to be exactly compatible with the regexes in
 * `local-sim.ts#parseProgram`:
 *   ry line:      /^ry\(([-\d.eE+]+)\) q\[(\d+)\]$/
 *   rz line:      /^rz\(([-\d.eE+]+)\) q\[(\d+)\]$/
 *   measure line: /^measure q\[(\d+)\] -> c\[(\d+)\]$/
 *
 * Numbers are formatted with toFixed(6) — no scientific notation, always has
 * a decimal point, negative numbers include a leading minus which is covered
 * by the `[-\d.eE+]+` character class in the regex.
 */
export function buildTunnelQASM(theta: number, phi: number): string {
  const fmt = (n: number) => n.toFixed(6)
  return `OPENQASM 2.0;
qreg q[1];
creg c[1];
ry(${fmt(theta)}) q[0];
rz(${fmt(phi)}) q[0];
ry(${fmt(theta)}) q[0];
measure q[0] -> c[0];`
}

/**
 * Compute the path-accumulated phase φ from the number of cells a player has
 * visited so far (i.e. `GameState.paths[player].length`).
 *
 * Returns a value in [0, 2π), wrapping naturally like a quantum phase.
 */
export function computeTunnelPhase(pathLength: number): number {
  const raw = pathLength * STEP_PHASE
  const TWO_PI = 2 * Math.PI
  return ((raw % TWO_PI) + TWO_PI) % TWO_PI
}

/**
 * Theoretical pass probability for UI curves and log output.
 *
 *   P = sin²(θ) · cos²(φ/2)
 *
 * - At φ = 0   (resonance): P = sin²(θ)  — maximum
 * - At φ = π   (anti-resonance): P = 0   — completely blocked
 * - At φ = 2π  (next resonance): P = sin²(θ) again
 */
export function tunnelPassProbability(theta: number, phi: number): number {
  return Math.sin(theta) ** 2 * Math.cos(phi / 2) ** 2
}

/** Number of φ samples used to draw the P(pass)-vs-φ interference curve. */
export const CURVE_SAMPLE_COUNT = 120

/** cos²(φ/2) above this threshold counts as resonance (constructive). */
export const RESONANCE_THRESHOLD = 0.9

/**
 * Sample the pass-probability curve across φ ∈ [0, 2π) for a barrier angle θ.
 * Used by the TunnelCurve UI to draw the interference fringe.
 */
export function buildCurveSamples(
  theta: number,
  sampleCount: number = CURVE_SAMPLE_COUNT,
): { phis: Float64Array; probs: Float64Array } {
  const TWO_PI = 2 * Math.PI
  const phis = new Float64Array(sampleCount)
  const probs = new Float64Array(sampleCount)
  for (let i = 0; i < sampleCount; i++) {
    const phi = (i / (sampleCount - 1)) * TWO_PI
    phis[i] = phi
    probs[i] = tunnelPassProbability(theta, phi)
  }
  return { phis, probs }
}

/** cos²(φ/2) > RESONANCE_THRESHOLD → resonant (constructive interference). */
export function isResonant(phi: number): boolean {
  return Math.cos(phi / 2) ** 2 > RESONANCE_THRESHOLD
}
