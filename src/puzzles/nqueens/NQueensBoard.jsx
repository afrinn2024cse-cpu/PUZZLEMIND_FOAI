import { Crown, X } from 'lucide-react'

function NQueensBoard({ size, events, solved }) {
  const queens = new Map()
  const rejected = new Map()
  const backtracked = new Map()
  let activeColumn = null
  let currentPosition = null

  for (const event of events) {
    if (event.type === 'select-variable') {
      activeColumn = event.columnIndex
      currentPosition = null
    }
    if (event.type === 'try-value') {
      activeColumn = event.columnIndex
      currentPosition = { column: event.columnIndex, row: event.rowIndex }
      const candidateKey = `${event.columnIndex}:${event.rowIndex}`
      backtracked.delete(candidateKey)
      rejected.delete(candidateKey)
    }
    if (event.type === 'reject-value') {
      rejected.set(`${event.columnIndex}:${event.rowIndex}`, event)
    }
    if (event.type === 'place-queen') {
      queens.set(event.columnIndex, event.rowIndex)
      backtracked.delete(`${event.columnIndex}:${event.rowIndex}`)
    }
    if (event.type === 'backtrack') {
      activeColumn = event.columnIndex
      currentPosition = { column: event.columnIndex, row: event.rowIndex }
      backtracked.set(`${event.columnIndex}:${event.rowIndex}`, event)
    }
    if (event.type === 'remove-queen') {
      queens.delete(event.columnIndex)
      activeColumn = event.columnIndex
      currentPosition = null
      backtracked.set(`${event.columnIndex}:${event.rowIndex}`, event)
    }
  }

  const attacked = new Set()
  for (const [queenColumn, queenRow] of queens) {
    for (let column = 0; column < size; column += 1) {
      for (let row = 0; row < size; row += 1) {
        if (column === queenColumn && row === queenRow) continue
        if (row === queenRow || Math.abs(row - queenRow) === Math.abs(column - queenColumn)) {
          attacked.add(`${column}:${row}`)
        }
      }
    }
  }

  return (
    <div className="nqueens-board-frame">
      <div
        className="nqueens-board"
        role="grid"
        aria-label={`${size} by ${size} N-Queens chessboard`}
        style={{ '--queen-board-size': size }}
      >
        {Array.from({ length: size * size }, (_, index) => {
          const row = Math.floor(index / size)
          const column = index % size
          const key = `${column}:${row}`
          const queenAtCell = queens.get(column) === row
          const isRejected = rejected.has(key)
          const isCurrent = currentPosition?.column === column && currentPosition.row === row
          const isBacktracked = backtracked.has(key) && !queenAtCell
          const classes = ['nqueens-square', (row + column) % 2 === 0 ? 'is-light-square' : 'is-dark-square']
          if (column === activeColumn) classes.push('is-active-column')
          if (attacked.has(key) && !queenAtCell) classes.push('is-attacked')
          if (isCurrent) classes.push('is-current-position')
          if (isRejected) classes.push('is-rejected-position')
          if (queenAtCell) classes.push('has-queen')
          if (isBacktracked) classes.push('is-backtracked-queen')
          if (solved && queenAtCell) classes.push('is-solution-queen')
          const rejection = rejected.get(key)
          const state = queenAtCell
            ? solved ? 'final solution queen' : 'placed queen'
            : isRejected
              ? `rejected position, ${rejection.reason}`
              : isCurrent
                ? 'current candidate position'
                : isBacktracked
                  ? 'backtracked queen position'
                  : attacked.has(key)
                    ? 'attacked square'
                    : 'empty square'

          return (
            <div
              aria-label={`Column ${column + 1}, row ${row + 1}, ${state}`}
              className={classes.join(' ')}
              key={key}
              role="gridcell"
              title={rejection?.reason}
            >
              {queenAtCell && <Crown className="queen-glyph" size={size > 9 ? 21 : 27} strokeWidth={1.8} aria-hidden="true" />}
              {isBacktracked && <Crown className="backtracked-glyph" size={size > 9 ? 17 : 21} strokeWidth={1.6} aria-hidden="true" />}
              {isRejected && <X className="rejection-glyph" size={size > 9 ? 14 : 18} strokeWidth={2.2} aria-hidden="true" />}
              {isCurrent && !queenAtCell && !isRejected && <span className="candidate-dot" aria-hidden="true" />}
            </div>
          )
        })}
      </div>
      <ul className="nqueens-legend" aria-label="N-Queens board legend">
        <li><Crown size={14} aria-hidden="true" />Placed queen</li>
        <li><span className="legend-swatch candidate-swatch" />Current position</li>
        <li><X size={13} aria-hidden="true" />Rejected</li>
        <li><span className="legend-swatch attacked-swatch" />Attacked squares</li>
        <li><Crown size={13} className="backtracked-legend-icon" aria-hidden="true" />Backtracked</li>
      </ul>
    </div>
  )
}

export default NQueensBoard