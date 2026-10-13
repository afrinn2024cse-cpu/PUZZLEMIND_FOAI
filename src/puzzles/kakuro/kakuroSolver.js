const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export const KAKURO_METHODS = {
  basic: { label: 'Basic Backtracking', heuristic: 'basic', forwardChecking: false },
  mrv: { label: 'MRV', heuristic: 'mrv', forwardChecking: false },
  'mrv-forward': { label: 'MRV + Forward Checking', heuristic: 'mrv', forwardChecking: true },
}

export function parseKakuroPuzzle(puzzle) {
  if (!puzzle || !Array.isArray(puzzle.grid) || puzzle.grid.length === 0) {
    throw new Error('A Kakuro puzzle must contain a non-empty grid.')
  }
  const width = puzzle.grid[0].length
  if (!width || puzzle.grid.some((row) => !Array.isArray(row) || row.length !== width)) {
    throw new Error('Kakuro puzzle rows must have the same width.')
  }

  const variables = []
  const cells = Object.create(null)
  const coordinates = new Map()
  for (let row = 0; row < puzzle.grid.length; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const cell = puzzle.grid[row][column]
      if (!cell || !['black', 'white'].includes(cell.type)) {
        throw new Error(`Invalid Kakuro cell at row ${row + 1}, column ${column + 1}.`)
      }
      if (cell.type === 'white') {
        if (typeof cell.id !== 'string' || !cell.id || Object.hasOwn(cells, cell.id)) {
          throw new Error('Every white cell needs a unique variable ID.')
        }
        const variable = { id: cell.id, row, column }
        variables.push(variable)
        cells[cell.id] = variable
        coordinates.set(`${row}:${column}`, variable)
      }
      if (cell.type === 'black') {
        for (const direction of ['across', 'down']) {
          const clue = cell[direction]
          if (clue !== undefined && (!Number.isInteger(clue) || clue < 1 || clue > 45)) {
            throw new Error(`${direction} clues must be integer sums from 1 to 45.`)
          }
        }
      }
    }
  }
  if (variables.length === 0) throw new Error('A Kakuro puzzle needs at least one white cell.')

  const runs = []
  for (let row = 0; row < puzzle.grid.length; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const clueCell = puzzle.grid[row][column]
      if (clueCell.type !== 'black') continue
      for (const direction of ['across', 'down']) {
        const clue = clueCell[direction]
        if (clue === undefined) continue
        const rowStep = direction === 'down' ? 1 : 0
        const columnStep = direction === 'across' ? 1 : 0
        const runCells = []
        let runRow = row + rowStep
        let runColumn = column + columnStep
        while (puzzle.grid[runRow]?.[runColumn]?.type === 'white') {
          runCells.push(puzzle.grid[runRow][runColumn].id)
          runRow += rowStep
          runColumn += columnStep
        }
        if (runCells.length < 2 || runCells.length > 9) {
          throw new Error(`${direction} clue ${clue} at row ${row + 1}, column ${column + 1} must cover 2 to 9 cells.`)
        }
        runs.push({
          id: `${direction}-${row}-${column}`,
          direction,
          clue,
          clueRow: row,
          clueColumn: column,
          cells: runCells,
        })
      }
    }
  }

  const runsByVariable = Object.fromEntries(variables.map(({ id }) => [id, []]))
  for (const run of runs) {
    for (const variable of run.cells) runsByVariable[variable].push(run)
  }
  for (const { id } of variables) {
    if (runsByVariable[id].length === 0) throw new Error(`White cell ${id} must belong to an across or down run.`)
  }

  return { width, height: puzzle.grid.length, grid: puzzle.grid, variables, cells, coordinates, runs, runsByVariable }
}

function canMakeSum(availableDigits, count, target) {
  if (count === 0) return target === 0
  if (availableDigits.length < count || target <= 0) return false
  const smallest = availableDigits.slice(0, count).reduce((sum, digit) => sum + digit, 0)
  const largest = availableDigits.slice(-count).reduce((sum, digit) => sum + digit, 0)
  if (target < smallest || target > largest) return false

  function choose(start, remaining, sum) {
    if (remaining === 0) return sum === target
    if (availableDigits.length - start < remaining) return false
    for (let index = start; index <= availableDigits.length - remaining; index += 1) {
      const digit = availableDigits[index]
      if (sum + digit > target) break
      if (choose(index + 1, remaining - 1, sum + digit)) return true
    }
    return false
  }
  return choose(0, count, 0)
}

function evaluateDigit(parsed, assignments, variable, digit, record) {
  for (const run of parsed.runsByVariable[variable]) {
    const assigned = run.cells
      .filter((cell) => cell !== variable && Object.hasOwn(assignments, cell))
      .map((cell) => ({ variable: cell, digit: assignments[cell] }))
    const duplicate = assigned.find(({ digit: assignedDigit }) => assignedDigit === digit)
    const duplicateValid = !duplicate
    record('duplicate-check', {
      variable,
      digit,
      runId: run.id,
      runCells: [...run.cells],
      direction: run.direction,
      remainingCells: run.cells.filter((cell) => cell !== variable && !Object.hasOwn(assignments, cell)).length,
      valid: duplicateValid,
      duplicateDigit: duplicate?.digit ?? null,
      conflictingVariable: duplicate?.variable ?? null,
      assigned,
    })
    if (!duplicateValid) {
      return {
        valid: false,
        reason: `Digit ${digit} duplicates a digit already used in the ${run.direction} run.`,
        run,
        conflictingVariable: duplicate.variable,
      }
    }

    const currentSum = assigned.reduce((sum, entry) => sum + entry.digit, digit)
    const remainingCells = run.cells.filter((cell) => cell !== variable && !Object.hasOwn(assignments, cell))
    const remainingSum = run.clue - currentSum
    const usedDigits = new Set([...assigned.map((entry) => entry.digit), digit])
    const availableDigits = DIGITS.filter((candidate) => !usedDigits.has(candidate))
    const possible = canMakeSum(availableDigits, remainingCells.length, remainingSum)
    record('sum-check', {
      variable,
      digit,
      runId: run.id,
      runCells: [...run.cells],
      direction: run.direction,
      clue: run.clue,
      assigned,
      currentSum,
      remainingSum,
      remainingCells: remainingCells.length,
      remainingVariables: remainingCells,
      possible,
    })
    if (!possible) {
      return {
        valid: false,
        reason: `The remaining sum in the ${run.direction} run cannot be satisfied.`,
        run,
        remainingSum,
      }
    }
  }
  return { valid: true }
}

export function calculateKakuroDomain(puzzle, assignments = {}, variable) {
  const parsed = puzzle?.runsByVariable ? puzzle : parseKakuroPuzzle(puzzle)
  if (!parsed.runsByVariable[variable]) throw new Error(`Unknown Kakuro variable ${variable}.`)
  return DIGITS.filter((digit) => evaluateDigit(parsed, assignments, variable, digit, () => {}).valid)
}

export function getKakuroRunStates(puzzle, assignments = {}, domains = {}) {
  const parsed = puzzle?.runsByVariable ? puzzle : parseKakuroPuzzle(puzzle)
  return parsed.runs.map((run) => {
    const assigned = run.cells
      .filter((variable) => Object.hasOwn(assignments, variable))
      .map((variable) => ({ variable, digit: assignments[variable] }))
    const remainingVariables = run.cells.filter((variable) => !Object.hasOwn(assignments, variable))
    const currentSum = assigned.reduce((sum, entry) => sum + entry.digit, 0)
    const remainingSum = run.clue - currentSum
    const usedDigits = new Set(assigned.map((entry) => entry.digit))
    const choices = remainingVariables.map((variable) => (domains[variable] ?? DIGITS)
      .filter((digit) => !usedDigits.has(digit)))
    const combinations = []

    function collect(index, sum, chosen) {
      if (combinations.length >= 16) return
      if (index === choices.length) {
        if (sum === remainingSum) combinations.push([...chosen])
        return
      }
      for (const digit of choices[index]) {
        if (chosen.includes(digit)) continue
        const nextSum = sum + digit
        if (nextSum > remainingSum) continue
        chosen.push(digit)
        collect(index + 1, nextSum, chosen)
        chosen.pop()
      }
    }
    collect(0, 0, [])

    return {
      id: run.id,
      direction: run.direction,
      clue: run.clue,
      cells: [...run.cells],
      assigned,
      currentSum,
      remainingSum,
      remainingVariables,
      remainingCells: remainingVariables.length,
      possibleCombinations: combinations,
    }
  })
}

export function summarizeKakuroEvents(events, elapsedMs = 0) {
  return {
    cellsAssigned: events.filter((event) => event.type === 'assign-digit').length,
    digitsTested: events.filter((event) => event.type === 'try-digit').length,
    digitsPruned: events.filter((event) => event.type === 'prune-digit').length,
    constraintChecks: events.filter((event) => ['duplicate-check', 'sum-check'].includes(event.type)).length,
    sumChecks: events.filter((event) => event.type === 'sum-check').length,
    duplicateChecks: events.filter((event) => event.type === 'duplicate-check').length,
    conflicts: events.filter((event) => event.type === 'conflict').length,
    backtracks: events.filter((event) => event.type === 'backtrack').length,
    nodesExplored: events.filter((event) => event.type === 'node-explored').length,
    maximumDepth: events.reduce((maximum, event) => Math.max(maximum, event.depth ?? 0), 0),
    elapsedMs,
  }
}

export function solveKakuro({ puzzle, heuristic = 'mrv', forwardChecking = false, onEvent = null }) {
  const startedAt = performance.now()
  const parsed = parseKakuroPuzzle(puzzle)
  const assignments = Object.create(null)
  const statistics = {
    cellsAssigned: 0,
    digitsTested: 0,
    digitsPruned: 0,
    constraintChecks: 0,
    sumChecks: 0,
    duplicateChecks: 0,
    conflicts: 0,
    backtracks: 0,
    nodesExplored: 0,
    maxDepth: 0,
  }
  let activeDecisionNodeId = null
  const record = (type, properties = {}) => {
    if (type === 'assign-digit') statistics.cellsAssigned += 1
    if (type === 'try-digit') statistics.digitsTested += 1
    if (type === 'prune-digit') statistics.digitsPruned += 1
    if (type === 'sum-check') statistics.sumChecks += 1
    if (type === 'duplicate-check') statistics.duplicateChecks += 1
    if (type === 'sum-check' || type === 'duplicate-check') statistics.constraintChecks += 1
    if (type === 'conflict') statistics.conflicts += 1
    if (type === 'backtrack') statistics.backtracks += 1
    if (type === 'node-explored') statistics.nodesExplored += 1
    if (Number.isInteger(properties.depth)) statistics.maxDepth = Math.max(statistics.maxDepth, properties.depth)
    if (onEvent) onEvent({ type, ...(activeDecisionNodeId ? { nodeId: activeDecisionNodeId } : {}), ...properties })
  }

  const getDomain = (variable, parentDomain = DIGITS) => parentDomain
    .filter((digit) => evaluateDigit(parsed, assignments, variable, digit, record).valid)
  let solution = null
  let nextTerminalId = 0

  function search(depth, currentDomains = null, parentNodeId = 'root') {
    record('node-explored', { depth, parentNodeId })
    if (Object.keys(assignments).length === parsed.variables.length) {
      solution = { ...assignments }
      record('solution-found', {
        solution,
        treeNodeId: `kakuro-solution-${++nextTerminalId}`,
        depth,
        parentNodeId,
      })
      return true
    }

    const unassigned = parsed.variables.filter(({ id }) => !Object.hasOwn(assignments, id))
    const domainOptions = unassigned.map(({ id }) => ({
      variable: id,
      domain: currentDomains?.[id] ? getDomain(id, currentDomains[id]) : getDomain(id),
      degree: parsed.runsByVariable[id]
        .flatMap((run) => run.cells)
        .filter((candidate, index, cells) => candidate !== id && !Object.hasOwn(assignments, candidate) && cells.indexOf(candidate) === index).length,
    }))
    if (heuristic === 'mrv') {
      domainOptions.sort((left, right) =>
        left.domain.length - right.domain.length
          || right.degree - left.degree
          || parsed.variables.findIndex(({ id }) => id === left.variable)
            - parsed.variables.findIndex(({ id }) => id === right.variable),
      )
    }
    const selected = domainOptions[0]
    const tied = domainOptions.filter(({ domain }) => domain.length === selected.domain.length)
    const degreeTieBreakApplied = heuristic === 'mrv' && tied.length > 1
    record('select-cell', {
      variable: selected.variable,
      domain: [...selected.domain],
      domains: domainOptions.map(({ variable, domain, degree }) => ({ variable, domain: [...domain], degree })),
      degree: selected.degree,
      degreeTieBreakApplied,
      reason: heuristic === 'mrv' ? 'MRV' : 'first-unassigned',
      why: heuristic === 'mrv'
        ? `Fewest remaining digits (${selected.domain.length}); degree ${selected.degree} breaks ties.`
        : 'First unassigned cell in puzzle order.',
      depth,
      parentNodeId,
      domains: domainOptions.map(({ variable, domain, degree }) => ({ variable, domain: [...domain], degree })),
    })
    record('calculate-domain', {
      variable: selected.variable,
      domain: [...selected.domain],
      initialDomain: [...DIGITS],
      runs: parsed.runsByVariable[selected.variable].map((run) => ({ id: run.id, clue: run.clue, direction: run.direction, cells: [...run.cells] })),
      depth,
    })

    if (selected.domain.length === 0) {
      record('conflict', {
        variable: selected.variable,
        reason: 'No digit can satisfy the remaining run constraints.',
        treeNodeId: `kakuro-conflict-${++nextTerminalId}`,
        depth,
        parentNodeId,
      })
      return false
    }

    const candidates = heuristic === 'basic' ? DIGITS : selected.domain
    for (const digit of candidates) {
      const parentDecisionNodeId = activeDecisionNodeId
      const nodeId = `decision-${statistics.digitsTested + 1}`
      activeDecisionNodeId = nodeId
      record('try-digit', {
        variable: selected.variable,
        value: digit,
        domain: [...selected.domain],
        depth,
        nodeId,
        parentNodeId,
      })
      const result = evaluateDigit(parsed, assignments, selected.variable, digit, record)
      if (!result.valid) {
        record('prune-digit', {
          variable: selected.variable,
          value: digit,
          reason: result.reason,
          runId: result.run.id,
          direction: result.run.direction,
          causedBy: result.conflictingVariable,
          depth,
          nodeId,
          parentNodeId,
        })
        record('conflict', {
          variable: selected.variable,
          value: digit,
          reason: result.reason,
          runId: result.run.id,
          direction: result.run.direction,
          depth,
          nodeId,
          parentNodeId,
        })
        activeDecisionNodeId = parentDecisionNodeId
        continue
      }

      assignments[selected.variable] = digit
      record('assign-digit', { variable: selected.variable, value: digit, depth, nodeId, parentNodeId })
      const parentDomains = currentDomains
        ? Object.fromEntries(Object.entries(currentDomains).map(([id, domain]) => [id, [...domain]]))
        : Object.fromEntries(domainOptions.map(({ variable, domain }) => [variable, [...domain]]))
      const nextDomains = Object.fromEntries(
        Object.entries(parentDomains).map(([id, domain]) => [id, [...domain]]),
      )
      let deadEnd = false

      if (forwardChecking) {
        const peers = parsed.runsByVariable[selected.variable]
          .flatMap((run) => run.cells)
          .filter((candidate, index, cells) => candidate !== selected.variable && !Object.hasOwn(assignments, candidate) && cells.indexOf(candidate) === index)
        record('forward-check', { variable: selected.variable, value: digit, peers, depth, nodeId })
        for (const peer of peers) {
          const before = nextDomains[peer] ?? getDomain(peer)
          const after = getDomain(peer, before)
          const removed = before.filter((availableDigit) => !after.includes(availableDigit))
          nextDomains[peer] = after
          if (removed.length > 0) {
            const constrainedRun = parsed.runsByVariable[peer].find((run) =>
              run.cells.includes(selected.variable),
            )
            const runState = constrainedRun
              ? getKakuroRunStates(parsed, assignments, nextDomains).find((run) => run.id === constrainedRun.id)
              : null
            record('domain-reduction', {
              variable: peer,
              beforeDomain: before,
              domain: after,
              removed,
              causedBy: selected.variable,
              runId: constrainedRun?.id,
              direction: constrainedRun?.direction,
              remainingSum: runState?.remainingSum,
              remainingCells: runState?.remainingCells,
              depth,
              nodeId,
            })
            for (const value of removed) {
              const rejection = evaluateDigit(parsed, assignments, peer, value, () => {})
              record('prune-digit', {
                variable: peer,
                value,
                reason: rejection.reason ?? `Assignment ${selected.variable} = ${digit} makes this digit infeasible in a shared run.`,
                runId: rejection.run?.id,
                direction: rejection.run?.direction,
                causedBy: selected.variable,
                depth,
                nodeId,
              })
            }
          }
          if (after.length === 0) deadEnd = true
        }
      }

      if (deadEnd) {
        record('conflict', { variable: selected.variable, value: digit, reason: 'Forward checking found an empty domain.', depth: depth + 1, nodeId })
      } else if (search(depth + 1, nextDomains, nodeId)) {
        return true
      }

      record('backtrack', {
        variable: selected.variable,
        value: digit,
        reason: deadEnd ? 'Forward checking found an empty domain.' : 'The remaining run constraints have no solution.',
        depth,
        nodeId,
        parentNodeId,
      })
      delete assignments[selected.variable]
      record('remove-assignment', { variable: selected.variable, value: digit, depth, nodeId, parentNodeId })
      activeDecisionNodeId = parentDecisionNodeId
    }

    return false
  }

  const solved = search(0)
  if (!solved) record('no-solution', {
    reason: 'No valid solution exists.',
    depth: statistics.maxDepth,
  })
  return {
    solved,
    solution: solved ? solution : null,
    assignment: solved ? solution : null,
    error: solved ? null : 'No valid solution exists.',
    statistics: { ...statistics, elapsedMs: performance.now() - startedAt },
  }
}

export function generateKakuroSteps(puzzle, options = {}) {
  const events = []
  const result = solveKakuro({
    puzzle,
    heuristic: options.heuristic ?? 'mrv',
    forwardChecking: options.forwardChecking ?? true,
    onEvent: (event) => events.push(event),
  })
  return { ...result, events }
}