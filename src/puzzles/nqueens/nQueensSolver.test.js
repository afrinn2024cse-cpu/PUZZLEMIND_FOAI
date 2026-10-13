import assert from 'node:assert/strict'
import test from 'node:test'
import { generateNQueensSteps, summarizeNQueensEvents } from './nQueensSolver.js'
import { buildSearchTree, describeTimelineEvent } from '../../utils/solverSteps.js'

function isValidSolution(solution) {
  const size = solution.length
  if (solution.some((row) => !Number.isInteger(row) || row < 0 || row >= size)) return false
  for (let left = 0; left < size; left += 1) {
    for (let right = left + 1; right < size; right += 1) {
      if (solution[left] === solution[right]) return false
      if (Math.abs(solution[left] - solution[right]) === right - left) return false
    }
  }
  return true
}

test('N=4, 5, 8, and 12 produce valid solutions', () => {
  for (const size of [4, 5, 8, 12]) {
    const result = generateNQueensSteps(size)
    assert.equal(result.error, null, `N=${size} should be solvable`)
    assert.equal(result.solution.length, size)
    assert.ok(isValidSolution(result.solution), `N=${size} solution must satisfy row and diagonal constraints`)
    assert.equal(result.events.at(-1).type, 'solution-found')
    assert.equal(result.events.at(-1).solutionNumber, 1)
  }
})

test('N=2 and N=3 produce real no-solution results without throwing', () => {
  for (const size of [2, 3]) {
    const result = generateNQueensSteps(size)
    assert.equal(result.solution, null)
    assert.equal(result.error, `No solution exists for N=${size}.`)
    assert.equal(result.events.at(-1).type, 'no-solution')
    assert.ok(result.statistics.positionsRejected > 0)
  }
})

test('events report checks, rejection reasons, placement, backtracking, and depth', () => {
  const result = generateNQueensSteps(4)
  const types = new Set(result.events.map((event) => event.type))
  for (const type of [
    'select-variable',
    'try-value',
    'check-constraint',
    'place-queen',
    'reject-value',
    'conflict',
    'backtrack',
    'remove-queen',
    'solution-found',
  ]) assert.ok(types.has(type), `expected ${type} event`)

  const diagonalRejection = result.events.find(
    (event) => event.type === 'reject-value' && event.reason === 'diagonal conflict',
  )
  assert.ok(diagonalRejection?.conflictingQueen)
  assert.ok(result.statistics.backtracks > 0)
  assert.ok(result.statistics.maximumDepth >= 4)
  const summary = summarizeNQueensEvents(result.events)
  for (const key of [
    'positionsTested',
    'queensPlaced',
    'positionsRejected',
    'conflicts',
    'backtracks',
    'nodesExplored',
    'maximumDepth',
  ]) assert.equal(summary[key], result.statistics[key], key)
  assert.equal(summary.elapsedMs, 0)
  assert.equal(result.statistics.eventCount, result.events.length)
})

test('Find Another Solution continues search to a distinct real solution', () => {
  const first = generateNQueensSteps(4)
  const second = generateNQueensSteps(4, { solutionOffset: first.solutionsFound })
  assert.equal(second.error, null)
  assert.equal(second.solutionsFound, 2)
  assert.ok(isValidSolution(second.solution))
  assert.notDeepEqual(second.solution, first.solution)
  assert.ok(second.events.some((event) => event.type === 'solution-skipped' && event.solutionNumber === 1))
})

test('size limits and event statistics are derived from executed operations', () => {
  const invalid = generateNQueensSteps(13)
  assert.match(invalid.error, /from 1 to 12/)

  const result = generateNQueensSteps(5)
  assert.equal(result.statistics.eventCount, result.events.length)
  assert.equal(result.statistics.positionsTested, result.events.filter((event) => event.type === 'try-value').length)
  assert.equal(result.statistics.queensPlaced, result.events.filter((event) => event.type === 'place-queen').length)
  assert.equal(result.statistics.positionsRejected, result.events.filter((event) => event.type === 'reject-value').length)
})

test('shared timeline and bounded search tree reflect actual N-Queens events', () => {
  const result = generateNQueensSteps(4)
  const tree = buildSearchTree(result.events, 1000)
  const limitedTree = buildSearchTree(result.events, 12)
  const timeline = result.events.map(describeTimelineEvent)

  assert.ok(timeline.some((description) => description === 'Select column 1'))
  assert.ok(timeline.some((description) => description.includes('Reject C')))
  assert.ok(timeline.some((description) => description === 'Solution found'))
  assert.ok(tree.nodes.some((node) => node.state === 'solution'))
  assert.ok(tree.nodes.some((node) => node.state === 'backtracked'))
  assert.ok(tree.nodes.some((node) => node.state === 'pruned'))
  assert.ok(tree.nodes.every((node) =>
    node.id === 'root' || tree.nodes.some((parent) => parent.id === node.parentId),
  ))
  assert.equal(limitedTree.nodes.length, 12)
  assert.ok(limitedTree.truncatedCount > 0)
})