import { KAKURO_METHODS, solveKakuro } from './kakuroSolver.js'

self.onmessage = (message) => {
  const { puzzle, method } = message.data
  const configuration = KAKURO_METHODS[method]
  if (!configuration) {
    self.postMessage({ method, error: `Unknown comparison method: ${method}.` })
    return
  }

  const result = solveKakuro({
    puzzle,
    heuristic: configuration.heuristic,
    forwardChecking: configuration.forwardChecking,
  })
  self.postMessage({
    method,
    solved: result.solved,
    solution: result.solution,
    error: result.error,
    statistics: {
      cellsAssigned: result.statistics.cellsAssigned,
      digitsTested: result.statistics.digitsTested,
      digitsPruned: result.statistics.digitsPruned,
      conflicts: result.statistics.conflicts,
      backtracks: result.statistics.backtracks,
      constraintChecks: result.statistics.constraintChecks,
      nodesExplored: result.statistics.nodesExplored,
      maximumDepth: result.statistics.maxDepth,
      executionTimeMs: result.statistics.elapsedMs,
    },
  })
}