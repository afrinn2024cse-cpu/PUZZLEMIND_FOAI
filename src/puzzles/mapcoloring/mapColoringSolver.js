export const DEFAULT_MAP_GRAPH = {
  A: ['B', 'C'],
  B: ['A', 'C', 'D'],
  C: ['A', 'B', 'D', 'E'],
  D: ['B', 'C', 'E', 'F'],
  E: ['C', 'D', 'F', 'G'],
  F: ['D', 'E', 'G'],
  G: ['E', 'F'],
}

export const COMPLETE_FOUR_GRAPH = {
  A: ['B', 'C', 'D'],
  B: ['A', 'C', 'D'],
  C: ['A', 'B', 'D'],
  D: ['A', 'B', 'C'],
}

export const MAP_COLORS = [
  { name: 'Red', value: '#cf6551' },
  { name: 'Blue', value: '#4d83ae' },
  { name: 'Green', value: '#5e9970' },
  { name: 'Yellow', value: '#d6ad4f' },
]

export const MAP_SOLVER_METHODS = {
  basic: {
    label: 'Basic Backtracking',
    variableSelection: 'first-unassigned',
    forwardChecking: false,
  },
  mrv: {
    label: 'MRV',
    variableSelection: 'mrv',
    degreeTieBreak: true,
    forwardChecking: false,
  },
  'mrv-forward': {
    label: 'MRV + Forward Checking',
    variableSelection: 'mrv',
    degreeTieBreak: true,
    forwardChecking: true,
  },
}

export function normalizeMapGraph(inputGraph) {
  if (!inputGraph || typeof inputGraph !== 'object' || Array.isArray(inputGraph)) {
    throw new Error('A map graph must be an object of region neighbors.')
  }
  const graph = Object.fromEntries(
    Object.entries(inputGraph).map(([variable, neighbors]) => {
      if (!Array.isArray(neighbors)) throw new Error(`Neighbors for Region ${variable} must be a list.`)
      return [variable, [...new Set(neighbors)]]
    }),
  )

  for (const [variable, neighbors] of Object.entries(graph)) {
    for (const neighbor of neighbors) {
      if (!Object.hasOwn(graph, neighbor)) throw new Error(`Region ${neighbor} does not exist in the graph.`)
      if (neighbor === variable) throw new Error(`Region ${variable} cannot neighbor itself.`)
      if (!graph[neighbor].includes(variable)) graph[neighbor].push(variable)
    }
  }
  return graph
}

export function getMapEdges(inputGraph) {
  const graph = normalizeMapGraph(inputGraph)
  const edges = []
  for (const [region, neighbors] of Object.entries(graph)) {
    for (const neighbor of neighbors) {
      if (region < neighbor) edges.push([region, neighbor])
    }
  }
  return edges
}

export function summarizeMapColoringEvents(events, elapsedMs = 0) {
  return {
    regionsAssigned: events.filter((event) => event.type === 'assign-color').length,
    colorsTested: events.filter((event) => event.type === 'try-color').length,
    colorsPruned: events.filter((event) => event.type === 'prune-color').length,
    constraintChecks: events.filter((event) => event.type === 'constraint-check').length,
    conflicts: events.filter((event) => event.type === 'conflict').length,
    backtracks: events.filter((event) => event.type === 'backtrack').length,
    nodesExplored: events.filter((event) => event.type === 'node-explored').length,
    maximumDepth: events.reduce((maximum, event) => Math.max(maximum, event.depth ?? 0), 0),
    elapsedMs,
  }
}

export function solveMapColoring({
  graph: inputGraph,
  colors: inputColors,
  heuristic = 'basic',
  forwardChecking = false,
}) {
  const startedAt = performance.now()
  const statistics = {
    nodes: 0,
    colorsTested: 0,
    colorsPruned: 0,
    conflicts: 0,
    backtracks: 0,
    constraintChecks: 0,
    maxDepth: 0,
  }
  const finish = (solved, assignment, error, selectionTrace) => ({
    solved,
    assignment,
    nodes: statistics.nodes,
    colorsTested: statistics.colorsTested,
    colorsPruned: statistics.colorsPruned,
    conflicts: statistics.conflicts,
    backtracks: statistics.backtracks,
    constraintChecks: statistics.constraintChecks,
    maxDepth: statistics.maxDepth,
    elapsedMs: performance.now() - startedAt,
    selectionTrace,
    error,
  })

  if (!['basic', 'mrv'].includes(heuristic)) {
    return finish(false, null, `Unknown variable-selection heuristic: ${heuristic}.`, [])
  }

  let graph
  try {
    graph = normalizeMapGraph(inputGraph)
  } catch (error) {
    return finish(false, null, error.message, [])
  }
  const variables = Object.keys(graph)
  const colors = [...new Set(inputColors ?? [])]
  const assignment = Object.create(null)
  const selectionTrace = []

  if (variables.length === 0) return finish(false, null, 'The map must contain at least one region.', selectionTrace)
  if (colors.length === 0) return finish(false, null, 'Choose at least one color for the map.', selectionTrace)

  const initialDomains = Object.fromEntries(variables.map((variable) => [variable, [...colors]]))
  const getDomain = (variable, domains) => forwardChecking
    ? [...domains[variable]]
    : colors.filter((color) => graph[variable].every((neighbor) => assignment[neighbor] !== color))

  function search(depth, domains) {
    statistics.nodes += 1
    statistics.maxDepth = Math.max(statistics.maxDepth, depth)
    if (Object.keys(assignment).length === variables.length) return true

    const unassigned = variables.filter((variable) => !Object.hasOwn(assignment, variable))
    const options = unassigned.map((variable) => ({
      variable,
      domain: getDomain(variable, domains),
      degree: graph[variable].filter((neighbor) => !Object.hasOwn(assignment, neighbor)).length,
    }))

    if (heuristic === 'mrv') {
      options.sort((left, right) =>
        left.domain.length - right.domain.length
          || right.degree - left.degree
          || variables.indexOf(left.variable) - variables.indexOf(right.variable),
      )
    }
    const selected = options[0]
    selectionTrace.push({
      variable: selected.variable,
      domain: [...selected.domain],
      unassignedDegree: selected.degree,
    })

    if (selected.domain.length === 0) {
      statistics.conflicts += 1
      return false
    }

    const candidates = heuristic === 'basic' ? colors : selected.domain
    for (const color of candidates) {
      statistics.colorsTested += 1
      let hasConflict = false
      for (const neighbor of graph[selected.variable]) {
        if (!Object.hasOwn(assignment, neighbor)) continue
        statistics.constraintChecks += 1
        if (assignment[neighbor] === color) hasConflict = true
      }

      if (hasConflict) {
        statistics.conflicts += 1
        continue
      }

      assignment[selected.variable] = color
      const nextDomains = Object.fromEntries(
        variables.map((variable) => [variable, [...domains[variable]]]),
      )
      let deadEnd = false

      if (forwardChecking) {
        for (const neighbor of graph[selected.variable]) {
          if (Object.hasOwn(assignment, neighbor) || !nextDomains[neighbor].includes(color)) continue
          nextDomains[neighbor] = nextDomains[neighbor].filter((availableColor) => availableColor !== color)
          statistics.colorsPruned += 1
          if (nextDomains[neighbor].length === 0) deadEnd = true
        }
      }

      if (deadEnd) statistics.conflicts += 1
      if (!deadEnd && search(depth + 1, nextDomains)) return true

      statistics.backtracks += 1
      delete assignment[selected.variable]
    }

    return false
  }

  const solved = search(0, initialDomains)
  return finish(
    solved,
    solved ? { ...assignment } : null,
    solved ? null : `No valid coloring exists with ${colors.length} colors.`,
    selectionTrace,
  )
}

function createEvent(type, properties = {}) {
  return { type, ...properties }
}

export function generateMapColoringSteps(inputGraph, palette, options = {}) {
  const method = MAP_SOLVER_METHODS[options.method ?? 'mrv-forward']
  if (!method) throw new Error(`Unknown map coloring solver method: ${options.method}`)

  const graph = normalizeMapGraph(inputGraph)
  const variables = Object.keys(graph)
  const colors = [...new Set(palette)]
  const captureEvents = options.captureEvents !== false
  const events = []
  const statistics = {
    regionsAssigned: 0,
    colorsTested: 0,
    colorsPruned: 0,
    constraintChecks: 0,
    conflicts: 0,
    backtracks: 0,
    nodesExplored: 0,
    maximumDepth: 0,
    eventCount: 0,
  }
  const emit = (event) => {
    statistics.eventCount += 1
    if (event.type === 'assign-color') statistics.regionsAssigned += 1
    if (event.type === 'try-color') statistics.colorsTested += 1
    if (event.type === 'prune-color') statistics.colorsPruned += 1
    if (event.type === 'constraint-check') statistics.constraintChecks += 1
    if (event.type === 'conflict') statistics.conflicts += 1
    if (event.type === 'backtrack') statistics.backtracks += 1
    if (event.type === 'node-explored') statistics.nodesExplored += 1
    if (Number.isInteger(event.depth)) statistics.maximumDepth = Math.max(statistics.maximumDepth, event.depth)
    if (captureEvents) events.push(event)
  }
  const result = (solution, error) => ({ events, solution, error, statistics: { ...statistics } })

  if (colors.length < 1) {
    const error = 'Choose at least one color for the map.'
    emit(createEvent('invalid-puzzle', { reason: error }))
    return result(null, error)
  }
  if (variables.length === 0) {
    const error = 'The map must contain at least one region.'
    emit(createEvent('invalid-puzzle', { reason: error }))
    return result(null, error)
  }

  const assignments = Object.create(null)
  const initialDomains = Object.fromEntries(variables.map((variable) => [variable, [...colors]]))
  emit(createEvent('initial-domain-summary', {
    variables: [...variables],
    colors: [...colors],
    domainValues: variables.length * colors.length,
  }))

  let nextDecisionId = 0
  let nextTerminalId = 0
  let solution = null

  const getLegalDomain = (variable, currentDomains) => {
    if (method.forwardChecking) return [...currentDomains[variable]]
    const neighborColors = new Set(graph[variable].map((neighbor) => assignments[neighbor]).filter(Boolean))
    return colors.filter((color) => !neighborColors.has(color))
  }

  function search(depth, parentNodeId = 'root', currentDomains = initialDomains) {
    emit(createEvent('node-explored', { depth, parentNodeId }))
    if (Object.keys(assignments).length === variables.length) {
      solution = { ...assignments }
      emit(createEvent('solution-found', {
        solution,
        regions: variables.length,
        colorCount: colors.length,
        treeNodeId: `solution-${++nextTerminalId}`,
        parentNodeId,
        depth,
      }))
      return true
    }

    const unassigned = variables.filter((variable) => !Object.hasOwn(assignments, variable))
    const domainOptions = unassigned.map((variable) => ({
      variable,
      domain: getLegalDomain(variable, currentDomains),
      degree: graph[variable].filter((neighbor) => !Object.hasOwn(assignments, neighbor)).length,
    }))
    if (method.variableSelection === 'mrv') {
      domainOptions.sort((left, right) =>
        left.domain.length - right.domain.length
          || (method.degreeTieBreak ? right.degree - left.degree : 0)
          || variables.indexOf(left.variable) - variables.indexOf(right.variable),
      )
    }
    const selected = method.variableSelection === 'mrv' ? domainOptions[0] : domainOptions[0]
    const selectedDomain = selected.domain
    const tiedForMinimum = domainOptions.filter(({ domain }) => domain.length === selectedDomain.length)
    const degreeTieBreakApplied = method.variableSelection === 'mrv'
      && method.degreeTieBreak
      && tiedForMinimum.length > 1

    emit(createEvent('select-variable', {
      variable: selected.variable,
      domain: [...selectedDomain],
      domains: domainOptions.map(({ variable, domain, degree }) => ({ variable, domain, degree })),
      reason: method.variableSelection === 'mrv' ? 'MRV' : 'first-unassigned',
      degree: selected.degree,
      degreeTieBreakApplied,
      depth,
      parentNodeId,
    }))
    emit(createEvent('calculate-domain', {
      variable: selected.variable,
      beforeDomain: [...colors],
      domain: [...selectedDomain],
      prunedColors: colors.filter((color) => !selectedDomain.includes(color)).map((color) => ({
        color,
        neighbor: graph[selected.variable].find((neighbor) => assignments[neighbor] === color),
      })),
      depth,
    }))

    if (selectedDomain.length === 0) {
      emit(createEvent('conflict', {
        variable: selected.variable,
        reason: `Region ${selected.variable} has no remaining legal colors.`,
        treeNodeId: `conflict-${++nextTerminalId}`,
        parentNodeId,
        depth,
      }))
      return false
    }

    const candidateColors = method.variableSelection === 'first-unassigned'
      ? colors
      : selectedDomain
    for (const color of candidateColors) {
      const nodeId = `decision-${++nextDecisionId}`
      emit(createEvent('try-color', {
        variable: selected.variable,
        color,
        domain: [...selectedDomain],
        depth,
        nodeId,
        parentNodeId,
      }))

      const assignedNeighbors = graph[selected.variable]
        .filter((neighbor) => Object.hasOwn(assignments, neighbor))
      const conflicts = []
      for (const neighbor of assignedNeighbors) {
        const valid = assignments[neighbor] !== color
        emit(createEvent('constraint-check', {
          variable: selected.variable,
          color,
          neighbor,
          neighborColor: assignments[neighbor],
          valid,
          depth,
          nodeId,
        }))
        if (!valid) conflicts.push(neighbor)
      }

      if (conflicts.length > 0) {
        const conflictingNeighbor = conflicts[0]
        const reason = `Neighbor ${conflictingNeighbor} already uses ${color}.`
        emit(createEvent('reject-color', {
          variable: selected.variable,
          color,
          reason,
          conflictingNeighbor,
          nodeId,
          parentNodeId,
          depth,
        }))
        emit(createEvent('conflict', {
          variable: selected.variable,
          color,
          reason,
          conflictingNeighbor,
          nodeId,
          parentNodeId,
          depth,
        }))
        continue
      }

      assignments[selected.variable] = color
      emit(createEvent('assign-color', {
        variable: selected.variable,
        color,
        nodeId,
        parentNodeId,
        depth,
      }))

      const nextDomains = Object.fromEntries(
        variables.map((variable) => [variable, [...currentDomains[variable]]]),
      )
      let emptyNeighbor = null
      if (method.forwardChecking) {
        emit(createEvent('forward-check', {
          variable: selected.variable,
          color,
          neighbors: [...graph[selected.variable]],
          nodeId,
          parentNodeId,
          depth,
        }))
        for (const neighbor of graph[selected.variable]) {
          if (Object.hasOwn(assignments, neighbor) || !nextDomains[neighbor].includes(color)) continue
          const beforeDomain = [...nextDomains[neighbor]]
          nextDomains[neighbor] = nextDomains[neighbor].filter((availableColor) => availableColor !== color)
          emit(createEvent('prune-color', {
            variable: neighbor,
            color,
            removedFrom: neighbor,
            causedBy: selected.variable,
            beforeDomain,
            domain: [...nextDomains[neighbor]],
            reason: `Neighbor ${selected.variable} is assigned ${color}.`,
            nodeId,
            parentNodeId,
            depth,
          }))
          if (nextDomains[neighbor].length === 0) emptyNeighbor = neighbor
        }
      }

      if (emptyNeighbor) {
        const reason = `Region ${emptyNeighbor} has no remaining legal colors.`
        emit(createEvent('conflict', {
          variable: emptyNeighbor,
          reason,
          nodeId,
          parentNodeId,
          depth: depth + 1,
        }))
      } else if (search(depth + 1, nodeId, nextDomains)) {
        return true
      }

      emit(createEvent('backtrack', {
        variable: selected.variable,
        color,
        nodeId,
        parentNodeId,
        depth,
        reason: emptyNeighbor
          ? `Region ${emptyNeighbor} has no remaining legal colors.`
          : 'The remaining assignments have no solution.',
      }))
      delete assignments[selected.variable]
      emit(createEvent('remove-assignment', {
        variable: selected.variable,
        color,
        nodeId,
        parentNodeId,
        depth,
      }))
    }

    emit(createEvent('conflict', {
      variable: selected.variable,
      reason: `Region ${selected.variable} has no remaining legal colors.`,
      treeNodeId: `conflict-${++nextTerminalId}`,
      parentNodeId,
      depth,
    }))
    return false
  }

  if (!search(0)) {
    const error = `No valid coloring exists with ${colors.length} colors.`
    emit(createEvent('no-solution', { reason: error, colorCount: colors.length }))
    return result(null, error)
  }

  return result(solution, null)
}