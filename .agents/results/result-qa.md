# QA Review Result — DESIGN.md Audit

**Status: FAIL**

**Summary:** 5개 기준 중 3개(Accessibility, Nielsen, Design System Consistency)에서 HIGH 이상의 결함이 발견됨. DESIGN.md와 실제 구현(CSS) 사이의 괴리가 전면적임.

**Files Reviewed:**
- `/Users/gracefullight/workspace/snake-ladder/DESIGN.md`
- `/Users/gracefullight/workspace/snake-ladder/src/App.module.css`
- `/Users/gracefullight/workspace/snake-ladder/src/components/Board.module.css`
- `/Users/gracefullight/workspace/snake-ladder/src/components/Controls.module.css`

---

## Acceptance Criteria Checklist

- [x] 모든 파일 검토 완료
- [x] 5개 기준 전부 평가
- [x] 파일:라인 참조 포함
- [x] severity 등급 적용
- [x] 한국어 리포트 작성

---

## Review Result: FAIL

---

## 기준별 상세 평가

---

### 기준 1. Responsive — PASS (조건부)

**판정:** DESIGN.md 문서 자체는 통과. 실제 구현에서 일부 미반영.

- `DESIGN.md:119-123` — 320px / 768px / 1024px 세 브레이크포인트 명시됨. mobile-first 방향 선언.
- `DESIGN.md:127-131` — 보드 크기 브레이크포인트별 수치 명시됨 (mobile: `min(90vw, 360px)`, tablet: `420px`, desktop: `500px`).

**실제 구현 격차 (문서 범위 외 참고 사항):**
- `src/components/Board.module.css:2-9` — 보드 크기가 `500px` 고정. mobile 반응형 없음. `min(90vw, 360px)` 미적용.
- `src/App.module.css:24-29` — `max-width: 768px` 미만에서만 `flex-direction: column` 전환. 1024px desktop 전용 처리 없음.

---

### 기준 2. WCAG 2.2 AA Accessibility — FAIL

#### CRITICAL
없음.

#### HIGH

- `DESIGN.md:75` — `--color-text-muted` (`rgba(240,240,240,0.4)`) 의 대비율이 **3.45:1** (`#0a0a1a` 배경 기준). WCAG AA 본문 텍스트 기준 4.5:1 미달. 문서가 이 토큰을 보드 셀 번호(`DESIGN.md:178`)에 사용하도록 명시하고 있어 실제 정보 전달 요소에 적용됨.

  수정 제안:
  ```css
  --color-text-muted: rgba(240, 240, 240, 0.6); /* 대비율 약 5.0:1 */
  ```

- `DESIGN.md:211-212` — Roll 버튼 배경이 `linear-gradient(135deg, var(--color-neon-pink), var(--color-neon-cyan))`. 중간값 기준 흰색 텍스트 대비율 **3.11:1**. 버튼은 UI 컴포넌트이므로 WCAG 1.4.3 기준 3:1 이상(대형 텍스트/UI)을 간신히 넘으나, 버튼 내 `label` 사이즈(`0.8125rem`, 약 13px)는 대형 텍스트 기준 미해당 → 4.5:1 필요. 실제로 3.11:1이므로 미달.

  수정 제안:
  ```css
  /* 그라데이션 끝단을 어둡게 조정하거나, 버튼 배경에 반투명 어두운 오버레이 추가 */
  background: linear-gradient(135deg, #c4006e, #0098a8);
  ```

#### MEDIUM

- `DESIGN.md:75` — `--color-text-muted`가 `--color-board-light` (`#2a1f4e`) 위에 사용될 경우 대비율 **2.63:1**로 더욱 악화됨. 셀 번호 표시에 이 조합이 사용될 경우 거의 읽히지 않음.

- `DESIGN.md:289-295` — `prefers-reduced-motion` 처리가 `animation-duration: 0.01ms`로 설정됨. 이는 `prefers-reduced-motion: no-preference`가 아닌 `reduce` 미디어 쿼리에 대한 대응으로, 애니메이션을 완전히 비활성화하지 않고 거의 즉각 완료되도록 함. 일부 사용자에게 여전히 모션 트리거를 유발할 수 있으며, WCAG 2.3.3(SC AAA)과 더불어 콘텐츠 이동이 예상치 못한 방식으로 나타날 수 있음.

  수정 제안:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation: none !important;
      transition: none !important;
    }
  }
  ```

- `DESIGN.md:176-177` — 뱀/사다리 셀 구분이 `box-shadow: inset 0 0 8px var(--color-snake/ladder)`로만 처리됨. 문서에서 "색상만 의존하지 않음"을 명시(`DESIGN.md:24`)했으나, 아이콘 외 추가적인 레이블/텍스트 대체 수단(예: aria-label)에 대한 명세가 없음. 구현 스펙 불완전.

#### LOW

- `DESIGN.md:109` — 타이틀 `neon-pulse` 무한 애니메이션이 `prefers-reduced-motion: reduce` 적용 시 0.01ms로 처리되지만, 깜빡임(flickering) 특성상 광과민성 발작 위험(WCAG 2.3.1, 초당 3회 이상 점멸)을 검토해야 함. 현재 2초 주기이므로 해당 없으나, 구현 시 주기 유지 여부 확인 필요.

---

### 기준 3. Nielsen's 10 Usability Heuristics — FAIL

#### HIGH

- **가시성(Visibility of System Status)** — `DESIGN.md:188-198` 컨트롤 패널 명세에 게임 진행 상태(몇 번째 턴인지, 총 이동 횟수 등) 표시가 없음. 현재 플레이어 표시와 메시지 영역만 명시됨. "지금 누가 플레이하고 있는지"는 있으나 "게임이 얼마나 진행됐는지"에 대한 상태 피드백 없음.

- **오류 예방(Error Prevention)** — `DESIGN.md:210-215` Roll 버튼에 비활성(`opacity: 0.4`) 상태 명세가 있으나, 어떤 조건에서 비활성이 되는지(롤링 중, 게임 종료 후 등) 명세 없음. 실수로 연속 클릭 시 동작에 대한 명세 부재.

#### MEDIUM

- **사용자 제어(User Control & Freedom)** — `DESIGN.md:219-221` Reset 버튼이 명세되어 있으나 확인(confirm) 다이얼로그 또는 실행 취소(undo) 메커니즘에 대한 명세 없음. 게임 중 실수로 리셋 시 복구 불가.

- **오류 인식 지원(Help Users Recognize and Recover)** — 메시지 영역(`DESIGN.md:225-228`)이 뱀/사다리 이벤트와 승리 메시지를 처리하지만 오류 상태(네트워크 오류, 예외 상황)에 대한 메시지 스타일 명세 없음.

#### LOW

- **심미성(Aesthetic and Minimalist Design)** — `DESIGN.md:204-205` 주사위 유니코드 문자(⚀~⚅)에 `text-shadow: 0 0 12px var(--color-neon-yellow)` 적용. 유니코드 기호에 네온 글로우 적용 시 글리프 렌더링 품질이 브라우저/OS별로 상이할 수 있음. 명세에 폴백(fallback) 처리 없음.

---

### 기준 4. AI Slop Check — FAIL

#### MEDIUM

- `DESIGN.md:3-4, 37-39` — **"배경 그라데이션 + 글래스모피즘" 조합이 목적 없이 중첩됨.** `#0f0c29 → #302b63 → #24243e` 3색 배경 그라데이션 위에 `rgba(255,255,255,0.06)` 글래스 패널이 올라오는 구조. 글래스모피즘은 명확한 배경 레이어가 보여야 효과가 있는데, 어두운 단색에 가까운 그라데이션 위에서는 `backdrop-filter: blur(12px)`가 시각적으로 무의미함. 장식적 목적 이외의 근거 없음.

  판단 근거: `--glass-bg: rgba(255,255,255,0.06)`은 6% 불투명도로, 배경이 어두운 단색 계열이면 블러 처리해도 투과되는 내용이 없어 단순 반투명 어두운 박스와 동일하게 보임.

- `DESIGN.md:11-15` — **네온 + 글래스모피즘 + CRT 스캔라인 + 레트로 퓨처리즘** 4가지 트렌드 키워드 동시 적용. 각 요소의 충돌 없이 조화를 이루는지에 대한 명세 없음. 포트폴리오 데모라는 맥락에서 "트렌디한 키워드 나열" 패턴으로 볼 수 있음.

#### LOW

- `DESIGN.md:267-283` — CRT 스캔라인 오버레이가 `z-index: 9999`로 전체 화면에 `position: fixed`. 이 레이어가 포커스 가능한 요소(버튼 등) 위에 `pointer-events: none`으로 올라오는 것은 기능상 문제 없으나, 스크린리더나 확대 모드 사용자에게는 불필요한 DOM 복잡도를 추가함.

---

### 기준 5. Design System Consistency — FAIL

#### HIGH

- **토큰 네이밍 불일치 (CSS 변수 vs Tailwind 매핑)** — `DESIGN.md:59-67`에서 Glass 토큰이 `--glass-bg`, `--glass-bg-hover`, `--glass-border`, `--glass-blur`, `--glass-shadow`로 정의됨. 그러나 Tailwind v4 매핑(`DESIGN.md:324-327`)에서는 `--color-glass`, `--color-glass-hover`, `--color-glass-border`로 이름이 변경되고 `--glass-blur`, `--glass-shadow`는 각각 `--blur-glass`, `--shadow-glass`로 prefix가 역전됨. 동일 토큰에 두 가지 네이밍 체계가 공존하여 구현 시 혼란 유발.

  영향 범위:
  - `DESIGN.md:155-163` Glass Panel Recipe는 `var(--glass-bg)`, `var(--glass-blur)`, `var(--glass-border)`, `var(--glass-shadow)` 참조.
  - Tailwind 매핑은 `--color-glass`, `--blur-glass`, `--color-glass-border`, `--shadow-glass` 사용.
  - 두 체계 중 어느 것을 실제 구현에서 사용해야 하는지 명세 없음.

- **DESIGN.md 전체 vs 실제 구현 전면 괴리** — DESIGN.md가 정의한 토큰(`--color-neon-pink`, `--color-board-light` 등)이 실제 CSS 파일에 전혀 적용되지 않음.
  - `src/components/Board.module.css:21` — `background: #f5e6ca` (하드코딩, 네온 테마 아님)
  - `src/components/Board.module.css:70` — `background: #e74c3c` (하드코딩, `--color-neon-pink` 미사용)
  - `src/App.module.css:7` — 그라데이션 컬러값 하드코딩 (`#0f0c29, #302b63, #24243e`)
  - DESIGN.md가 설계 문서로서의 역할을 하지 못하고 있음.

#### MEDIUM

- `DESIGN.md:183-185` — Player Token 명세에 P1/P2 글로우 표현식에 `var(--color-player-N)` 형태의 플레이스홀더를 사용. `N`은 실제 변수명이 아니므로 구현 참조 불가. `var(--color-player-1)`, `var(--color-player-2)`로 분리 명세 필요.

- `DESIGN.md:99-105` — 타입 스케일에서 `title`이 `1.5rem` (기본) / `2rem` (lg)로 반응형 처리를 명시하지만, `App.module.css:13`에서 `font-size: 2rem`으로 고정. 다른 스케일(`heading`, `body` 등)의 반응형 크기 명세 없음. 일관성 부족.

- `DESIGN.md:193` — Controls Panel `min-width: 220px` (desktop)으로 명세. 실제 구현 `Controls.module.css:5`는 `min-width: 200px`. 수치 불일치.

#### LOW

- `DESIGN.md:96` — Display 폰트 `Press Start 2P`가 "제목, 게임 타이틀 전용"으로 명세되나 실제 `App.module.css:9`는 `font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`로 body 폰트도 미적용.

- `DESIGN.md:339-341` — `--shadow-neon-pink`, `--shadow-neon-cyan` 두 shadow 토큰이 Tailwind 매핑에 포함되지만 컴포넌트 명세에서 실제 사용 위치가 불명확함. Roll 버튼(`DESIGN.md:213`)은 `rgba(255,45,149,0.4)` 하드코딩 값을 사용하고 토큰을 참조하지 않음.

---

## 총평

DESIGN.md는 선언 수준에서는 적절한 내용을 담고 있으나, 세 가지 구조적 문제가 있음:

1. **문서-구현 단절**: DESIGN.md에 정의된 토큰과 컴포넌트 명세가 실제 CSS에 전혀 반영되지 않아, 문서가 현재 "희망 사항" 수준에 머물고 있음.
2. **토큰 이중 네이밍**: CSS 변수와 Tailwind 매핑 간 네이밍 체계가 통일되지 않아 구현자가 어떤 이름을 사용해야 하는지 불분명함.
3. **접근성 수치 오기입**: `--color-text-muted`의 실제 대비율이 WCAG AA 기준 미달임에도 "WCAG 2.2 AA 준수" 선언이 있어 구현자를 오도할 수 있음.
