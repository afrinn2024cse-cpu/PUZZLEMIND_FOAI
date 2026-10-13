export function formatSolverEvent(event) {
  switch (event.type) {
    case 'initial-domain-summary':
      return `Constraint filtering reduced ${event.candidateSlots} possible values to ${event.legalCandidateCount} legal candidates across ${event.emptyCellCount} empty cells.`
    case 'node-explored':
      return `Exploring search node at depth ${event.depth}.`
    case 'select-variable':
      if (event.variable) {
        return event.reason === 'MRV'
          ? `MRV selected Region ${event.variable} with ${event.domain.length} remaining legal colors.`
          : `Selecting first unassigned Region ${event.variable}.`
      }
      if (event.reason === 'next-column') return `Selecting column ${event.column}.`
      return event.reason === 'MRV'
        ? `MRV selected ${event.cell} because it has the smallest remaining domain: ${event.domain.length ? event.domain.join(', ') : 'no legal values'}.`
        : `Basic backtracking selected the first unassigned variable, ${event.cell}, with domain ${event.domain.join(', ') || 'empty'}.`
    case 'try-value':
      if (event.variable) return `Trying ${event.color} for Region ${event.variable}.`
      if (Number.isInteger(event.column)) return `Trying row ${event.row} in column ${event.column}.`
      return `Trying value ${event.value} at ${event.cell}.`
    case 'check-constraint':
      if (event.variable) {
        return `Constraint ${event.valid ? 'passed' : 'failed'}: Region ${event.variable} ${event.valid ? 'differs from' : 'matches'} Region ${event.neighbor} (${event.neighborColor}).`
      }
      if (Number.isInteger(event.column)) {
        return `${event.constraint} constraint ${event.valid ? 'passed' : 'failed'} at C${event.column}, R${event.row ?? '?'}.`
      }
      return `Checking ${event.constraint} constraint for ${event.cell}: ${event.valid ? 'valid' : 'conflict'}.`
    case 'assign-value':
      return `Assigned ${event.value} to ${event.cell}.`
    case 'select-cell':
      return `MRV selected ${event.variable} with ${event.domain.length} remaining digits.`
    case 'try-digit':
      return `Trying digit ${event.value} for ${event.variable}.`
    case 'assign-digit':
      return `Assigned ${event.value} to ${event.variable}.`
    case 'sum-check':
      return `${event.direction} sum check: ${event.currentSum} assigned, ${event.remainingCells} cells for remaining ${event.remainingSum}; ${event.possible ? 'feasible' : 'impossible'}.`
    case 'duplicate-check':
      return `${event.direction} uniqueness check for ${event.variable} = ${event.digit}: ${event.valid ? 'passed' : 'duplicate'}.`
    case 'prune-digit':
      return `Pruned digit ${event.value} from ${event.variable}: ${event.reason}`
    case 'domain-reduction':
      return `${event.variable} domain reduced from {${event.beforeDomain.join(', ')}} to {${event.domain.join(', ')}}.`
    case 'calculate-domain':
      if (event.variable) return `Region ${event.variable} has ${event.domain.length} legal colors: ${event.domain.join(', ') || 'none'}.`
      return event.type
    case 'try-color':
      return `Trying ${event.color} for Region ${event.variable}.`
    case 'constraint-check':
      return `Region ${event.variable} ${event.valid ? 'may use' : 'cannot use'} ${event.color}${event.neighbor ? ` next to Region ${event.neighbor} (${event.neighborColor})` : ''}.`
    case 'assign-color':
      return `Assigned ${event.color} to Region ${event.variable}.`
    case 'forward-check':
      return event.variable
        ? `Forward checking neighbors of Region ${event.variable} after assigning ${event.color}.`
        : `Forward checking started for ${event.cell}; ${event.affectedCells} peer cells were checked.`
    case 'prune-color':
      return `Pruned ${event.color} from Region ${event.variable}'s domain because of Region ${event.causedBy}.`
    case 'reject-color':
      return `Rejected ${event.color} for Region ${event.variable}: ${event.reason}`
    case 'remove-assignment':
      return Number.isInteger(event.value)
        ? `Removed ${event.variable} = ${event.value}.`
        : `Removed Region ${event.variable} = ${event.color}.`
    case 'place-queen':
      return `Placed queen at column ${event.column}, row ${event.row}.`
    case 'reject-value':
      return `Rejected column ${event.column}, row ${event.row}: ${event.reason}.`
    case 'remove-queen':
      return `Removed queen from column ${event.column}, row ${event.row}.`
    case 'prune-value':
      return `Candidate ${event.value} was removed from ${event.cell} by the ${event.reason}.`
    case 'conflict':
      if (event.variable) return `Conflict at Region ${event.variable}: ${event.reason}`
      return event.reason === 'empty domain'
        ? `Conflict detected: ${event.cell} has no legal values.`
        : `Conflict detected at ${event.cell}: ${event.reason}.`
    case 'backtrack':
      if (event.variable && event.color) return `Backtracking from Region ${event.variable} = ${event.color}.`
      if (event.variable && Number.isInteger(event.value)) return `Backtracking from ${event.variable} = ${event.value}.`
      if (Number.isInteger(event.column)) return `Backtracking from column ${event.column}, row ${event.row}.`
      return `Backtracking from ${event.cell}; undoing ${event.value} and trying the next candidate.`
    case 'solution-found':
      if (event.solution && Number.isInteger(event.colorCount)) return `Valid coloring found using ${event.colorCount} colors.`
      if (event.solution && !Array.isArray(event.solution)) return `Kakuro solved with ${Object.keys(event.solution).length} assigned cells.`
      if (Number.isInteger(event.solutionNumber)) return `Solution ${event.solutionNumber} found for N=${event.solution.length}.`
      return 'Solution found. Every row, column, and 3x3 box satisfies the constraints.'
    case 'solution-skipped':
      return `Continuing past solution ${event.solutionNumber} to find another arrangement.`
    case 'invalid-puzzle':
      return event.reason
    case 'no-solution':
      return event.reason
    default:
      return event.type
  }
}

export function summarizeSolverEvents(events, elapsedMs = 0) {
  const processed = events
  return {
    assignments: processed.filter((event) => event.type === 'assign-value').length,
    candidatesTested: processed.filter((event) => event.type === 'try-value').length,
    candidatesPruned: processed.filter((event) => event.type === 'prune-value').length,
    conflicts: processed.filter((event) => event.type === 'conflict').length,
    backtracks: processed.filter((event) => event.type === 'backtrack').length,
    nodesExplored: processed.filter((event) => event.type === 'node-explored').length,
    maximumDepth: processed.reduce(
      (maximum, event) => Math.max(maximum, event.depth ?? 0),
      0,
    ),
    elapsedMs,
  }
}

export function buildSearchTree(events, maxNodes = 100) {
  const nodes = [{
    id: 'root',
    parentId: null,
    label: 'Start',
    state: 'explored',
    depth: 0,
  }]
  const nodeById = new Map([['root', nodes[0]]])
  const totalNodes = 1 + events.filter((event) =>
    event.type === 'try-value'
      || event.type === 'try-color'
      || event.type === 'try-digit'
      || event.treeNodeId,
  ).length
  let currentNodeId = 'root'

  const addNode = (node) => {
    if (nodes.length >= maxNodes || nodeById.has(node.id)) return
    nodes.push(node)
    nodeById.set(node.id, node)
  }

  for (const event of events) {
    if (event.type === 'try-value' || event.type === 'try-color' || event.type === 'try-digit') {
      addNode({
        id: event.nodeId,
        parentId: event.parentNodeId ?? 'root',
        label: event.type === 'try-color'
          ? `${event.variable} = ${event.color}`
          : event.type === 'try-digit'
            ? `${event.variable} = ${event.value}`
            : event.variable
              ? `${event.variable} = ${event.color}`
              : `${event.cell} = ${event.value}`,
        state: 'explored',
        depth: event.depth + 1,
      })
      currentNodeId = event.nodeId
    } else if (event.type === 'backtrack') {
      const node = nodeById.get(event.nodeId)
      if (node) node.state = 'backtracked'
      currentNodeId = event.parentNodeId ?? 'root'
    } else if (event.type === 'reject-color') {
      const branch = nodeById.get(event.nodeId)
      if (branch) branch.state = 'pruned'
      currentNodeId = event.nodeId ?? event.parentNodeId ?? 'root'
    } else if (event.type === 'conflict') {
      const branch = nodeById.get(event.nodeId)
      if (branch) branch.state = 'pruned'
      if (event.treeNodeId) {
        addNode({
          id: event.treeNodeId,
          parentId: event.parentNodeId ?? 'root',
          label: `Conflict${event.cell ? ` at ${event.cell}` : ''}`,
          state: 'pruned',
          depth: event.depth ?? 1,
        })
        currentNodeId = event.treeNodeId
      } else {
        currentNodeId = event.nodeId ?? event.parentNodeId ?? 'root'
      }
    } else if (event.type === 'solution-found') {
      addNode({
        id: event.treeNodeId,
        parentId: event.parentNodeId ?? 'root',
        label: 'Solution',
        state: 'solution',
        depth: event.depth + 1,
      })
      currentNodeId = event.treeNodeId
    } else if (event.type === 'solution-skipped') {
      addNode({
        id: event.treeNodeId,
        parentId: event.parentNodeId ?? 'root',
        label: `Solution ${event.solutionNumber} (continue)`,
        state: 'backtracked',
        depth: event.depth + 1,
      })
      currentNodeId = event.parentNodeId ?? 'root'
    } else if (event.nodeId && nodeById.has(event.nodeId)) {
      currentNodeId = event.nodeId
    } else if (event.type === 'node-explored' && event.parentNodeId) {
      currentNodeId = event.parentNodeId
    }
  }

  const currentNode = nodeById.get(currentNodeId)
  if (currentNode && currentNode.state === 'explored') currentNode.state = 'current'

  return {
    nodes,
    totalNodes,
    truncatedCount: Math.max(0, totalNodes - nodes.length),
  }
}

export function calculateCandidateReduction(basicCandidates, comparedCandidates) {
  if (!Number.isFinite(basicCandidates) || basicCandidates <= 0 || !Number.isFinite(comparedCandidates)) {
    return null
  }
  return ((basicCandidates - comparedCandidates) / basicCandidates) * 100
}

export function describeTimelineEvent(event) {
  switch (event.type) {
    case 'initial-domain-summary': return 'Filter initial candidates'
    case 'node-explored': return `Explore depth ${event.depth}`
    case 'select-variable': return event.variable
      ? `Select Region ${event.variable}${event.reason === 'MRV' ? ' (MRV)' : ''}`
      : event.reason === 'next-column'
      ? `Select column ${event.column}`
      : `Select ${event.cell} (${event.reason === 'MRV' ? 'MRV' : 'first empty'})`
    case 'select-cell': return `MRV selects ${event.variable}`
    case 'try-digit': return `Try digit ${event.value} at ${event.variable}`
    case 'assign-digit': return `Assign ${event.variable} = ${event.value}`
    case 'sum-check': return `Check ${event.direction} sum for ${event.variable}`
    case 'duplicate-check': return `Check ${event.direction} uniqueness for ${event.variable}`
    case 'prune-digit': return `Prune ${event.value} from ${event.variable}`
    case 'domain-reduction': return `Reduce ${event.variable} domain`
    case 'calculate-domain': return `Domain ${event.variable} = {${event.domain.join(', ')}}`
    case 'try-value': return Number.isInteger(event.column)
      ? `Try row ${event.row} in column ${event.column}`
      : `Try ${event.value} at ${event.cell}`
    case 'try-color': return `Try ${event.color} at ${event.variable}`
    case 'check-constraint': return Number.isInteger(event.column)
      ? `Check ${event.constraint} at C${event.column}, R${event.row}`
      : `Check ${event.constraint} at ${event.cell}`
    case 'constraint-check': return `Check ${event.variable} against ${event.neighbor}`
    case 'assign-value': return `Assign ${event.value} to ${event.cell}`
    case 'assign-color': return `Assign ${event.color} to ${event.variable}`
    case 'forward-check': return event.variable ? `Forward check ${event.variable}` : `Forward check ${event.cell}`
    case 'prune-color': return `Prune ${event.color} from ${event.variable}`
    case 'reject-color': return `Reject ${event.color} at ${event.variable}`
    case 'remove-assignment': return Number.isInteger(event.value)
      ? `Remove ${event.variable} = ${event.value}`
      : `Remove ${event.variable} = ${event.color}`
    case 'place-queen': return `Place queen at C${event.column}, R${event.row}`
    case 'reject-value': return `Reject C${event.column}, R${event.row}: ${event.reason}`
    case 'remove-queen': return `Remove queen from C${event.column}, R${event.row}`
    case 'prune-value': return `Prune ${event.value} from ${event.cell}`
    case 'conflict': return `Conflict${event.cell ? ` at ${event.cell}` : ''}`
    case 'backtrack': return `Undo ${event.cell} = ${event.value}`
    case 'solution-found': return 'Solution found'
    case 'solution-skipped': return `Continue after solution ${event.solutionNumber}`
    case 'invalid-puzzle': return 'Invalid puzzle'
    case 'no-solution': return 'No solution'
    default: return event.type
  }
}