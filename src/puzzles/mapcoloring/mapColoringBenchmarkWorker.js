import { MAP_SOLVER_METHODS, solveMapColoring } from './mapColoringSolver.js'

self.onmessage = (message) => {
  const { graph, palette, method } = message.data
  const configuration = MAP_SOLVER_METHODS[method]
  if (!configuration) {
    self.postMessage({ method, error: `Unknown comparison method: ${method}.` })
    return
  }

  const result = solveMapColoring({
    graph,
    colors: palette,
    heuristic: configuration.variableSelection === 'mrv' ? 'mrv' : 'basic',
    forwardChecking: configuration.forwardChecking,
  })

  self.postMessage({
    method,
    solved: result.solved,
    assignment: result.assignment,
    error: result.error,
    statistics: {
      nodesExplored: result.nodes,
      colorsTested: result.colorsTested,
      colorsPruned: result.colorsPruned,
      conflicts: result.conflicts,
      backtracks: result.backtracks,
      constraintChecks: result.constraintChecks,
      maximumDepth: result.maxDepth,
      executionTimeMs: result.elapsedMs,
    },
  })
}