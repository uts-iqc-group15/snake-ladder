# 경로 의존 양자 터널링 설계 (Quantum Tunneling Redesign)

> 상태: 설계 승인됨 (Design approved)
> 작성일: 2026-06-05
> 목적: 대회 재제출 — "터널링/간섭이 고전적으로 처리됨" 감점 해결

---

## 1. 배경 — 감점 진단 (코드로 검증 완료)

심사 피드백:
> Deductions because **tunnelling/interference are handled classically** and some
> quantum effects mainly implement **biased random snake/ladder outcomes**.

코드 검증 결과:

| 항목 | 코드 사실 | 판정 |
|---|---|---|
| 터널링 | `game-helpers.ts:50` → `return Math.random() < probability` | 100% 고전. QASM/Quokka/큐빗 없음 |
| 간섭 | `entanglement-strategy.ts` → `m0===1`이면 `'interference'` 라벨 | 회로는 양자지만 효과는 비트 라벨 (게임에 간섭 무늬 없음) |
| 단일 타일 | `qasm-builder.ts` → `ry(θ); measure` | 수학적으로 `Math.random() < ladderProb`와 동일 |
| 폴백 | `use-collapse.ts:319` → `rollDie()` | 양자 경로의 고전 대체물 |

핵심 결론: **고정 확률 단일 타일은 태생적으로 주사위라 못 살린다.** 양자성을 진짜로 넣을 수 있는 지점은 "상황에 따라 확률이 변하는" 메커닉이며, 터널링은 원래 `Math.random()` 한 줄이라 잃을 게 없어 개선 ROI가 가장 높다.

---

## 2. 핵심 아이디어 — 터널링 = 경로 의존 간섭계

> **터널링을 작은 간섭계(`ry · rz · ry`)로 구현한다. 위상 φ를 플레이어가 지나온 경로에서 누적하므로, 같은 칸이라도 도달 경로에 따라 통과율이 달라진다 (이중슬릿/경로 간섭).**

이 한 가지 변경으로 감점 2개(터널링·간섭)와 폴백 문제를 동시에 해결한다. "고정 확률" 게임 컨셉은 건드리지 않는다 (터널링은 원래 확률 메커닉이므로).

---

## 3. 회로와 확률

```
buildTunnelQASM(θ, φ):
  OPENQASM 2.0;
  qreg q[1];
  creg c[1];
  ry(θ) q[0];
  rz(φ) q[0];
  ry(θ) q[0];
  measure q[0] -> c[0];
```

측정 = 0 → 막힘(통과 실패), 측정 = 1 → 통과.

통과 확률 (계산 결과):

```
P(통과) = sin²(θ) · cos²(φ/2)
```

- θ = 벽 두께 (초기 버전 고정, 추후 "벽 겹 수"로 확장)
- φ = 경로 위상 (지나온 칸 수에서 누적)

| φ | cos²(φ/2) | 결과 |
|---|---|---|
| 0 | 1 | 통과율 최대 (공명) |
| π | 0 | 완전 막힘 |
| 2π | 1 | 다시 공명 (주기적) |

→ 통과율이 φ에 따라 출렁인다. 주사위였다면 평평한 직선. 이 물결무늬가 "진짜 양자" 증명.

---

## 4. φ 누적 (데이터 모델)

`GameState.paths`(플레이어가 지나온 칸 기록)가 이미 존재 → 별도 상태 거의 불필요.

```
φ = (paths[player].length) × STEP_PHASE
STEP_PHASE = π/4   (튜닝 가능)
φ는 2π로 wrap (자연스러운 주기성)
```

경로 의존 예시:
```
플레이어 A:  출발 ──5칸 직진── 막힌칸    → φ = 5 × π/4
플레이어 B:  출발 ─돌아서 9칸─ 막힌칸    → φ = 9 × π/4
→ 같은 칸, 다른 φ, 다른 통과율
```

전략: 막힌 칸 도달 시 지나온 칸 수를 공명 지점(8칸 = 2π 배수)에 맞추면 두꺼운 벽도 통과. 돌아가는 경로 선택이라는 두뇌 플레이 발생.

---

## 5. 통합 지점

```
use-play.ts (터널 분기):
  제거:  const tunneled = ... shouldTunnel(tunnelProbability)
  교체:  const φ = (paths[player].length * STEP_PHASE) % (2π)
         const qasm = buildTunnelQASM(θ, φ)
         const result = await sendToQuokka(qasm)   // 실패 시 local-sim 폴백
         const tunneled = result[0][0] === 1

새 파일:  src/lib/tunnel-circuit.ts → buildTunnelQASM(θ, φ)

local-sim.ts:  ry·rz 이미 지원 → 폴백도 양자 시뮬 (rollDie 폴백 제거)

UI:  circuit-diagram.tsx / quantum-log.tsx 재사용
     → P(통과) 곡선 + 현재 φ 위치 점 + 공명 배지 표시
```

---

## 6. 엣지 케이스 / 주의

- 초반(φ 작음)엔 통과율 변동 → 로그에 φ값과 P(통과)를 항상 표시해 투명하게.
- φ는 2π로 wrap.
- θ 초기값 고정(벽 1겹). 추후 막은 토큰/겹 수에 따라 두꺼워지도록 확장 여지.
- Quokka 단일 shot로 측정 (count=1). Strict-Mode 중복 호출 방지 패턴은 기존 use-collapse와 동일하게 가드.
- `shouldTunnel`, `TUNNEL_PROBABILITY`, 디버그 슬라이더(`settings.tunnelProbability`) 제거 또는 θ 디버그 조절로 용도 변경.

---

## 7. 이 설계가 해결하는 감점

| 감점 | 해결 |
|---|---|
| 터널링 고전적 | 양자 회로 `ry·rz·ry`로 교체 |
| 간섭 고전적 | 이 회로가 곧 간섭계 — 경로 간섭이 게임에 드러남 |
| 폴백이 주사위 | local-sim 양자 폴백 |
| 고정 확률 컨셉 충돌 | 터널링은 원래 확률 메커닉이라 컨셉 안 건드림 |

---

## 8. 향후 확장 (stretch, 이번 범위 아님)

- θ를 "벽 겹 수(상대 토큰이 막은 정도)"와 연결 → 공명 터널링(두꺼운데 더 잘 통과)의 반직관성 강화.
- 얽힘 타일을 측정 기저 선택 기반 CHSH로 확장 → 벨 부등식 위반을 게임 통계로 증명.
- many-shot 히스토그램으로 간섭 무늬를 화면에 누적 시각화.
