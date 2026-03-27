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

  return (
    <div className="board-responsive grid grid-cols-10 gap-px bg-[var(--color-board-border)] rounded-[var(--radius-board)] overflow-hidden shadow-[var(--shadow-board)]">
      {cells.map((row, rowIdx) =>
        row.map((num, colIdx) => {
          const isLight = (rowIdx + colIdx) % 2 === 0
          const boardRow = BOARD_SIZE - 1 - rowIdx
          const boardCol = colIdx

          // Qubit on this cell
          const qubitHere = qubits.find((q) => q.cell === num)
          const isOwnQubit = qubitHere && qubitHere.owner === currentPlayer
          const showQubit =
            qubitHere &&
            (qubitHere.collapsed !== null || // collapsed: always visible
              (isSetup && isOwnQubit) || // setup: own qubits visible
              (phase === 'play' && isOwnQubit && qubitHere.collapsed === null)) // play: own uncollapsed

          // Setup placement validity
          const isValidTarget =
            isSetup &&
            selectedConfigIndex !== null &&
            num >= PLACEMENT_MIN &&
            num <= PLACEMENT_MAX &&
            !occupiedCells.includes(num)

          // Player tokens
          const p1Here = boardCol === p1Coord.col && boardRow === p1Coord.row
          const p2Here = boardCol === p2Coord.col && boardRow === p2Coord.row
          const showTokens = phase === 'play' || phase === 'gameover'

          // Cell backgrounds
          const baseBg = isLight ? 'bg-board-light' : 'bg-board-dark'
          let tintClass = ''
          if (qubitHere?.collapsed === 'snake') {
            tintClass = 'bg-[rgba(192,69,48,0.15)]'
          } else if (qubitHere?.collapsed === 'ladder') {
            tintClass = 'bg-[rgba(45,106,79,0.15)]'
          } else if (isSetup && isValidTarget) {
            tintClass = 'bg-[rgba(255,255,255,0.04)]'
          }

          const cursorClass = isSetup && isValidTarget ? 'cursor-pointer hover:bg-[rgba(255,255,255,0.1)]' : ''

          return (
            <div
              key={num}
              className={`relative flex items-center justify-center text-[0.7rem] select-none transition-colors ${baseBg} ${tintClass} ${cursorClass}`}
              onClick={() => {
                if (isSetup && isValidTarget && onCellClick) {
                  onCellClick(num)
                }
              }}
              aria-label={
                qubitHere?.collapsed === 'snake'
                  ? `Snake on cell ${num}`
                  : qubitHere?.collapsed === 'ladder'
                    ? `Ladder on cell ${num}`
                    : undefined
              }
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
                  title={isOwnQubit ? `Qubit [${QUBIT_CONFIGS[qubitHere.configIndex].label}]` : 'Quantum item'}
                >
                  {QUBIT_CONFIGS[qubitHere.configIndex].entangled ? '\u269B' : '\u2B50'}
                </span>
              )}
              {qubitHere?.collapsed === 'snake' && (
                <span className="absolute bottom-0 right-0.5 text-[1.2rem]" aria-hidden="true">
                  &#x1F40D;
                </span>
              )}
              {qubitHere?.collapsed === 'ladder' && (
                <span className="absolute bottom-0 right-0.5 text-[1.2rem]" aria-hidden="true">
                  &#x1FA9C;
                </span>
              )}
              {qubitHere?.collapsed === 'interference' && (
                <span className="absolute bottom-0 right-0.5 text-[0.9rem] opacity-40" aria-hidden="true">
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
  )
}
