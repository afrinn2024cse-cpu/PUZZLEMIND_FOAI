import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSearchTree, describeTimelineEvent } from '../../utils/solverSteps.js'
import { kakuroPuzzles } from './kakuroPuzzles.js'
import {
  calculateKakuroDomain,
  generateKakuroSteps,
  parseKakuroPuzzle,
  solveKakuro,
} from './kakuroSolver.js'

function assertValidKakuroSolution(puzzle, assignment) {
  const parsed = parseKakuroPuzzle(puzzle)
  for (const run of parsed.runs) {
    const values = run.cells.map((variable) => assignment[variable])
    assert.ok(values.every((value) => Number.isInteger(value) && value >= 1 && value <= 9))
    assert.equal(new Set(values).size, values.length, `${run.direction} run digits must be unique`)
    assert.equal(values.reduce((sum, digit) => sum + digit, 0), run.clue, `${run.direction} run sum must match`)
  }
}

test('Kakuro parser constructs across/down runs from clue cells', () => {
  const easy = parseKakuroPuzzle(kakuroPuzzles.easy)
  assert.deepEqual(easy.variables.map(({ id }) => id), ['X1', 'X2', 'X3', 'X4'])
  assert.equal(easy.runs.length, 4)
  assert.equal(easy.runsByVariable.X1.length, 2)
  assert.ok(easy.runs.some((run) => run.direction === 'across' && run.clue === 4 && run.cells.join() === 'X1,X2'))
  assert.ok(easy.runs.some((run) => run.direction === 'down' && run.clue === 3 && run.cells.join() === 'X1,X3'))

  const heavy = parseKakuroPuzzle(kakuroPuzzles.constraintHeavy)
  assert.equal(heavy.variables.length, 6)
  assert.equal(heavy.runs.length, 5)
})

test('Easy and constraint-heavy Kakuro puzzles solve from their clues', () => {
  for (const puzzle of [kakuroPuzzles.easy, kakuroPuzzles.constraintHeavy]) {
    const result = solveKakuro({ puzzle, heuristic: 'mrv', forwardChecking: true })
    assert.equal(result.solved, true, puzzle.name)
    assertValidKakuroSolution(puzzle, result.solution)
  }
})

test('domain calculation applies run uniqueness and remaining-sum bounds', () => {
  const puzzle = kakuroPuzzles.easy
  assert.deepEqual(calculateKakuroDomain(puzzle, {}, 'X4'), [1])
  assert.ok(calculateKakuroDomain(puzzle, { X1: 1 }, 'X2').every((digit) => digit !== 1))

  const impossible = solveKakuro({ puzzle: kakuroPuzzles.unsatisfiable, heuristic: 'mrv', forwardChecking: true })
  assert.equal(impossible.solved, false)
  assert.equal(impossible.error, 'No valid solution exists.')
})

test('MRV, degree tie-break, forward checking, and backtracking come from search state', () => {
  const trace = []
  const result = solveKakuro({
    puzzle: kakuroPuzzles.constraintHeavy,
    heuristic: 'mrv',
    forwardChecking: true,
    onEvent: (event) => trace.push(event),
  })
  const selection = trace.find((event) => event.type === 'select-cell')
  const smallestDomain = Math.min(...selection.domains.map(({ domain }) => domain.length))
  const degreeAmongSmallest = Math.max(
    ...selection.domains
      .filter(({ domain }) => domain.length === smallestDomain)
      .map(({ degree }) => degree),
  )
  assert.equal(selection.domain.length, smallestDomain)
  assert.equal(selection.degree, degreeAmongSmallest)
  assert.equal(selection.reason, 'MRV')
  assert.ok(trace.some((event) => event.type === 'forward-check'))
  assert.ok(trace.some((event) => event.type === 'domain-reduction'))
  assert.ok(trace.some((event) => event.type === 'prune-digit'))
  assert.ok(result.statistics.constraintChecks > 0)

  const mrvWithoutForwardChecking = []
  solveKakuro({
    puzzle: kakuroPuzzles.constraintHeavy,
    heuristic: 'mrv',
    forwardChecking: false,
    onEvent: (event) => mrvWithoutForwardChecking.push(event),
  })
  for (const selection of mrvWithoutForwardChecking.filter((event) => event.type === 'select-cell')) {
    const smallestDomain = Math.min(...selection.domains.map(({ domain }) => domain.length))
    const highestDegree = Math.max(...selection.domains
      .filter(({ domain }) => domain.length === smallestDomain)
      .map(({ degree }) => degree))
    assert.equal(selection.domain.length, smallestDomain)
    assert.equal(selection.degree, highestDegree)
  }

  const unsatisfiable = generateKakuroSteps(kakuroPuzzles.unsatisfiable)
  assert.ok(unsatisfiable.events.some((event) => event.type === 'conflict'))
  assert.ok(unsatisfiable.events.some((event) => event.type === 'backtrack'))
  assert.equal(unsatisfiable.events.at(-1).type, 'no-solution')
})

test('visual solver emits real checks, run state, solution, and shared tree/timeline data', () => {
  const result = generateKakuroSteps(kakuroPuzzles.easy)
  const types = new Set(result.events.map((event) => event.type))
  for (const type of [
    'select-cell',
    'calculate-domain',
    'try-digit',
    'assign-digit',
    'sum-check',
    'duplicate-check',
    'prune-digit',
    'domain-reduction',
    'solution-found',
  ]) assert.ok(types.has(type), `expected ${type}`)
  assert.ok(result.events.some((event) => event.runCells?.length && event.remainingCells !== undefined))
  assert.ok(result.events.map(describeTimelineEvent).some((description) => description.includes('Try digit')))
  const searchTree = buildSearchTree(result.events, 1000)
  assert.ok(searchTree.nodes.some((node) => node.state === 'solution'))
  assert.ok(searchTree.nodes.filter((node) => node.state === 'solution').every((node) => node.id))
  assertValidKakuroSolution(kakuroPuzzles.easy, result.solution)
})

test('Basic, MRV, and MRV+FC benchmarks return fresh nonnegative statistics', () => {
  const modes = [
    { heuristic: 'basic', forwardChecking: false },
    { heuristic: 'mrv', forwardChecking: false },
    { heuristic: 'mrv', forwardChecking: true },
  ]
  for (const mode of modes) {
    const first = solveKakuro({ puzzle: kakuroPuzzles.easy, ...mode })
    const expected = { ...first.solution }
    first.solution.X1 = 99
    const second = solveKakuro({ puzzle: kakuroPuzzles.easy, ...mode })
    assert.equal(second.solved, true)
    assert.deepEqual(second.solution, expected)
    for (const value of [
      second.statistics.cellsAssigned,
      second.statistics.digitsTested,
      second.statistics.digitsPruned,
      second.statistics.conflicts,
      second.statistics.backtracks,
      second.statistics.constraintChecks,
      second.statistics.maxDepth,
      second.statistics.elapsedMs,
    ]) {
      assert.equal(typeof value, 'number')
      assert.ok(value >= 0)
    }
  }
})