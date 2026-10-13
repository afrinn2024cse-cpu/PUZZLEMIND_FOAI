const GRID_SIZE = 9
const VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export const SOLVER_METHODS = {
  basic: {
    label: 'Basic Backtracking',
    variableSelection: 'first-unassigned',
    forwardChecking: false,
  },
  mrv: {
    label: 'MRV',
    variableSelection: 'mrv',
    forwardChecking: false,
  },
  'mrv-forward': {
    label: 'MRV + Forward Checking',
    variableSelection: 'mrv',
    forwardChecking: true,
  },
}

function cellName(row, col) {
  return `R${row + 1}C${col + 1}`
}

function normalizeBoard(input) {
  if (!Array.isArray(input) || input.length !== GRID_SIZE) {
    return { board: null, error: 'A Sudoku board must contain 9 rows.' }
  }

  const board = []
  for (const row of input) {
    if (!Array.isArray(row) || row.length !== GRID_SIZE) {
      return { board: null, error: 'Each Sudoku row must contain 9 cells.' }
    }

    const values = row.map((cell) => {
      if (cell === '' || cell === null || cell === undefined || cell === 0) return 0
      if (typeof cell === 'string' && /^\s*$/.test(cell)) return 0
      return Number(cell)
    })

    if (values.some((value) => !Number.isInteger(value) || value < 0 || value > 9)) {
      return { board: null, error: 'Sudoku cells must be blank or digits from 1 to 9.' }
    }
    board.push(values)
  }

  return { board, error: null }
}

function addUnitConflicts(board, conflicts, getCells, conflictName) {
  const valuesToCells = new Map()
  for (const { row, col } of getCells()) {
    const value = board[row][col]
    if (value === 0) continue
    const locations = valuesToCells.get(value) ?? []
    locations.push({ row, col })
    valuesToCells.set(value, locations)
  }

  for (const [value, locations] of valuesToCells) {
    if (locations.length < 2) continue
    for (const { row, col } of locations) {
      const key = `${row}:${col}:${conflictName}`
      conflicts.set(key, {
        row,
        col,
        cell: cellName(row, col),
        value,
        reason: `${conflictName} conflict`,
      })
    }
  }
}

export function findSudokuConflicts(input) {
  const normalized = normalizeBoard(input)
  if (!normalized.board) return []
  const board = normalized.board
  const conflicts = new Map()

  for (let row = 0; row < GRID_SIZE; row += 1) {
    addUnitConflicts(
      board,
      conflicts,
      () => Array.from({ length: GRID_SIZE }, (_, col) => ({ row, col })),
      'row',
    )
  }
  for (let col = 0; col < GRID_SIZE; col += 1) {
    addUnitConflicts(
      board,
      conflicts,
      () => Array.from({ length: GRID_SIZE }, (_, row) => ({ row, col })),
      'column',
    )
  }
  for (let boxRow = 0; boxRow < GRID_SIZE; boxRow += 3) {
    for (let boxCol = 0; boxCol < GRID_SIZE; boxCol += 3) {
      addUnitConflicts(
        board,
        conflicts,
        () => Array.from({ length: 9 }, (_, index) => ({
          row: boxRow + Math.floor(index / 3),
          col: boxCol + (index % 3),
        })),
        'box',
      )
    }
  }

  return [...conflicts.values()]
}

function getCandidateDetails(board, row, col) {
  const domain = []
  const prunedCandidates = []

  for (const value of VALUES) {
    let reason = null
    if (board[row].includes(value)) reason = 'Row conflict'
    else if (board.some((boardRow) => boardRow[col] === value)) reason = 'Column conflict'
    else {
      const boxRow = Math.floor(row / 3) * 3
      const boxCol = Math.floor(col / 3) * 3
      for (let boxCellRow = boxRow; boxCellRow < boxRow + 3; boxCellRow += 1) {
        for (let boxCellCol = boxCol; boxCellCol < boxCol + 3; boxCellCol += 1) {
          if (board[boxCellRow][boxCellCol] === value) reason = 'Box conflict'
        }
      }
    }

    if (reason) prunedCandidates.push({ value, reason })
    else domain.push(value)
  }

  return { domain, prunedCandidates }
}

function getEmptyCells(board) {
  const cells = []
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (board[row][col] === 0) cells.push({ row, col })
    }
  }
  return cells
}

export function selectMRVVariable(input) {
  const normalized = normalizeBoard(input)
  if (!normalized.board) return null

  const domains = getEmptyCells(normalized.board).map(({ row, col }) => {
    const details = getCandidateDetails(normalized.board, row, col)
    return { row, col, cell: cellName(row, col), ...details }
  })
  domains.sort((left, right) =>
    left.domain.length - right.domain.length || left.row - right.row || left.col - right.col,
  )
  return domains[0] ?? null
}

function getPeers(row, col) {
  const peers = new Map()
  const addPeer = (peerRow, peerCol) => {
    if (peerRow === row && peerCol === col) return
    peers.set(`${peerRow}:${peerCol}`, { row: peerRow, col: peerCol })
  }

  for (let index = 0; index < GRID_SIZE; index += 1) {
    addPeer(row, index)
    addPeer(index, col)
  }
  const boxRow = Math.floor(row / 3) * 3
  const boxCol = Math.floor(col / 3) * 3
  for (let peerRow = boxRow; peerRow < boxRow + 3; peerRow += 1) {
    for (let peerCol = boxCol; peerCol < boxCol + 3; peerCol += 1) {
      addPeer(peerRow, peerCol)
    }
  }
  return [...peers.values()]
}

function constraintIsClear(board, row, col, value, constraint) {
  if (constraint === 'row') return !board[row].includes(value)
  if (constraint === 'column') return !board.some((boardRow) => boardRow[col] === value)

  const boxRow = Math.floor(row / 3) * 3
  const boxCol = Math.floor(col / 3) * 3
  for (let boxCellRow = boxRow; boxCellRow < boxRow + 3; boxCellRow += 1) {
    for (let boxCellCol = boxCol; boxCellCol < boxCol + 3; boxCellCol += 1) {
      if (board[boxCellRow][boxCellCol] === value) return false
    }
  }
  return true
}

function createEvent(type, properties = {}) {
  return { type, ...properties }
}

export function generateSolverSteps(input, options = {}) {
  const method = SOLVER_METHODS[options.method ?? 'mrv-forward']
  if (!method) throw new Error(`Unknown Sudoku solver method: ${options.method}`)
  const captureEvents = options.captureEvents !== false
  const normalized = normalizeBoard(input)
  const events = []
  const statistics = {
    assignments: 0,
    candidatesTested: 0,
    candidatesPruned: 0,
    conflicts: 0,
    backtracks: 0,
    nodesExplored: 0,
    maximumDepth: 0,
    eventCount: 0,
  }
  const emit = (event) => {
    statistics.eventCount += 1
    if (event.type === 'assign-value') statistics.assignments += 1
    if (event.type === 'try-value') statistics.candidatesTested += 1
    if (event.type === 'prune-value') statistics.candidatesPruned += 1
    if (event.type === 'conflict') statistics.conflicts += 1
    if (event.type === 'backtrack') statistics.backtracks += 1
    if (event.type === 'node-explored') statistics.nodesExplored += 1
    if (Number.isInteger(event.depth)) {
      statistics.maximumDepth = Math.max(statistics.maximumDepth, event.depth)
    }
    if (captureEvents) events.push(event)
  }
  const result = (solution, error) => ({
    events,
    solution,
    error,
    statistics: { ...statistics },
  })

  if (!normalized.board) {
    const error = normalized.error
    emit(createEvent('invalid-puzzle', { reason: error }))
    return result(null, error)
  }

  const board = normalized.board
  const initialConflicts = findSudokuConflicts(board)
  if (initialConflicts.length > 0) {
    for (const conflict of initialConflicts) emit(createEvent('conflict', conflict))
    const error = 'This Sudoku configuration is invalid.'
    emit(createEvent('invalid-puzzle', { reason: error }))
    return result(null, error)
  }

  const initialEmptyCells = getEmptyCells(board)
  const initialLegalCandidateCount = initialEmptyCells.reduce(
    (total, { row, col }) => total + getCandidateDetails(board, row, col).domain.length,
    0,
  )
  emit(createEvent('initial-domain-summary', {
    emptyCellCount: initialEmptyCells.length,
    candidateSlots: initialEmptyCells.length * VALUES.length,
    legalCandidateCount: initialLegalCandidateCount,
  }))

  let solution = null
  let nextDecisionId = 0
  let nextTerminalId = 0

  function search(depth, parentNodeId = 'root') {
    emit(createEvent('node-explored', { depth, parentNodeId }))
    const emptyCells = getEmptyCells(board)
    if (emptyCells.length === 0) {
      solution = board.map((row) => [...row])
      emit(createEvent('solution-found', {
        solution,
        treeNodeId: `solution-${++nextTerminalId}`,
        parentNodeId,
        depth,
      }))
      return true
    }

    const domains = method.variableSelection === 'mrv'
      ? emptyCells.map(({ row, col }) => ({
        row,
        col,
        cell: cellName(row, col),
        ...getCandidateDetails(board, row, col),
      }))
      : []
    if (method.variableSelection === 'mrv') {
      domains.sort((left, right) =>
        left.domain.length - right.domain.length || left.row - right.row || left.col - right.col,
      )
    }
    const variable = method.variableSelection === 'mrv'
      ? domains[0]
      : {
        ...emptyCells[0],
        cell: cellName(emptyCells[0].row, emptyCells[0].col),
        ...getCandidateDetails(board, emptyCells[0].row, emptyCells[0].col),
      }
    const comparedDomains = method.variableSelection === 'mrv'
      ? domains.map(({ row, col, cell, domain }) => ({ row, col, cell, domain }))
      : [{ row: variable.row, col: variable.col, cell: variable.cell, domain: variable.domain }]

    emit(createEvent('select-variable', {
      row: variable.row,
      col: variable.col,
      cell: variable.cell,
      beforeDomain: [...VALUES],
      domain: [...variable.domain],
      prunedCandidates: variable.prunedCandidates,
      domains: comparedDomains,
      reason: method.variableSelection === 'mrv' ? 'MRV' : 'first-unassigned',
      depth,
      parentNodeId,
    }))

    if (variable.domain.length === 0) {
      emit(createEvent('conflict', {
        row: variable.row,
        col: variable.col,
        cell: variable.cell,
        reason: 'empty domain',
        treeNodeId: `conflict-${++nextTerminalId}`,
        parentNodeId,
        depth,
      }))
      return false
    }

    const candidateValues = method.variableSelection === 'first-unassigned'
      ? VALUES
      : variable.domain
    for (const value of candidateValues) {
      const nodeId = `decision-${++nextDecisionId}`
      emit(createEvent('try-value', {
        row: variable.row,
        col: variable.col,
        cell: variable.cell,
        value,
        depth,
        nodeId,
        parentNodeId,
      }))

      const checks = ['row', 'column', 'box'].map((constraint) => {
        const valid = constraintIsClear(board, variable.row, variable.col, value, constraint)
        emit(createEvent('check-constraint', {
          row: variable.row,
          col: variable.col,
          cell: variable.cell,
          value,
          constraint,
          valid,
          nodeId,
          depth,
        }))
        return valid
      })

      if (!checks.every(Boolean)) {
        const failedConstraints = ['row', 'column', 'box']
          .filter((_, index) => !checks[index])
        emit(createEvent('conflict', {
          row: variable.row,
          col: variable.col,
          cell: variable.cell,
          value,
          reason: `${failedConstraints.join(', ')} constraint violation`,
          nodeId,
          depth,
        }))
        continue
      }

      const peers = method.forwardChecking ? getPeers(variable.row, variable.col) : []
      const previousDomains = method.forwardChecking
        ? new Map(
          peers
            .filter(({ row, col }) => board[row][col] === 0)
            .map(({ row, col }) => [`${row}:${col}`, getCandidateDetails(board, row, col).domain]),
        )
        : new Map()
      board[variable.row][variable.col] = value
      emit(createEvent('assign-value', {
        row: variable.row,
        col: variable.col,
        cell: variable.cell,
        value,
        depth,
        nodeId,
        parentNodeId,
      }))
      if (method.forwardChecking) {
        emit(createEvent('forward-check', {
          row: variable.row,
          col: variable.col,
          cell: variable.cell,
          value,
          affectedCells: previousDomains.size,
          depth,
          nodeId,
          parentNodeId,
        }))
      }

      const emptyDomainConflicts = []
      if (method.forwardChecking) {
        for (const peer of peers) {
          if (board[peer.row][peer.col] !== 0) continue
          const key = `${peer.row}:${peer.col}`
          const before = previousDomains.get(key) ?? []
          const after = getCandidateDetails(board, peer.row, peer.col).domain
          if (before.includes(value) && !after.includes(value)) {
            const reason = peer.row === variable.row
              ? 'row constraint'
              : peer.col === variable.col
                ? 'column constraint'
                : 'box constraint'
            emit(createEvent('prune-value', {
              row: peer.row,
              col: peer.col,
              cell: cellName(peer.row, peer.col),
              value,
              reason,
              causedBy: variable.cell,
              nodeId,
              depth,
            }))
          }
          if (after.length === 0) {
            emptyDomainConflicts.push({
              row: peer.row,
              col: peer.col,
              cell: cellName(peer.row, peer.col),
              beforeDomain: before,
              domain: after,
              prunedCandidates: getCandidateDetails(board, peer.row, peer.col).prunedCandidates,
            })
          }
        }
      }

      if (emptyDomainConflicts.length > 0) {
        for (const conflict of emptyDomainConflicts) {
          emit(createEvent('conflict', {
            ...conflict,
            reason: 'empty domain',
            treeNodeId: `conflict-${++nextTerminalId}`,
            parentNodeId: nodeId,
            nodeId,
            depth: depth + 1,
          }))
        }
      } else if (search(depth + 1, nodeId)) {
        return true
      }

      board[variable.row][variable.col] = 0
      emit(createEvent('backtrack', {
        row: variable.row,
        col: variable.col,
        cell: variable.cell,
        value,
        depth,
        nodeId,
        parentNodeId,
      }))
    }

    return false
  }

  if (!search(0)) {
    const error = 'No solution exists for this Sudoku.'
    emit(createEvent('no-solution', { reason: error }))
    return result(null, error)
  }

  return result(solution, null)
}