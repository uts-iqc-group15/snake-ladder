import { BOARD_SIZE, SNAKES, LADDERS } from '@/constants/board'
import type { Coord } from '@/constants/board'
import styles from './Board.module.css'

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
    <div className={styles.board}>
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
              className={`${styles.cell} ${isLight ? styles.light : styles.dark}`}
            >
              <span className={styles.number}>{num}</span>
              {hasSnake && (
                <span className={styles.snake} title={`Snake to ${SNAKES[num]}`}>
                  &#x1F40D;
                </span>
              )}
              {hasLadder && (
                <span className={styles.ladder} title={`Ladder to ${LADDERS[num]}`}>
                  &#x1FA9C;
                </span>
              )}
              <div className={styles.players}>
                {p1Here && <span className={styles.p1}>1</span>}
                {p2Here && <span className={styles.p2}>2</span>}
              </div>
            </div>
          )
        }),
      )}
    </div>
  )
}
