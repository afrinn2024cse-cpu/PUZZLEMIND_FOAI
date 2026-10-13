import assert from 'node:assert/strict'
import test from 'node:test'
import { sudokuPuzzles } from './sudokuPuzzles.js'
import {
  SOLVER_METHODS,
  findSudokuConflicts,
  generateSolverSteps,
  selectMRVVariable,
} from './sudokuSolver.js'
import { buildSearchTree, calculateCandidateReduction, summarizeSolverEvents } from '../../utils/solverSteps.js'

function isSolved(board) {
  const values = '123456789'
  const hasAllValues = (cells) => [...cells].sort().join('') === values
  for (let index = 0; index < 9; index += 1) {
    if (!hasAllValues(board[index].join(''))) return false
    if (!hasAllValues(board.map((row) => row[index]).join(''))) return false
  }
  for (let boxRow = 0; boxRow < 9; boxRow += 3) {
    for (let boxCol = 0; boxCol < 9; boxCol += 3) {
      const cells = []
      for (let row = boxRow; row < boxRow + 3; row += 1) {
        for (let col = boxCol; col < boxCol + 3; col += 1) cells.push(board[row][col])
      }
      if (!hasAllValues(cells.join(''))) return false
    }
  }
  return true
}

test('all predefined puzzles are valid and solvable', () => {
  for (const [difficulty, board] of Object.entries(sudokuPuzzles)) {
    assert.equal(findSudokuConflicts(board).length, 0, `${difficulty} has duplicate clues`)
    const result = generateSolverSteps(board)
    assert.equal(result.error, null, `${difficulty} should be solvable`)
    assert.ok(isSolved(result.solution), `${difficulty} should produce a complete valid solution`)
    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 9; col += 1) {
        if (board[row][col] !== 0) assert.equal(result.solution[row][col], board[row][col])
      }
    }
  }
})

test('MRV selects a variable with the smallest legal domain', () => {
  const board = sudokuPuzzles.Easy
  const selected = selectMRVVariable(board)
  const allDomains = []
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (board[row][col] !== 0) continue
      const result = generateSolverSteps(board)
      const selection = result.events.find((event) => event.type === 'select-variable')
      allDomains.push(selection.domains.find((domain) => domain.row === row && domain.col === col))
    }
  }
  const smallestDomain = Math.min(...allDomains.map(({ domain }) => domain.length))
  assert.equal(selected.domain.length, smallestDomain)
})

test('forward checking emits real peer candidate removals', () => {
  const result = generateSolverSteps(sudokuPuzzles.Easy)
  const assignmentIndex = result.events.findIndex((event) => event.type === 'assign-value')
  const assignment = result.events[assignmentIndex]
  const nextAssignmentIndex = result.events.findIndex(
    (event, index) => index > assignmentIndex && event.type === 'assign-value',
  )
  const prunes = result.events
    .slice(assignmentIndex + 1, nextAssignmentIndex === -1 ? undefined : nextAssignmentIndex)
    .filter((event) => event.type === 'prune-value')
  assert.ok(prunes.length > 0)
  assert.ok(prunes.every((event) => event.value === assignment.value))
  assert.ok(prunes.every((event) => event.causedBy === assignment.cell))
})

test('hard puzzle requires actual recursive backtracking', () => {
  const result = generateSolverSteps(sudokuPuzzles.Hard)
  assert.equal(result.error, null)
  assert.ok(result.events.some((event) => event.type === 'backtrack'))
  assert.ok(isSolved(result.solution))
})

test('duplicate row, column, and box values are reported', () => {
  const board = Array.from({ length: 9 }, () => Array(9).fill(0))
  board[0][0] = 4
  board[0][1] = 4
  board[1][0] = 4
  const conflicts = findSudokuConflicts(board)
  assert.ok(conflicts.some(({ reason }) => reason === 'row conflict'))
  assert.ok(conflicts.some(({ reason }) => reason === 'column conflict'))
  assert.ok(conflicts.some(({ reason }) => reason === 'box conflict'))
})

test('invalid and unsolvable inputs return friendly errors instead of throwing', () => {
  const invalid = sudokuPuzzles.Easy.map((row) => [...row])
  invalid[0][1] = 5
  assert.equal(generateSolverSteps(invalid).error, 'This Sudoku configuration is invalid.')

  const unsolvable = sudokuPuzzles.Easy.map((row) => [...row])
  unsolvable[0][2] = 1
  assert.equal(findSudokuConflicts(unsolvable).length, 0)
  assert.equal(generateSolverSteps(unsolvable).error, 'No solution exists for this Sudoku.')
})

test('all comparison methods solve the same board and report actual statistics', () => {
  const runs = Object.entries(SOLVER_METHODS).map(([method, options]) => {
    const result = generateSolverSteps(sudokuPuzzles.Easy, { method })
    assert.equal(result.error, null, `${options.label} should solve Easy`)
    assert.ok(isSolved(result.solution))
    assert.ok(result.statistics.nodesExplored > 0)
    assert.ok(result.statistics.assignments > 0)
    assert.ok(result.statistics.candidatesTested > 0)
    return { method, result }
  })
  const byMethod = Object.fromEntries(runs.map(({ method, result }) => [method, result]))
  assert.equal(byMethod.basic.statistics.candidatesPruned, 0)
  assert.equal(byMethod.mrv.statistics.candidatesPruned, 0)
  assert.ok(byMethod['mrv-forward'].statistics.candidatesPruned > 0)
  assert.ok(byMethod.basic.statistics.nodesExplored > byMethod.mrv.statistics.nodesExplored)
  assert.ok(byMethod.basic.statistics.candidatesTested > byMethod.mrv.statistics.candidatesTested)
  assert.equal(
    byMethod.basic.events.find((event) => event.type === 'select-variable').reason,
    'first-unassigned',
  )
  assert.equal(byMethod.basic.events.some((event) => event.type === 'forward-check'), false)
  assert.equal(
    byMethod.mrv.events.find((event) => event.type === 'select-variable').reason,
    'MRV',
  )
  assert.equal(byMethod.mrv.events.some((event) => event.type === 'forward-check'), false)
  assert.ok(byMethod['mrv-forward'].events.some((event) => event.type === 'forward-check'))
})

test('default events describe the actual operation order and branch lineage', () => {
  const result = generateSolverSteps(sudokuPuzzles.Easy)
  const summary = result.events[0]
  const selection = result.events.find((event) => event.type === 'select-variable')
  const attemptIndex = result.events.findIndex((event) => event.type === 'try-value')
  const attempt = result.events[attemptIndex]
  const checks = result.events
    .slice(attemptIndex + 1, attemptIndex + 4)
    .filter((event) => event.type === 'check-constraint')
  const assignment = result.events.find((event) => event.type === 'assign-value')
  const forwardCheck = result.events.find((event) => event.type === 'forward-check')
  const prune = result.events.find((event) => event.type === 'prune-value')

  assert.equal(summary.type, 'initial-domain-summary')
  assert.equal(summary.candidateSlots, summary.emptyCellCount * 9)
  assert.equal(selection.reason, 'MRV')
  assert.deepEqual(selection.beforeDomain, [1, 2, 3, 4, 5, 6, 7, 8, 9])
  assert.deepEqual(checks.map((event) => event.constraint), ['row', 'column', 'box'])
  assert.ok(checks.every((event) => event.valid && event.nodeId === attempt.nodeId))
  assert.equal(assignment.nodeId, attempt.nodeId)
  assert.equal(forwardCheck.nodeId, attempt.nodeId)
  assert.equal(prune.nodeId, attempt.nodeId)
  assert.equal(result.statistics.eventCount, result.events.length)
  assert.equal(result.events.at(-1).type, 'solution-found')
})

test('uncaptured comparison runs retain counters without retaining event objects', () => {
  const captured = generateSolverSteps(sudokuPuzzles.Easy)
  const uncaptured = generateSolverSteps(sudokuPuzzles.Easy, { captureEvents: false })
  assert.deepEqual(uncaptured.events, [])
  const summarized = summarizeSolverEvents(captured.events)
  for (const key of [
    'assignments',
    'candidatesTested',
    'candidatesPruned',
    'conflicts',
    'backtracks',
    'nodesExplored',
    'maximumDepth',
  ]) {
    assert.equal(uncaptured.statistics[key], summarized[key], key)
  }
  assert.equal(uncaptured.statistics.eventCount, captured.events.length)
})

test('search tree follows event parent links and marks solution and backtracking states', () => {
  const result = generateSolverSteps(sudokuPuzzles.Hard)
  const tree = buildSearchTree(result.events, 10000)
  assert.ok(tree.nodes.some((node) => node.state === 'backtracked'))
  assert.ok(tree.nodes.some((node) => node.state === 'solution'))
  assert.ok(tree.nodes.every((node) => node.id === 'root' || tree.nodes.some((parent) => parent.id === node.parentId)))

  const limited = buildSearchTree(result.events, 12)
  assert.equal(limited.nodes.length, 12)
  assert.ok(limited.truncatedCount > 0)
})

test('candidate reduction is computed from measured search counters', () => {
  assert.equal(calculateCandidateReduction(120, 30), 75)
  assert.equal(calculateCandidateReduction(120, 150), -25)
  assert.equal(calculateCandidateReduction(0, 0), null)
})