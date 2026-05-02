# QA Review Result

**Status:** COMPLETE  
**Verdict:** Ship with follow-ups  
**Date:** 2026-05-02  

---

## Review Result: PASS (with follow-up items)

Zero CRITICAL, zero HIGH issues found. Several MEDIUM / LOW / NIT items documented below.

---

### CRITICAL
_None._

---

### HIGH
_None._

---

### MEDIUM

**M-1** `src/hooks/use-collapse.ts:48-66` — Interference + non-interference partner combination silently drops partner preset

When `outcome === 'interference'` (m0=1) but `partnerOutcome` is `'snake'` or `'ladder'` (m1=0, real case in biased strategy), the early-return branch at line 48 only writes `collapsed: 'interference'` for the partner qubit when `partnerOutcome === 'interference'` (line 56-58). The `partnerSettledOutcome` / `partnerDestination` logic at lines 73-85 is never reached because the function returns at line 67. The partner qubit is left `collapsed: null`, so the next player landing on it triggers a fresh independent measurement instead of triggering the pre-determined snake/ladder preset.

```ts
// Suggested fix: handle the partner preset inside the interference branch
if (outcome === 'interference') {
  const partnerSettled =
    partnerId && partnerOutcome && partnerOutcome !== 'interference'
      ? (partnerOutcome as 'snake' | 'ladder')
      : undefined
  const partnerCell = partnerSettled
    ? stateRef.current.qubits.find((q) => q.id === partnerId)?.cell
    : undefined
  const partnerDest =
    partnerSettled && partnerCell !== undefined
      ? computeDisplacement(partnerSettled, partnerCell, addLog)
      : undefined

  setState((prev) => ({
    ...prev,
    qubits: prev.qubits.map((q) => {
      if (q.id === qubitId) return { ...q, collapsed: 'interference' as const }
      if (partnerId && q.id === partnerId) {
        if (partnerSettled && partnerDest !== undefined)
          return { ...q, collapsed: partnerSettled, destinationCell: partnerDest }
        if (partnerOutcome === 'interference')
          return { ...q, collapsed: 'interference' as const }
      }
      return q
    }),
    isCollapsing: false,
    currentPlayer: (player === 0 ? 1 : 0) as 0 | 1,
    message: 'Quantum interference! Nothing happens.',
  }))
  return
}
```

---

**M-2** `src/hooks/use-collapse.ts:134` — `setTimeout` chain-reaction leaks if the component unmounts

The `setTimeout(() => { mutateRef.current?.({...}) }, 300)` at line 134 has no cleanup. If the component unmounts during the 300 ms window, `mutateRef.current` may have been torn down but the callback still fires, triggering state updates on an unmounted tree and a stale mutation.

```ts
// In useCollapse, add an abort ref:
const chainTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

useEffect(() => {
  return () => {
    if (chainTimerRef.current) clearTimeout(chainTimerRef.current)
  }
}, [])

// Then replace the raw setTimeout:
chainTimerRef.current = setTimeout(() => {
  mutateRef.current?.({ qubit: chainQubit, player, targetCell: newCell })
}, 300)
```

---

**M-3** `src/lib/entanglement-strategy.ts:134-139` — Silent mis-parse when Quokka returns a short array

`biasedBellStrategy.parseResult` destructures `[m0, m1, m2]`. If the Quokka response row contains fewer than 3 elements (network truncation, wrong `count`, or a 2-qubit fallback accidentally routed through the 4-qubit path), `m2` is `undefined`. The expression `m2 === 0` evaluates to `false`, so `m2 === 0 ? 'ladder' : 'snake'` silently returns `'snake'` for both player and partner with no warning logged. The same applies to `basicBellStrategy` (line 64) where a zero-length result silently treats both bits as non-zero → `interference / interference`.

```ts
parseResult(measurements) {
  if (measurements.length < 3) {
    throw new Error(
      `biasedBellStrategy.parseResult: expected ≥3 bits, got ${measurements.length}`
    )
  }
  const [m0, m1, m2] = measurements
  // ... rest unchanged
}
```

---

### LOW

**L-1** `src/hooks/use-collapse.ts:162-163` — Fallback path for already-collapsed partner is still reachable but its log message is misleading

`partnerStillEntangled` is true only when `partner.collapsed === null`. Once the first player collapses the entangled cell, the partner qubit is set to `'snake'`, `'ladder'`, or `'interference'` (never left `null`). So for the biased strategy the independent-measurement fallback (lines 224-262) is only reachable if: (a) `basicBell` strategy is used (partner may legitimately be left null — but the current `basicBellStrategy.parseResult` always returns a non-null `partnerOutcome`), or (b) a programming error leaves the partner `null`. The log comment at line 228 says "(partner already collapsed — independent measurement)" — that comment is correct. The dead-ish path is benign but worth noting so future strategy authors know it is still exercised via non-null `collapsed` state.

No code change required; a comment on `use-collapse.ts` line 160 clarifying "this branch is also reached if the current qubit has no partner at all (solo qubit), or if partner was already collapsed before this visit" would prevent confusion.

---

**L-2** `src/hooks/use-collapse.ts:205` — Log string "partner stays active (will measure on visit)" is stale post-design-change

`partnerOutcome` from `biasedBellStrategy` is never `null` (the type allows it but the implementation always returns a value). The `null` branch (line 205) logging "partner stays active (will measure on visit)" is dead for the current default strategy, but if it ever fires (e.g., a future strategy returns `null`), the message contradicts Sarah's spec where partner is immediately preset. The message should say "partner outcome deferred — next visit will measure independently" if this path is intended to be kept.

---

**L-3** `src/lib/game-helpers.ts:92-95` — Snake at cell 1 stays on cell 1 (no-op move)

`computeDisplacement('snake', 1, ...)` with any random input that maps row-0 → row-0 will set `adjusted = Math.max(1, 0) = 1`. `slideToCell(player, 1, 1, false)` is called with `fromCell === toCell`. This is visually a no-op slide. The behavior is acceptable for a hobby project but `slideToCell` should guard against `from === to` to avoid unnecessary animation overhead. No broken behavior, but worth noting.

---

**L-4** `src/lib/__tests__/entanglement-strategy.test.ts` — No test for short/empty measurement array

The `parseResult` functions are not tested with `[]`, `[0]`, or `[1, 0]` inputs. Given the silent mis-parse risk identified in M-3, at least one negative test should be added:

```ts
it('throws on short array (< 3 bits)', () => {
  expect(() => biasedBellStrategy.parseResult([0, 0])).toThrow()
})
```

---

**L-5** `src/lib/__tests__/game-helpers.test.ts:112-128` — 200-iteration "invariant holds" test uses real `Math.random`

The test runs `computeDisplacement` 200 times with uncontrolled randomness. This is not truly flaky (the clamp guarantees the invariant), but it exercises the implementation path rather than the specification. The value 200 is arbitrary; documenting why 200 was chosen (or replacing with property-based testing via `fast-check`) would improve intent clarity. Not a correctness concern because the clamp is deterministic.

---

### NIT

**N-1** `src/hooks/use-collapse.ts:189-193` — Dead destructuring of `m3`

Variables `m0`, `m1`, `m2`, `m3` are destructured from `result[0]` (lines 189-194) purely for the log string. `m3` is referenced in `m3Part` (line 210) but adds no game logic value (it is always equal to `m2` by Bell correlation). This is intentional for the educational log, but it's worth a comment to prevent a future reader from thinking `m3` is load-bearing.

---

**N-2** `src/lib/entanglement-strategy.ts:64` — `basicBellStrategy.parseResult` treats `[0,1]` and `[1,0]` as interference

Bell states cannot produce `01` or `10` from an ideal simulator, so this is correct for hardware. The test at `entanglement-strategy.test.ts:113` covers only `[0,1]`. Adding a test for `[1,0]` would complete the symmetry check (both should yield `interference/interference`).

---

**N-3** `src/hooks/use-play.ts:101-102` — `computeDisplacement` re-called with fresh dice roll for partner-preset qubits lacking `destinationCell`

If the partner qubit's `destinationCell` was not populated (which M-1 shows can happen in the interference branch), `use-play.ts` line 102 falls back to a fresh `computeDisplacement` call with new random dice. This means the second player may land on a different cell than intended by the original quantum measurement. This is a downstream consequence of M-1, not an independent defect, but it's worth tracing: once M-1 is fixed and all presets carry `destinationCell`, this fallback becomes a safety net only.

---

## Summary of Files Reviewed

| File | Status |
|---|---|
| `src/lib/entanglement-strategy.ts` | PASS — logic correct; short-array defence missing (M-3) |
| `src/hooks/use-collapse.ts` | PASS with issues — interference+partner preset dropped (M-1), setTimeout leak (M-2) |
| `src/lib/game-helpers.ts` | PASS — clamp correct; cell-1 no-op is benign (L-3) |
| `src/lib/__tests__/entanglement-strategy.test.ts` | PASS — full outcome table covered; short-array test missing (L-4) |
| `src/lib/__tests__/game-helpers.test.ts` | PASS — deterministic tests correct; 200-iteration note (L-5) |
| `src/hooks/use-play.ts` | PASS — destinationCell fallback safe post M-1 fix (N-3) |
| `src/types/game.ts` | PASS — types consistent |
| `src/constants/board.ts` | PASS — entangledParams are trusted constants; no injection risk |

---

## Acceptance Criteria Checklist

- [x] All 8 files reviewed
- [x] Findings include file:line references
- [x] Severity levels assigned (CRITICAL / HIGH / MEDIUM / LOW / NIT)
- [x] Each finding includes a suggested fix
- [x] Automated tools run (bun audit, tsc, eslint, vitest)
- [x] No source files modified
- [x] No .agents/ files modified

---

## Automated Tool Results

- `bun audit`: 5 high, 6 moderate — **all in Vite and dev-only transitive deps** (lodash via ahooks, brace-expansion via eslint/vitest, postcss via vite, vite itself). None are reachable in the production frontend bundle. Do not block ship; upgrade Vite to latest when available.
- `tsc --noEmit`: no errors
- `eslint`: no errors
- `vitest run`: 21/21 tests pass

---

## Verdict

Ship with follow-ups.

**Must fix before next player-facing release:**
- M-1 (interference + partner-preset combination silently drops partner state)
- M-2 (setTimeout cleanup on unmount)

**Can be follow-up issues:**
- M-3 (short-array defence in parseResult)
- L-2 (stale log message)
- L-4 (missing negative test for short arrays)
