import { generateKakuroSteps } from './kakuroSolver.js'

self.onmessage = (message) => {
  const { puzzle } = message.data
  const startedAt = performance.now()
  const result = generateKakuroSteps(puzzle, { heuristic: 'mrv', forwardChecking: true })
  const executionTimeMs = performance.now() - startedAt
  self.postMessage({ ...result, statistics: { ...result.statistics, executionTimeMs } })
}