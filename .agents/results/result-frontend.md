# Frontend Agent Result

## Status: COMPLETE

## Summary

Implemented Sarah's 4-qubit quantum circuit in the Snake-Ladder game. The biased Bell strategy now uses a 4-qubit QASM circuit where q0/q1 control visibility (interference flags) and q2/q3 form a pure Bell pair that determines snake-or-ladder type. The `parseResult` interface was updated to accept a variable-length measurements array to support both 2-qubit and 4-qubit strategies cleanly.

## Files Changed

- `/Users/gracefullight/workspace/snake-ladder/src/lib/entanglement-strategy.ts`
  - `EntanglementStrategy.parseResult` signature changed from `(m0, m1) => ...` to `(measurements: readonly number[]) => ...`
  - `biasedBellStrategy.label` updated to `'Biased visibility + Bell type (4 qubits)'`
  - `biasedBellStrategy.buildQASM` now emits 4-qubit QASM (qreg q[4], creg c[4], adds h q[2], cx q[2], q[3], and 4 measure statements)
  - `biasedBellStrategy.describe` updated to document all 4 qubits and their semantics
  - `biasedBellStrategy.parseResult` implements the 7-outcome table from Sarah's spec
  - `basicBellStrategy.parseResult` updated to new signature (destructures from array)

- `/Users/gracefullight/workspace/snake-ladder/src/hooks/use-collapse.ts`
  - Reads m2 and m3 from `result[0][2]` and `result[0][3]`
  - Passes full `result[0]` array to `entanglementStrategy.parseResult`
  - Log line updated to include m2 and m3 when present

- `/Users/gracefullight/workspace/snake-ladder/src/lib/__tests__/entanglement-strategy.test.ts` (new file)
  - 13 unit tests covering all 8 outcome combinations for `biasedBellStrategy.parseResult`
  - QASM emission tests (with/without rz gate)
  - `basicBellStrategy.parseResult` regression tests

## New QASM String (default 50/50 entangled cell, thetaA=0.862, thetaB=1.58, phase=0.72)

```
OPENQASM 2.0;
qreg q[4];
creg c[4];
ry(1.580) q[1];
ry(0.862) q[0];
z q[1];
rz(0.720) q[0];
h q[0];
cx q[0], q[1];
h q[2];
cx q[2], q[3];
measure q[0] -> c[0];
measure q[1] -> c[1];
measure q[2] -> c[2];
measure q[3] -> c[3];
```

## Test Results

- Test files: 3 passed
- Tests total: 21 passed (0 failed)
  - `src/lib/__tests__/entanglement-strategy.test.ts`: 13 tests (new)
  - `src/lib/__tests__/game-helpers.test.ts`: 7 tests (pre-existing, unchanged)
  - `src/hooks/__tests__/use-game.test.tsx`: 1 test (pre-existing, unchanged)
- TypeScript typecheck: 0 errors

## Acceptance Criteria Checklist

- [x] `biasedBellStrategy.buildQASM` emits 4-qubit QASM matching Sarah's circuit
- [x] `biasedBellStrategy.parseResult` implements all 7 outcome combinations from the spec table
- [x] `parseResult` signature changed to `(measurements: readonly number[])` - variable-length, both strategies adapted
- [x] `use-collapse.ts` reads m2/m3 and passes full result row to parseResult
- [x] Log line in use-collapse.ts includes m2/m3 when present
- [x] Partner is never null for biased strategy (always snake/ladder/interference)
- [x] `use-play.ts` collapsedQubit branch untouched and verified correct
- [x] `basicBellStrategy` keeps 2-qubit semantics (ignores m2/m3)
- [x] No changes to `src/types/game.ts`, `src/constants/board.ts`
- [x] `bun run typecheck` passes
- [x] `bun run test` passes (21/21)
- [x] Unit tests for biasedBellStrategy.parseResult covering required cases

## Deviations from Spec

None. All requirements implemented as specified.
