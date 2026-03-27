import { BOARD_SIZE, SNAKES, LADDERS } from '@/constants/board'
import type { Coord } from '@/constants/board'

interface BoardProps {
  positions: [Coord, Coord]
}

function getCellNumber(row: number, col: number): number {
  const boardRow = BOARD_SIZE - 1 - row
  return boardRow % 2 === 0
    ? boardRow * BOARD_SIZE + col + 1
    : boardRow * BOARD_SIZE + (BOARD_SIZE - col)
}

export function Board({ positions }: BoardProps) {
  const cells: number[][] = []
  for (let row = 0; row < BOARD_SIZE; row++) {
    const rowCells: number[] = []
    for (let col = 0; col < BOARD_SIZE; col++) {
      rowCells.push(getCellNumber(row, col))
    }
    cells.push(rowCells)
  }

  return (
    <div className="board-responsive grid grid-cols-10 gap-px bg-[var(--color-board-border)] rounded-[var(--radius-board)] overflow-hidden shadow-[var(--shadow-glass)]">
      {cells.map((row, rowIdx) =>
        row.map((num, colIdx) => {
          const isLight = (rowIdx + colIdx) % 2 === 0
          const hasSnake = num in SNAKES
          const hasLadder = num in LADDERS

          const boardRow = BOARD_SIZE - 1 - rowIdx
          const boardCol = colIdx

          const p1Here = positions[0].col === boardCol && positions[0].row === boardRow
          const p2Here = positions[1].col === boardCol && positions[1].row === boardRow

          return (
            <div
              key={num}
              className={`relative flex items-center justify-center text-[0.7rem] select-none ${
                isLight ? 'bg-board-light' : 'bg-board-dark'
              } ${hasSnake ? 'shadow-[inset_0_0_8px_var(--color-snake)]' : ''} ${
                hasLadder ? 'shadow-[inset_0_0_8px_var(--color-ladder)]' : ''
              }`}
              aria-label={
                hasSnake
                  ? `Snake: slide to ${SNAKES[num]}`
                  : hasLadder
                    ? `Ladder: climb to ${LADDERS[num]}`
                    : undefined
              }
            >
              <span className="absolute top-0.5 left-1 text-[0.6rem] font-bold text-text-muted">
                {num}
              </span>

              {hasSnake && (
                <span className="absolute bottom-0 right-0.5 text-[1.2rem]" aria-hidden="true">
                  &#x1F40D;
                </span>
              )}
              {hasLadder && (
                <span className="absolute bottom-0 right-0.5 text-[1.2rem]" aria-hidden="true">
                  &#x1FA9C;
                </span>
              )}

              <div className="absolute inset-0 flex items-center justify-center gap-0.5 pointer-events-none">
                {p1Here && (
                  <span className="flex items-center justify-center w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-player-1 text-[0.7rem] font-bold text-white shadow-[0_0_8px_var(--color-player-1),0_0_16px_var(--color-player-1)] z-10">
                    1
                  </span>
                )}
                {p2Here && (
                  <span className="flex items-center justify-center w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-player-2 text-[0.7rem] font-bold text-white shadow-[0_0_8px_var(--color-player-2),0_0_16px_var(--color-player-2)] z-10">
                    2
                  </span>
                )}
              </div>
            </div>
          )
        }),
      )}
    </div>
  )
}
