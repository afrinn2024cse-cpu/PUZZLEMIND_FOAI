import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSearchTree, describeTimelineEvent } from '../../utils/solverSteps.js'
import {
  COMPLETE_FOUR_GRAPH,
  DEFAULT_MAP_GRAPH,
  generateMapColoringSteps,
  getMapEdges,
  MAP_COLORS,
  solveMapColoring,
  summarizeMapColoringEvents,
} from './mapColoringSolver.js'

function projectAssignments(events) {
  const assignments = new Map()
  for (const event of events) {
    if (event.type === 'assign-color') assignments.set(event.variable, event.color)
    if (event.type === 'remove-assignment') assignments.delete(event.variable)
  }
  return Object.fromEntries(assignments)
}

function assertValidColoring(graph, solution) {
  for (const [region, neighbors] of Object.entries(graph)) {
    assert.ok(solution[region], `Region ${region} must be colored`)
    for (const neighbor of neighbors) {
      assert.notEqual(solution[region], solution[neighbor], `${region} and ${neighbor} share a color`)
    }
  }
}

const threeColors = MAP_COLORS.slice(0, 3).map(({ name }) => name)
const fourColors = MAP_COLORS.map(({ name }) => name)

test('the predefined seven-region map is solved with both palettes', () => {
  for (const palette of [threeColors, fourColors]) {
    const result = generateMapColoringSteps(DEFAULT_MAP_GRAPH, palette)
    assert.equal(result.error, null)
    assert.deepEqual(Object.keys(result.solution).sort(), Object.keys(DEFAULT_MAP_GRAPH).sort())
    assertValidColoring(DEFAULT_MAP_GRAPH, result.solution)
    assert.ok(Object.values(result.solution).every((color) => palette.includes(color)))
  }
  assert.equal(getMapEdges(DEFAULT_MAP_GRAPH).length, 11)
})

test('K4 is unsatisfiable with three colors and solvable with four', () => {
  const impossible = generateMapColoringSteps(COMPLETE_FOUR_GRAPH, threeColors)
  assert.equal(impossible.solution, null)
  assert.equal(impossible.error, 'No valid coloring exists with 3 colors.')
  assert.equal(impossible.events.at(-1).type, 'no-solution')

  const possible = generateMapColoringSteps(COMPLETE_FOUR_GRAPH, fourColors)
  assert.equal(possible.error, null)
  assertValidColoring(COMPLETE_FOUR_GRAPH, possible.solution)
  assert.equal(new Set(Object.values(possible.solution)).size, 4)
})

test('MRV chooses a smallest domain and degree-breaks the initial tie at Region C', () => {
  const result = generateMapColoringSteps(DEFAULT_MAP_GRAPH, threeColors, { method: 'mrv' })
  const selection = result.events.find((event) => event.type === 'select-variable')
  assert.equal(selection.variable, 'C')
  assert.equal(selection.domain.length, 3)
  assert.equal(selection.degreeTieBreakApplied, true)
  assert.equal(selection.degree, 4)
  assert.equal(result.events.some((event) => event.type === 'forward-check'), false)
})

test('forward checking prunes actual neighbor domains and detects K4 dead ends', () => {
  const mapResult = generateMapColoringSteps(DEFAULT_MAP_GRAPH, threeColors)
  const prune = mapResult.events.find((event) => event.type === 'prune-color')
  assert.ok(prune)
  assert.equal(prune.domain.length, prune.beforeDomain.length - 1)
  assert.ok(DEFAULT_MAP_GRAPH[prune.causedBy].includes(prune.variable))
  assert.ok(mapResult.statistics.colorsPruned > 0)

  const k4 = generateMapColoringSteps(COMPLETE_FOUR_GRAPH, threeColors)
  assert.ok(k4.events.some((event) => event.type === 'conflict' && event.reason.includes('no remaining legal colors')))
  assert.ok(k4.events.some((event) => event.type === 'backtrack'))
})

test('basic backtracking checks conflicts while MRV modes use their selected heuristics', () => {
  const basic = generateMapColoringSteps(COMPLETE_FOUR_GRAPH, threeColors, { method: 'basic' })
  const mrv = generateMapColoringSteps(COMPLETE_FOUR_GRAPH, threeColors, { method: 'mrv' })
  const forward = generateMapColoringSteps(COMPLETE_FOUR_GRAPH, threeColors, { method: 'mrv-forward' })

  assert.equal(basic.events.find((event) => event.type === 'select-variable').reason, 'first-unassigned')
  assert.ok(basic.events.some((event) => event.type === 'reject-color'))
  assert.ok(basic.statistics.constraintChecks > 0)
  assert.ok(mrv.statistics.nodesExplored > 0)
  assert.ok(forward.statistics.colorsPruned > 0)
  assert.ok(basic.statistics.colorsTested > 0)
})

test('events drive map timeline, search tree, and event-derived statistics', () => {
  const result = generateMapColoringSteps(COMPLETE_FOUR_GRAPH, fourColors)
  const timeline = result.events.map(describeTimelineEvent)
  const tree = buildSearchTree(result.events, 1000)
    const limited = buildSearchTree(result.events, 3)
  const summary = summarizeMapColoringEvents(result.events)

  assert.ok(timeline.some((event) => event.includes('Select Region')))
  assert.ok(timeline.some((event) => event.includes('Prune')))
  assert.ok(tree.nodes.some((node) => node.state === 'solution'))
  assert.ok(limited.truncatedCount > 0)
    assert.equal(summary.regionsAssigned, result.events.filter((event) => event.type === 'assign-color').length)
    assert.equal(summary.colorsTested, result.events.filter((event) => event.type === 'try-color').length)
    assert.equal(summary.colorsPruned, result.events.filter((event) => event.type === 'prune-color').length)
})

  test('step prefixes project only assignments that have actually occurred', () => {
    const result = generateMapColoringSteps(DEFAULT_MAP_GRAPH, threeColors)
    const assignIndex = result.events.findIndex((event) => event.type === 'assign-color')
    const removalIndex = result.events.findIndex((event) => event.type === 'remove-assignment')

    assert.deepEqual(projectAssignments(result.events.slice(0, assignIndex)), {})
    const afterAssignment = projectAssignments(result.events.slice(0, assignIndex + 1))
    const assignment = result.events[assignIndex]
    assert.equal(afterAssignment[assignment.variable], assignment.color)

    if (removalIndex >= 0) {
      const removed = result.events[removalIndex]
      const afterRemoval = projectAssignments(result.events.slice(0, removalIndex + 1))
      assert.equal(Object.hasOwn(afterRemoval, removed.variable), false)
    }
  })

  test('counter-only comparison runs preserve actual solver statistics', () => {
    const captured = generateMapColoringSteps(DEFAULT_MAP_GRAPH, threeColors, { method: 'mrv-forward' })
    const counterOnly = generateMapColoringSteps(DEFAULT_MAP_GRAPH, threeColors, {
      method: 'mrv-forward',
      captureEvents: false,
    })

    assert.deepEqual(counterOnly.events, [])
    assert.deepEqual(counterOnly.statistics, captured.statistics)
  })

  test('pure benchmark solver colors the seven-region map with three and four colors', () => {
    for (const colors of [threeColors, fourColors]) {
      const result = solveMapColoring({ graph: DEFAULT_MAP_GRAPH, colors, heuristic: 'mrv' })
      assert.equal(result.solved, true)
      assertValidColoring(DEFAULT_MAP_GRAPH, result.assignment)
      assert.ok(Object.values(result.assignment).every((color) => colors.includes(color)))
    }
  })

  test('pure benchmark solver terminates on K4 with three and four colors', () => {
    const impossible = solveMapColoring({
      graph: COMPLETE_FOUR_GRAPH,
      colors: threeColors,
      heuristic: 'mrv',
      forwardChecking: true,
    })
    const possible = solveMapColoring({
      graph: COMPLETE_FOUR_GRAPH,
      colors: fourColors,
      heuristic: 'mrv',
      forwardChecking: true,
    })

    assert.equal(impossible.solved, false)
    assert.equal(impossible.assignment, null)
    assert.equal(possible.solved, true)
    assertValidColoring(COMPLETE_FOUR_GRAPH, possible.assignment)
  })

  test('pure benchmark provides independent Basic, MRV, and forward-checking runs', () => {
    const basic = solveMapColoring({ graph: DEFAULT_MAP_GRAPH, colors: threeColors, heuristic: 'basic' })
    const mrv = solveMapColoring({ graph: DEFAULT_MAP_GRAPH, colors: threeColors, heuristic: 'mrv' })
    const forward = solveMapColoring({
      graph: DEFAULT_MAP_GRAPH,
      colors: threeColors,
      heuristic: 'mrv',
      forwardChecking: true,
    })

    assert.equal(basic.solved, true)
    assert.equal(mrv.solved, true)
    assert.equal(forward.solved, true)
    assert.ok(basic.colorsTested > 0)
    assert.ok(mrv.colorsTested > 0)
    assert.ok(forward.colorsPruned > 0)
    assert.ok(basic.nodes > 0 && mrv.nodes > 0 && forward.nodes > 0)
  })

  test('MRV selects from legal domains and degree-breaks ties in the benchmark', () => {
    const result = solveMapColoring({ graph: DEFAULT_MAP_GRAPH, colors: threeColors, heuristic: 'mrv' })
    assert.deepEqual(result.selectionTrace.slice(0, 2).map(({ variable }) => variable), ['C', 'D'])
    assert.equal(result.selectionTrace[0].domain.length, 3)
    assert.equal(result.selectionTrace[0].unassignedDegree, 4)

    const k4 = solveMapColoring({
      graph: COMPLETE_FOUR_GRAPH,
      colors: threeColors,
      heuristic: 'mrv',
      forwardChecking: true,
    })
    assert.ok(k4.colorsPruned > 0)
    assert.ok(k4.conflicts > 0)
    assert.ok(k4.backtracks > 0)
  })

  test('benchmark runs start with fresh assignments and nonnegative numeric statistics', () => {
    const first = solveMapColoring({ graph: DEFAULT_MAP_GRAPH, colors: threeColors, heuristic: 'basic' })
    const expected = { ...first.assignment }
    first.assignment.A = 'mutated outside the solver'
    const second = solveMapColoring({ graph: DEFAULT_MAP_GRAPH, colors: threeColors, heuristic: 'basic' })

    assert.deepEqual(second.assignment, expected)
    assert.notEqual(second.assignment, first.assignment)
    for (const value of [
      second.nodes,
      second.colorsTested,
      second.colorsPruned,
      second.conflicts,
      second.backtracks,
      second.constraintChecks,
      second.maxDepth,
      second.elapsedMs,
    ]) {
      assert.equal(typeof value, 'number')
      assert.ok(value >= 0)
    }
  })