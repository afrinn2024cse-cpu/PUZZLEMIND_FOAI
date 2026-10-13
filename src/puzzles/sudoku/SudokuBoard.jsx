import { findSudokuConflicts } from './sudokuSolver.js'

function SudokuBoard({ board, clues, events, onCellChange, solved }) {
  const assignments = new Map()
  const backtracked = new Set()
  const conflicted = new Set(findSudokuConflicts(board).map(({ row, col }) => `${row}:${col}`))
  const conflictEvents = new Map()
  const prunedByNode = new Map()
  const forwardAffectedCells = new Set()
  let selectedCell = null
  let testedCandidate = null
  let activeForwardNode = null

  for (const event of events) {
    if (event.type === 'select-variable') {
      selectedCell = `${event.row}:${event.col}`
      testedCandidate = null
      activeForwardNode = null
      forwardAffectedCells.clear()
    }
    if (event.type === 'try-value') {
      testedCandidate = { key: `${event.row}:${event.col}`, value: event.value }
      conflictEvents.delete(testedCandidate.key)
      backtracked.delete(testedCandidate.key)
      activeForwardNode = null
      forwardAffectedCells.clear()
    }
    if (event.type === 'assign-value') {
      assignments.set(`${event.row}:${event.col}`, event.value)
      backtracked.delete(`${event.row}:${event.col}`)
      conflicted.delete(`${event.row}:${event.col}`)
    }
    if (event.type === 'forward-check') {
      activeForwardNode = event.nodeId
      forwardAffectedCells.clear()
    }
    if (event.type === 'prune-value') {
      const key = `${event.row}:${event.col}`
      const pruningNodes = prunedByNode.get(key) ?? new Set()
      pruningNodes.add(event.nodeId)
      prunedByNode.set(key, pruningNodes)
      if (event.nodeId === activeForwardNode) forwardAffectedCells.add(key)
    }
    if (event.type === 'backtrack') {
      const key = `${event.row}:${event.col}`
      selectedCell = key
      assignments.delete(key)
      backtracked.add(key)
      testedCandidate = null
      for (const [peerKey, pruningNodes] of prunedByNode) {
        pruningNodes.delete(event.nodeId)
        if (pruningNodes.size === 0) prunedByNode.delete(peerKey)
      }
      for (const [conflictKey, conflict] of conflictEvents) {
        if (conflict.nodeId === event.nodeId) conflictEvents.delete(conflictKey)
      }
    }
    if (event.type === 'conflict' && Number.isInteger(event.row) && Number.isInteger(event.col)) {
      const key = `${event.row}:${event.col}`
      conflictEvents.set(key, { nodeId: event.nodeId })
      if (event.reason === 'empty domain') selectedCell = key
    }
  }

  return (
    <div className="sudoku-board-frame">
      <div className="sudoku-board" role="group" aria-label="Editable 9 by 9 Sudoku board">
        {Array.from({ length: 81 }, (_, index) => {
          const row = Math.floor(index / 9)
          const col = index % 9
          const key = `${row}:${col}`
          const isClue = clues[row][col] !== 0
          const solverValue = assignments.get(key)
          const candidateValue = testedCandidate?.key === key ? testedCandidate.value : null
          const value = board[row][col] || solverValue || candidateValue || ''
          const stateDescription = solved && value
            ? 'final solution'
            : isClue
              ? 'original clue'
              : solverValue
                ? 'solver assignment'
                : candidateValue !== null
                  ? `testing ${candidateValue}`
                  : board[row][col]
                    ? 'your entry'
                    : 'empty'
          const classes = ['sudoku-cell']
          if (col === 2 || col === 5) classes.push('box-right')
          if (row === 2 || row === 5) classes.push('box-bottom')
          if (isClue) classes.push('is-clue')
          else if (board[row][col] !== 0) classes.push('is-user-entry')
          if (solverValue) classes.push('is-solver-entry')
          if (candidateValue !== null && !solverValue && !board[row][col]) classes.push('is-testing')
          if (selectedCell === key) classes.push('is-current')
          if (selectedCell) {
            const [selectedRow, selectedCol] = selectedCell.split(':').map(Number)
            const sameRow = row === selectedRow
            const sameColumn = col === selectedCol
            const sameBox = Math.floor(row / 3) === Math.floor(selectedRow / 3)
              && Math.floor(col / 3) === Math.floor(selectedCol / 3)
            if (key !== selectedCell) {
              if (sameRow) classes.push('is-row-peer')
              if (sameColumn) classes.push('is-column-peer')
              if (sameBox) classes.push('is-box-peer')
              if (sameRow || sameColumn || sameBox) classes.push('is-related-peer')
            }
          }
          if (forwardAffectedCells.has(key)) classes.push('is-forward-affected')
          if (conflicted.has(key) || conflictEvents.has(key)) classes.push('is-conflict')
          if (backtracked.has(key)) classes.push('is-backtracked')
          if (prunedByNode.has(key) && !value) classes.push('is-pruned-peer')
          if (solved && value) classes.push('is-solved')
          const visualStates = [stateDescription]
          if (selectedCell === key) visualStates.push('current variable')
          if (conflicted.has(key) || conflictEvents.has(key)) visualStates.push('conflict')
          if (backtracked.has(key)) visualStates.push('backtracked')
          if (forwardAffectedCells.has(key)) visualStates.push('affected by forward checking')
          if (prunedByNode.has(key) && !value) visualStates.push('candidate pruned')

          return (
            <input
              key={key}
              className={classes.join(' ')}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={value}
              readOnly={isClue || Boolean(solverValue) || candidateValue !== null}
              aria-label={`Row ${row + 1}, column ${col + 1}, ${visualStates.join(', ')}`}
              onChange={(event) => onCellChange(row, col, event.target.value)}
            />
          )
        })}
      </div>
      <ul className="board-legend" aria-label="Sudoku board state legend">
        <li><span className="legend-mark legend-clue" />Clue</li>
        <li><span className="legend-mark legend-user" />Your entry</li>
        <li><span className="legend-mark legend-solver" />Solver</li>
        <li><span className="legend-mark legend-testing" />Candidate test</li>
        <li><span className="legend-mark legend-solved" />Final solution</li>
        <li><span className="legend-mark legend-current" />Current</li>
        <li><span className="legend-mark legend-related" />Row / column / box</li>
        <li><span className="legend-mark legend-conflict" />Conflict / backtrack</li>
        <li><span className="legend-mark legend-affected" />Propagation</li>
        <li><span className="legend-mark legend-pruned" />Pruned peer</li>
      </ul>
    </div>
  )
}

export default SudokuBoard