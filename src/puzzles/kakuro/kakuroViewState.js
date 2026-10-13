import { parseKakuroPuzzle } from './kakuroSolver.js'

function cloneDomains(domains) {
  return Object.fromEntries(Object.entries(domains).map(([variable, domain]) => [variable, [...domain]]))
}

export function buildKakuroViewState(puzzle, events) {
  const parsed = parseKakuroPuzzle(puzzle)
  let domains = Object.fromEntries(parsed.variables.map(({ id }) => [id, [1, 2, 3, 4, 5, 6, 7, 8, 9]]))
  let assignments = Object.create(null)
  const snapshots = new Map()
  const backtracked = new Set()

  for (const event of events) {
    if (event.type === 'select-cell' && event.domains) {
      for (const { variable, domain } of event.domains) domains[variable] = [...domain]
    }
    if (event.type === 'calculate-domain') domains[event.variable] = [...event.domain]
    if (event.type === 'assign-digit') {
      snapshots.set(event.nodeId, { domains: cloneDomains(domains), assignments: { ...assignments } })
      assignments[event.variable] = event.value
      domains[event.variable] = [event.value]
      backtracked.delete(event.variable)
    }
    if (event.type === 'domain-reduction') domains[event.variable] = [...event.domain]
    if (event.type === 'remove-assignment') {
      const snapshot = snapshots.get(event.nodeId)
      if (snapshot) {
        domains = cloneDomains(snapshot.domains)
        assignments = Object.assign(Object.create(null), snapshot.assignments)
        snapshots.delete(event.nodeId)
      } else {
        delete assignments[event.variable]
      }
      backtracked.add(event.variable)
    }
    if (event.type === 'assign-digit') backtracked.delete(event.variable)
  }

  return { parsed, domains, assignments, backtracked }
}