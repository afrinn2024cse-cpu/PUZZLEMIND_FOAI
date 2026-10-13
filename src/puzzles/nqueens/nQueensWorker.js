import { generateNQueensSteps } from './nQueensSolver.js'

self.onmessage = (message) => {
  const { size, solutionOffset = 0 } = message.data
  const startedAt = performance.now()
  const result = generateNQueensSteps(size, { solutionOffset })
  const executionTimeMs = performance.now() - startedAt

  self.postMessage({ ...result, statistics: { ...result.statistics, executionTimeMs } })
}