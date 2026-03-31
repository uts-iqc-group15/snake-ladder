import { BOARD_SIZE, QUBIT_CONFIGS, PLACEMENT_MIN, PLACEMENT_MAX } from '@/constants/board'
import { cellToCoord } from '@/constants/board'
import type { PlacedQubit, GamePhase } from '@/hooks/use-game'

interface BoardProps {
  positions: [number, number]
  qubits: PlacedQubit[]
  currentPlayer: 0 | 1
  phase: GamePhase
  selectedConfigIndex: number | null
  onCellClick?: (cell: number) => void
}

function getCellNumber(row: number, col: number): number {
  const boardRow = BOARD_SIZE - 1 - row
  return boardRow % 2 === 0
    ? boardRow * BOARD_SIZE + col + 1
    : boardRow * BOARD_SIZE + (BOARD_SIZE - col)
}

// Convert cell number to grid percentage position (center of cell)
function cellToPercent(cell: number): { x: number; y: number } {
  const coord = cellToCoord(cell)
  // coord.row 0 = bottom row on board, displayed at rowIdx = BOARD_SIZE-1
  const rowIdx = BOARD_SIZE - 1 - coord.row
  const colIdx = coord.col
  return {
    x: colIdx * 10 + 5,
    y: rowIdx * 10 + 5,
  }
}

export function Board({
  positions,
  qubits,
  currentPlayer,
  phase,
  selectedConfigIndex,
  onCellClick,
}: BoardProps) {
  const cells: number[][] = []
  for (let row = 0; row < BOARD_SIZE; row++) {
    const rowCells: number[] = []
    for (let col = 0; col < BOARD_SIZE; col++) {
      rowCells.push(getCellNumber(row, col))
    }
    cells.push(rowCells)
  }

  const isSetup = phase === 'setup'
  const occupiedCells = qubits.map((q) => q.cell)

  const p1Coord = cellToCoord(positions[0])
  const p2Coord = cellToCoord(positions[1])

  // Collapsed qubits with destinations for SVG connections
  const connections = qubits.filter(
    (q) =>
      (q.collapsed === 'snake' || q.collapsed === 'ladder') &&
      q.destinationCell !== undefined,
  )

  return (
    <div className="board-responsive relative">
      {/* Grid */}
      <div className="w-full h-full grid grid-cols-10 gap-px bg-[var(--color-board-border)] rounded-[var(--radius-board)] overflow-hidden shadow-[var(--shadow-board)]">
        {cells.map((row, rowIdx) =>
          row.map((num, colIdx) => {
            const isLight = (rowIdx + colIdx) % 2 === 0
            const boardRow = BOARD_SIZE - 1 - rowIdx
            const boardCol = colIdx

            const qubitHere = qubits.find((q) => q.cell === num)
            const isOwnQubit = qubitHere && qubitHere.owner === currentPlayer
            const showQubit = !!qubitHere

            const isValidTarget =
              isSetup &&
              selectedConfigIndex !== null &&
              num >= PLACEMENT_MIN &&
              num <= PLACEMENT_MAX &&
              !occupiedCells.includes(num)

            const p1Here = boardCol === p1Coord.col && boardRow === p1Coord.row
            const p2Here = boardCol === p2Coord.col && boardRow === p2Coord.row
            const showTokens = phase === 'play' || phase === 'gameover'

            const baseBg = isLight ? 'bg-board-light' : 'bg-board-dark'
            let tintClass = ''
            if (qubitHere?.collapsed === 'snake') {
              tintClass = 'bg-[rgba(192,69,48,0.12)]'
            } else if (qubitHere?.collapsed === 'ladder') {
              tintClass = 'bg-[rgba(45,106,79,0.12)]'
            } else if (isSetup && isValidTarget) {
              tintClass = 'bg-[rgba(255,255,255,0.04)]'
            }

            // Also tint destination cells
            const isDestination = connections.some((q) => q.destinationCell === num)
            if (isDestination && !tintClass) {
              const srcQubit = connections.find((q) => q.destinationCell === num)
              if (srcQubit?.collapsed === 'snake') {
                tintClass = 'bg-[rgba(192,69,48,0.08)]'
              } else if (srcQubit?.collapsed === 'ladder') {
                tintClass = 'bg-[rgba(45,106,79,0.08)]'
              }
            }

            const cursorClass =
              isSetup && isValidTarget ? 'cursor-pointer hover:bg-[rgba(255,255,255,0.1)]' : ''

            return (
              <div
                key={num}
                className={`relative flex items-center justify-center text-[0.7rem] select-none transition-colors ${baseBg} ${tintClass} ${cursorClass}`}
                onClick={() => {
                  if (isSetup && isValidTarget && onCellClick) {
                    onCellClick(num)
                  }
                }}
              >
                {/* Cell number */}
                <span className="absolute top-0.5 left-1 text-[0.6rem] font-bold text-text-cell">
                  {num}
                </span>

                {/* Qubit indicators */}
                {showQubit && qubitHere.collapsed === null && (
                  <span
                    className="absolute bottom-0 right-0.5 text-[0.9rem] animate-quantum-shimmer"
                    aria-hidden="true"
                    title={
                      isOwnQubit
                        ? `Qubit [${QUBIT_CONFIGS[qubitHere.configIndex].label}]`
                        : 'Quantum item'
                    }
                  >
                    {QUBIT_CONFIGS[qubitHere.configIndex].entangled ? '\u269B' : '\u2B50'}
                  </span>
                )}
                {qubitHere?.collapsed === 'interference' && (
                  <span
                    className="absolute bottom-0 right-0.5 text-[0.9rem] opacity-40"
                    aria-hidden="true"
                  >
                    &#x1F4A8;
                  </span>
                )}

                {/* Player tokens */}
                {showTokens && (
                  <div className="absolute inset-0 flex items-center justify-center gap-0.5 pointer-events-none">
                    {p1Here && (
                      <span className="flex items-center justify-center w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-player-1 text-[0.7rem] font-bold text-text-inverse border-2 border-white/30 shadow-[var(--shadow-token)] z-10 animate-token-move">
                        1
                      </span>
                    )}
                    {p2Here && (
                      <span className="flex items-center justify-center w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-player-2 text-[0.7rem] font-bold text-text-inverse border-2 border-white/30 shadow-[var(--shadow-token)] z-10 animate-token-move">
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

      {/* SVG overlay for snake/ladder connections */}
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
              // Snake: wavy sinusoidal body + triangle head
              const dx = to.x - from.x
              const dy = to.y - from.y
              const dist = Math.sqrt(dx * dx + dy * dy)
              const ux = dx / (dist || 1)
              const uy = dy / (dist || 1)
              const nx = -uy
              const ny = ux
              const segments = 20
              const amplitude = Math.min(dist * 0.12, 3)
              const points: string[] = []
              for (let i = 0; i <= segments; i++) {
                const t = i / segments
                const baseX = from.x + dx * t
                const baseY = from.y + dy * t
                const wave = Math.sin(t * Math.PI * 4) * amplitude * (1 - t * 0.3)
                points.push(`${baseX + nx * wave},${baseY + ny * wave}`)
              }
              // Head direction
              const headSize = 1.2
              const hx = to.x
              const hy = to.y
              return (
                <g key={q.id}>
                  <polyline
                    points={points.join(' ')}
                    fill="none"
                    stroke="var(--color-snake)"
                    strokeWidth="1"
                    strokeOpacity="0.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Snake head */}
                  <polygon
                    points={`${hx},${hy} ${hx - ux * headSize + nx * headSize * 0.6},${hy - uy * headSize + ny * headSize * 0.6} ${hx - ux * headSize - nx * headSize * 0.6},${hy - uy * headSize - ny * headSize * 0.6}`}
                    fill="var(--color-snake)"
                    fillOpacity="0.85"
                  />
                  {/* Snake eyes */}
                  <circle cx={hx - ux * 0.5 + nx * 0.3} cy={hy - uy * 0.5 + ny * 0.3} r="0.25" fill="#fff" />
                  <circle cx={hx - ux * 0.5 - nx * 0.3} cy={hy - uy * 0.5 - ny * 0.3} r="0.25" fill="#fff" />
                </g>
              )
            }

            // Ladder: two parallel rails + rungs
            const dx = to.x - from.x
            const dy = to.y - from.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            const nx = -dy / (dist || 1)
            const ny = dx / (dist || 1)
            const railGap = 1.2
            const rungCount = Math.max(3, Math.round(dist / 5))

            return (
              <g key={q.id}>
                {/* Left rail */}
                <line
                  x1={from.x + nx * railGap} y1={from.y + ny * railGap}
                  x2={to.x + nx * railGap} y2={to.y + ny * railGap}
                  stroke="var(--color-ladder)" strokeWidth="0.5" strokeOpacity="0.8"
                  strokeLinecap="round"
                />
                {/* Right rail */}
                <line
                  x1={from.x - nx * railGap} y1={from.y - ny * railGap}
                  x2={to.x - nx * railGap} y2={to.y - ny * railGap}
                  stroke="var(--color-ladder)" strokeWidth="0.5" strokeOpacity="0.8"
                  strokeLinecap="round"
                />
                {/* Rungs */}
                {Array.from({ length: rungCount }, (_, i) => {
                  const t = (i + 1) / (rungCount + 1)
                  const rx = from.x + dx * t
                  const ry = from.y + dy * t
                  return (
                    <line
                      key={i}
                      x1={rx + nx * railGap} y1={ry + ny * railGap}
                      x2={rx - nx * railGap} y2={ry - ny * railGap}
                      stroke="var(--color-ladder)" strokeWidth="0.4" strokeOpacity="0.7"
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
  )
}
