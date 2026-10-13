import { generateMapColoringSteps } from './mapColoringSolver.js'

self.onmessage = (message) => {
  const { graph, palette, method, captureEvents = false } = message.data
  const startedAt = performance.now()
  const result = generateMapColoringSteps(graph, palette, { method, captureEvents })
  const executionTimeMs = performance.now() - startedAt

  self.postMessage({
    method,
    solution: result.solution,
    error: result.error,
    statistics: { ...result.statistics, executionTimeMs },
    ...(captureEvents ? { events: result.events } : {}),
  })
}