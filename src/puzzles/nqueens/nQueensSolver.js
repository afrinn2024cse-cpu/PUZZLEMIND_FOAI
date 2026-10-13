const MIN_SIZE = 1
const MAX_SIZE = 12

function makeEvent(type, properties = {}) {
  return { type, ...properties }
}

export function summarizeNQueensEvents(events, elapsedMs = 0) {
  return {
    positionsTested: events.filter((event) => event.type === 'try-value').length,
    queensPlaced: events.filter((event) => event.type === 'place-queen').length,
    positionsRejected: events.filter((event) => event.type === 'reject-value').length,
    conflicts: events.filter((event) => event.type === 'conflict').length,
    backtracks: events.filter((event) => event.type === 'backtrack').length,
    nodesExplored: events.filter((event) => event.type === 'node-explored').length,
    maximumDepth: events.reduce((maximum, event) => Math.max(maximum, event.depth ?? 0), 0),
    elapsedMs,
  }
}

export function generateNQueensSteps(size, options = {}) {
  const solutionOffset = Math.max(0, Math.floor(options.solutionOffset ?? 0))
  const events = []
  const statistics = {
    positionsTested: 0,
    queensPlaced: 0,
    positionsRejected: 0,
    conflicts: 0,
    backtracks: 0,
    nodesExplored: 0,
    maximumDepth: 0,
    eventCount: 0,
  }
  const emit = (event) => {
    events.push(event)
    statistics.eventCount += 1
    if (event.type === 'try-value') statistics.positionsTested += 1
    if (event.type === 'place-queen') statistics.queensPlaced += 1
    if (event.type === 'reject-value') statistics.positionsRejected += 1
    if (event.type === 'conflict') statistics.conflicts += 1
    if (event.type === 'backtrack') statistics.backtracks += 1
    if (event.type === 'node-explored') statistics.nodesExplored += 1
    if (Number.isInteger(event.depth)) {
      statistics.maximumDepth = Math.max(statistics.maximumDepth, event.depth)
    }
  }
  const result = (solution, error, solutionsFound) => ({
    events,
    solution,
    error,
    solutionsFound,
    statistics: { ...statistics },
  })

  if (!Number.isInteger(size) || size < MIN_SIZE || size > MAX_SIZE) {
    const error = `Board size must be an integer from ${MIN_SIZE} to ${MAX_SIZE}.`
    emit(makeEvent('invalid-puzzle', { reason: error }))
    return result(null, error, 0)
  }

  const positions = Array(size).fill(-1)
  let nextDecisionId = 0
  let nextTerminalId = 0
  let solutionsFound = 0
  let solution = null

  function search(column, parentNodeId = 'root') {
    emit(makeEvent('node-explored', { depth: column, column: column + 1, parentNodeId }))
    if (column === size) {
      solutionsFound += 1
      const treeNodeId = `solution-${++nextTerminalId}`
      if (solutionsFound <= solutionOffset) {
        emit(makeEvent('solution-skipped', {
          treeNodeId,
          parentNodeId,
          depth: column,
          solutionNumber: solutionsFound,
        }))
        return false
      }

      solution = [...positions]
      emit(makeEvent('solution-found', {
        solution: [...solution],
        treeNodeId,
        parentNodeId,
        depth: column,
        solutionNumber: solutionsFound,
      }))
      return true
    }

    const cell = `C${column + 1}`
    emit(makeEvent('select-variable', {
      column: column + 1,
      columnIndex: column,
      cell,
      depth: column,
      reason: 'next-column',
      parentNodeId,
    }))

    for (let row = 0; row < size; row += 1) {
      const nodeId = `decision-${++nextDecisionId}`
      const rowNumber = row + 1
      emit(makeEvent('try-value', {
        column: column + 1,
        columnIndex: column,
        row: rowNumber,
        rowIndex: row,
        cell,
        value: rowNumber,
        depth: column,
        nodeId,
        parentNodeId,
      }))

      const sameRowColumn = positions.findIndex((placedRow, placedColumn) =>
        placedColumn < column && placedRow === row,
      )
      const diagonalColumn = positions.findIndex((placedRow, placedColumn) =>
        placedColumn < column && Math.abs(placedRow - row) === column - placedColumn,
      )
      const rowValid = sameRowColumn === -1
      const diagonalValid = diagonalColumn === -1

      emit(makeEvent('check-constraint', {
        column: column + 1,
        columnIndex: column,
        row: rowNumber,
        rowIndex: row,
        cell,
        value: rowNumber,
        constraint: 'row',
        valid: rowValid,
        conflictingQueen: rowValid ? null : {
          column: sameRowColumn + 1,
          row: positions[sameRowColumn] + 1,
        },
        depth: column,
        nodeId,
      }))
      emit(makeEvent('check-constraint', {
        column: column + 1,
        columnIndex: column,
        row: rowNumber,
        rowIndex: row,
        cell,
        value: rowNumber,
        constraint: 'diagonal',
        valid: diagonalValid,
        conflictingQueen: diagonalValid ? null : {
          column: diagonalColumn + 1,
          row: positions[diagonalColumn] + 1,
        },
        depth: column,
        nodeId,
      }))
      emit(makeEvent('check-constraint', {
        column: column + 1,
        columnIndex: column,
        row: rowNumber,
        rowIndex: row,
        cell,
        value: rowNumber,
        constraint: 'column',
        valid: true,
        depth: column,
        nodeId,
      }))

      if (!rowValid || !diagonalValid) {
        const reason = !rowValid ? 'row conflict' : 'diagonal conflict'
        const conflictingQueen = !rowValid
          ? { column: sameRowColumn + 1, row: positions[sameRowColumn] + 1 }
          : { column: diagonalColumn + 1, row: positions[diagonalColumn] + 1 }
        emit(makeEvent('reject-value', {
          column: column + 1,
          columnIndex: column,
          row: rowNumber,
          rowIndex: row,
          cell,
          value: rowNumber,
          reason,
          conflictingQueen,
          depth: column,
          nodeId,
          parentNodeId,
        }))
        emit(makeEvent('conflict', {
          column: column + 1,
          columnIndex: column,
          row: rowNumber,
          rowIndex: row,
          cell,
          value: rowNumber,
          reason,
          conflictingQueen,
          depth: column,
          nodeId,
          parentNodeId,
        }))
        continue
      }

      positions[column] = row
      emit(makeEvent('place-queen', {
        column: column + 1,
        columnIndex: column,
        row: rowNumber,
        rowIndex: row,
        cell,
        value: rowNumber,
        depth: column,
        nodeId,
        parentNodeId,
      }))

      if (search(column + 1, nodeId)) return true

      emit(makeEvent('backtrack', {
        column: column + 1,
        columnIndex: column,
        row: rowNumber,
        rowIndex: row,
        cell,
        value: rowNumber,
        depth: column,
        nodeId,
        parentNodeId,
      }))
      positions[column] = -1
      emit(makeEvent('remove-queen', {
        column: column + 1,
        columnIndex: column,
        row: rowNumber,
        rowIndex: row,
        cell,
        value: rowNumber,
        depth: column,
        nodeId,
        parentNodeId,
      }))
    }

    emit(makeEvent('conflict', {
      column: column + 1,
      columnIndex: column,
      cell,
      reason: `no valid row remains in column ${column + 1}`,
      depth: column,
      treeNodeId: `conflict-${++nextTerminalId}`,
      parentNodeId,
    }))
    return false
  }

  const found = search(0)
  if (!found) {
    const error = solutionsFound > 0
      ? `No additional solution exists for N=${size}.`
      : `No solution exists for N=${size}.`
    emit(makeEvent('no-solution', { reason: error, size, depth: size }))
    return result(null, error, solutionsFound)
  }

  return result(solution, null, solutionsFound)
}