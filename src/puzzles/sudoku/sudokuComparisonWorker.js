import { generateSolverSteps } from './sudokuSolver.js'

self.onmessage = (message) => {
  const { board, method, captureEvents = false } = message.data
  const startedAt = performance.now()
  const result = generateSolverSteps(board, { method, captureEvents })
  const executionTimeMs = performance.now() - startedAt

  self.postMessage({
    method,
    statistics: { ...result.statistics, executionTimeMs },
    solved: Boolean(result.solution),
    error: result.error,
    ...(captureEvents ? { events: result.events } : {}),
  })
}