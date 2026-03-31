import { usePocGame } from '@/hooks/use-poc-game'
import { Dice } from '@/components/dice'
import { QuantumLog } from '@/components/quantum-log'

const BOARD_SIZE = 4

function getCellNumber(row: number, col: number): number {
  const boardRow = BOARD_SIZE - 1 - row
  return boardRow % 2 === 0
    ? boardRow * BOARD_SIZE + col + 1
    : boardRow * BOARD_SIZE + (BOARD_SIZE - col)
}

function cellToCoord(cell: number): { col: number; row: number } {
  const row = Math.floor((cell - 1) / BOARD_SIZE)
  let col = (cell - 1) % BOARD_SIZE
  if (row % 2 === 1) col = BOARD_SIZE - 1 - col
  return { col, row }
}

function cellToPercent(cell: number): { x: number; y: number } {
  const coord = cellToCoord(cell)
  const rowIdx = BOARD_SIZE - 1 - coord.row
  const step = 100 / BOARD_SIZE
  return {
    x: coord.col * step + step / 2,
    y: rowIdx * step + step / 2,
  }
}

export function Poc() {
  const {
    state,
    selectQubit,
    placeQubit,
    randomPlaceAll,
    handleRoll,
    reset,
    QUBIT_CONFIGS,
    PLACEMENT_MIN,
    PLACEMENT_MAX,
  } = usePocGame()

  const cells: number[][] = []
  for (let row = 0; row < BOARD_SIZE; row++) {
    const rowCells: number[] = []
    for (let col = 0; col < BOARD_SIZE; col++) {
      rowCells.push(getCellNumber(row, col))
    }
    cells.push(rowCells)
  }

  const p1Coord = cellToCoord(state.positions[0])
  const p2Coord = cellToCoord(state.positions[1])

  const connections = state.qubits.filter(
    (q) =>
      (q.collapsed === 'snake' || q.collapsed === 'ladder') && q.destinationCell !== undefined,
  )

  const playerColor =
    state.currentPlayer === 0 ? 'var(--color-player-1)' : 'var(--color-player-2)'
  const playerTint =
    state.currentPlayer === 0 ? 'bg-[rgba(155,35,53,0.08)]' : 'bg-[rgba(44,74,124,0.08)]'

  const isSetup = state.phase === 'setup'
  const isPlay = state.phase === 'play' || state.phase === 'gameover'
  const busy = state.isRolling || state.isCollapsing || state.gameOver
  const occupiedCells = state.qubits.map((q) => q.cell)

  return (
    <div className="paper-bg min-h-screen flex flex-col items-center justify-center font-body text-text">
      <div className="flex flex-col items-center gap-5 p-4">
        <h1 className="font-display text-[1.75rem] lg:text-[2.25rem] text-text font-bold select-none">
          POC — 4x4 Prototype
        </h1>

        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          {/* 4x4 Board */}
          <div className="relative" style={{ width: 320, height: 320 }}>
            <div className="w-full h-full grid grid-cols-4 gap-px bg-[var(--color-board-border)] rounded-[var(--radius-board)] overflow-hidden shadow-[var(--shadow-board)]">
              {cells.map((row, rowIdx) =>
                row.map((num, colIdx) => {
                  const isLight = (rowIdx + colIdx) % 2 === 0
                  const boardRow = BOARD_SIZE - 1 - rowIdx
                  const boardCol = colIdx

                  const qubitHere = state.qubits.find((q) => q.cell === num)
                  const p1Here = boardCol === p1Coord.col && boardRow === p1Coord.row
                  const p2Here = boardCol === p2Coord.col && boardRow === p2Coord.row

                  const isStart = num === 1
                  const isGoal = num === 16

                  const isValidTarget =
                    isSetup &&
                    state.selectedConfigIndex !== null &&
                    num >= PLACEMENT_MIN &&
                    num <= PLACEMENT_MAX &&
                    !occupiedCells.includes(num)

                  const baseBg = isStart
                    ? 'bg-[rgba(45,106,79,0.25)]'
                    : isGoal
                      ? 'bg-[rgba(192,69,48,0.25)]'
                      : isLight
                        ? 'bg-board-light'
                        : 'bg-board-dark'
                  let tintClass = ''
                  if (qubitHere?.collapsed === 'snake') tintClass = 'bg-[rgba(192,69,48,0.12)]'
                  else if (qubitHere?.collapsed === 'ladder')
                    tintClass = 'bg-[rgba(45,106,79,0.12)]'
                  else if (isSetup && isValidTarget) tintClass = 'bg-[rgba(255,255,255,0.06)]'

                  const isDestination = connections.some((q) => q.destinationCell === num)
                  if (isDestination && !tintClass) {
                    const srcQubit = connections.find((q) => q.destinationCell === num)
                    if (srcQubit?.collapsed === 'snake') tintClass = 'bg-[rgba(192,69,48,0.08)]'
                    else if (srcQubit?.collapsed === 'ladder')
                      tintClass = 'bg-[rgba(45,106,79,0.08)]'
                  }

                  const cursorClass =
                    isSetup && isValidTarget
                      ? 'cursor-pointer hover:bg-[rgba(255,255,255,0.12)]'
                      : ''

                  return (
                    <div
                      key={num}
                      className={`relative flex items-center justify-center select-none transition-colors ${baseBg} ${tintClass} ${cursorClass}`}
                      onClick={() => {
                        if (isSetup && isValidTarget) placeQubit(num)
                      }}
                    >
                      <span className="absolute top-1 left-1.5 text-xs font-bold text-text-cell">
                        {num}
                      </span>
                      {isStart && (
                        <span className="absolute top-1 right-1 text-[0.55rem] font-bold text-ladder uppercase">
                          Start
                        </span>
                      )}
                      {isGoal && (
                        <span className="absolute top-1 right-1 text-[0.55rem] font-bold text-snake uppercase">
                          End
                        </span>
                      )}

                      {qubitHere && qubitHere.collapsed === null && (
                        <span
                          className="absolute bottom-1 right-1 text-xl animate-quantum-shimmer"
                          title={`P${qubitHere.owner + 1}'s Qubit [${QUBIT_CONFIGS[qubitHere.configIndex].label}]`}
                        >
                          {'\u2B50'}
                        </span>
                      )}

                      {/* Player tokens */}
                      {isPlay && (
                        <div className="absolute inset-0 flex items-center justify-center gap-0.5 pointer-events-none">
                          {p1Here && (
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-player-1 text-[0.7rem] font-bold text-text-inverse border-2 border-white/30 shadow-[var(--shadow-token)] z-10 animate-token-move">
                              1
                            </span>
                          )}
                          {p2Here && (
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-player-2 text-[0.7rem] font-bold text-text-inverse border-2 border-white/30 shadow-[var(--shadow-token)] z-10 animate-token-move">
                              2
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                }),
              )}
            </div>

            {/* SVG snake/ladder connections */}
            {connections.length > 0 && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-20"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                {connections.map((q) => {
                  const from = cellToPercent(q.cell)
                  const to = cellToPercent(q.destinationCell!)
                  const isSnake = q.collapsed === 'snake'

                  if (isSnake) {
                    const dx = to.x - from.x
                    const dy = to.y - from.y
                    const dist = Math.sqrt(dx * dx + dy * dy)
                    const ux = dx / (dist || 1)
                    const uy = dy / (dist || 1)
                    const nx = -uy
                    const ny = ux
                    const segments = 20
                    const amplitude = Math.min(dist * 0.12, 5)
                    const points: string[] = []
                    for (let i = 0; i <= segments; i++) {
                      const t = i / segments
                      const baseX = from.x + dx * t
                      const baseY = from.y + dy * t
                      const wave = Math.sin(t * Math.PI * 4) * amplitude * (1 - t * 0.3)
                      points.push(`${baseX + nx * wave},${baseY + ny * wave}`)
                    }
                    const headSize = 2
                    const hx = to.x
                    const hy = to.y
                    return (
                      <g key={q.id}>
                        <polyline
                          points={points.join(' ')}
                          fill="none"
                          stroke="var(--color-snake)"
                          strokeWidth="1.5"
                          strokeOpacity="0.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <polygon
                          points={`${hx},${hy} ${hx - ux * headSize + nx * headSize * 0.6},${hy - uy * headSize + ny * headSize * 0.6} ${hx - ux * headSize - nx * headSize * 0.6},${hy - uy * headSize - ny * headSize * 0.6}`}
                          fill="var(--color-snake)"
                          fillOpacity="0.85"
                        />
                        <circle cx={hx - ux * 0.8 + nx * 0.5} cy={hy - uy * 0.8 + ny * 0.5} r="0.4" fill="#fff" />
                        <circle cx={hx - ux * 0.8 - nx * 0.5} cy={hy - uy * 0.8 - ny * 0.5} r="0.4" fill="#fff" />
                      </g>
                    )
                  }

                  // Ladder
                  const dx = to.x - from.x
                  const dy = to.y - from.y
                  const dist = Math.sqrt(dx * dx + dy * dy)
                  const nx = -dy / (dist || 1)
                  const ny = dx / (dist || 1)
                  const railGap = 2
                  const rungCount = Math.max(2, Math.round(dist / 8))

                  return (
                    <g key={q.id}>
                      <line
                        x1={from.x + nx * railGap} y1={from.y + ny * railGap}
                        x2={to.x + nx * railGap} y2={to.y + ny * railGap}
                        stroke="var(--color-ladder)" strokeWidth="0.8" strokeOpacity="0.8"
                        strokeLinecap="round"
                      />
                      <line
                        x1={from.x - nx * railGap} y1={from.y - ny * railGap}
                        x2={to.x - nx * railGap} y2={to.y - ny * railGap}
                        stroke="var(--color-ladder)" strokeWidth="0.8" strokeOpacity="0.8"
                        strokeLinecap="round"
                      />
                      {Array.from({ length: rungCount }, (_, i) => {
                        const t = (i + 1) / (rungCount + 1)
                        const rx = from.x + dx * t
                        const ry = from.y + dy * t
                        return (
                          <line
                            key={i}
                            x1={rx + nx * railGap} y1={ry + ny * railGap}
                            x2={rx - nx * railGap} y2={ry - ny * railGap}
                            stroke="var(--color-ladder)" strokeWidth="0.6" strokeOpacity="0.7"
                            strokeLinecap="round"
                          />
                        )
                      })}
                    </g>
                  )
                })}
              </svg>
            )}
          </div>

          {/* Controls */}
          <div className="card-panel flex flex-col gap-4 p-5 w-full md:min-w-[260px] md:w-[260px]">
            {/* Current player */}
            <div
              className={`text-lg font-bold px-4 py-3 rounded-lg text-text ${playerTint}`}
              style={{ borderLeft: `3px solid ${playerColor}` }}
            >
              {state.gameOver
                ? `Player ${state.currentPlayer + 1} wins!`
                : isSetup
                  ? `Player ${state.currentPlayer + 1} - Setup`
                  : `Player ${state.currentPlayer + 1}'s Turn`}
            </div>

            {/* ── Setup phase ── */}
            {isSetup && (
              <div className="flex flex-col gap-3">
                <div className="text-xs text-text-secondary font-bold uppercase tracking-wider">
                  Select a Qubit to Place
                </div>
                <div className="flex flex-col gap-1.5">
                  {QUBIT_CONFIGS.map((config, idx) => {
                    const isSelected = state.selectedConfigIndex === idx
                    return (
                      <button
                        key={idx}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-mono cursor-pointer transition-all border ${
                          isSelected
                            ? 'border-[var(--color-neon-cyan)] bg-[rgba(0,240,255,0.1)] text-[var(--color-neon-cyan)]'
                            : 'border-[var(--color-border)] bg-transparent text-text-secondary hover:bg-[var(--color-surface-hover)]'
                        }`}
                        onClick={() => selectQubit(idx)}
                      >
                        <span className="text-base">{'\u2B50'}</span>
                        <span>[{config.label}]</span>
                      </button>
                    )
                  })}
                </div>
                {state.selectedConfigIndex !== null && (
                  <div className="text-xs text-[var(--color-neon-yellow)] mt-1">
                    Click a cell (2-15) to place the qubit
                  </div>
                )}
                <button
                  className="mt-1 py-2 px-4 text-xs font-bold text-text-secondary rounded-[var(--radius-button)] bg-transparent border-[1.5px] border-[var(--color-border)] cursor-pointer transition-colors duration-200 hover:bg-[var(--color-surface-hover)]"
                  onClick={randomPlaceAll}
                >
                  Random Place
                </button>
              </div>
            )}

            {/* ── Play phase ── */}
            {isPlay && (
              <>
                {/* Player positions */}
                <div className="flex justify-center gap-3">
                  <span className="px-3 py-1 rounded-[var(--radius-badge)] bg-player-1 text-sm font-bold text-text-inverse">
                    P1: Cell {state.positions[0]}
                  </span>
                  <span className="px-3 py-1 rounded-[var(--radius-badge)] bg-player-2 text-sm font-bold text-text-inverse">
                    P2: Cell {state.positions[1]}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-3">
                  <Dice value={state.dice ?? 6} rolling={state.isRolling} />
                  <div className="text-xl font-bold font-mono text-text-secondary h-7">
                    {state.dice ? `${state.dice}` : '\u00A0'}
                  </div>
                </div>

                {/* Random roll */}
                <button
                  className="py-3 px-8 text-[0.875rem] font-bold text-text-inverse rounded-[var(--radius-button)] cursor-pointer transition-all duration-150 hover:brightness-90 hover:translate-y-[-1px] hover:shadow-[var(--shadow-button)] active:translate-y-0 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
                  style={{ background: playerColor }}
                  onClick={() => handleRoll()}
                  disabled={busy}
                >
                  {state.isCollapsing ? 'Measuring...' : 'Roll Dice'}
                </button>

                {/* Manual dice input 1-6 */}
                <div className="flex flex-col gap-2">
                  <div className="text-xs text-text-secondary font-bold uppercase tracking-wider text-center">
                    Pick a number
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <button
                        key={n}
                        className="py-2 text-sm font-bold rounded-lg border border-[var(--color-border)] cursor-pointer transition-all hover:bg-[var(--color-surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
                        onClick={() => handleRoll(n)}
                        disabled={busy}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <button
              className="py-2 px-6 text-sm text-text-secondary rounded-[var(--radius-button)] bg-transparent border-[1.5px] border-[var(--color-border)] cursor-pointer transition-colors duration-200 hover:bg-[var(--color-surface-hover)]"
              onClick={reset}
            >
              Reset
            </button>

            <div
              className={`text-sm min-h-12 px-2 py-1 text-center leading-relaxed ${
                state.gameOver
                  ? 'text-success font-bold'
                  : state.message.includes('Snake')
                    ? 'text-snake'
                    : state.message.includes('Ladder')
                      ? 'text-ladder'
                      : 'text-text-secondary'
              }`}
            >
              {state.message || '\u00A0'}
            </div>

          </div>
        </div>

        {/* Qubit legend — below board & controls */}
        {state.qubits.length > 0 && (
          <div className="flex items-center justify-center gap-6 text-xs text-text-secondary">
            {state.qubits.map((q) => {
              const config = QUBIT_CONFIGS[q.configIndex]
              const icon = q.collapsed
                ? q.collapsed === 'ladder'
                  ? '\u2705'
                  : '\u274C'
                : '\u2B50'
              return (
                <span key={q.id} className="flex items-center gap-1.5">
                  <span>{icon}</span>
                  P{q.owner + 1} {'\u2192'} Cell {q.cell} [{config.label}]
                  {q.collapsed && ` → ${q.collapsed}`}
                </span>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="w-full py-3 text-center flex justify-center gap-4">
        <a
          className="text-text-secondary text-xs font-body hover:text-text cursor-pointer transition-colors"
          href="https://docs.google.com/document/d/1CLNWo4yvtsBkUWGh4kTIO6U8gh3aiPIevfgGRLuH8Zk/edit?usp=sharing"
          target="_blank"
          rel="noopener noreferrer"
        >
          Documentation
        </a>
        <a
          className="text-text-secondary text-xs font-body hover:text-text cursor-pointer transition-colors"
          href="#credits"
        >
          Credits
        </a>
      </footer>

      <QuantumLog logs={state.logs} />
    </div>
  )
}
