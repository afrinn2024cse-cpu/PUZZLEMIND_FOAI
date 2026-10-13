import { Fragment } from 'react'
import { LoaderCircle, Play } from 'lucide-react'
import { MAP_SOLVER_METHODS } from '../puzzles/mapColoring/mapColoringSolver.js'

function formatTime(milliseconds) {
  return `${milliseconds.toFixed(2)} ms`
}

function MapHeuristicImpact({ comparisonRuns, comparisonErrors, activeMethods, onRun }) {
  return (
    <section className="panel map-heuristic-impact" aria-labelledby="map-heuristic-impact-title">
      <header className="panel-heading">
        <div>
          <span className="panel-kicker">Same graph and palette, independent runs</span>
          <h2 id="map-heuristic-impact-title">Heuristic Impact</h2>
        </div>
      </header>
      <div className="map-comparison-actions">
        {Object.entries(MAP_SOLVER_METHODS).map(([method, configuration]) => {
          const isRunning = activeMethods.includes(method)
          return (
            <button
              className={isRunning ? 'comparison-button is-running' : 'comparison-button'}
              disabled={isRunning}
              key={method}
              onClick={() => onRun(method)}
              type="button"
            >
              {isRunning
                ? <LoaderCircle size={15} className="comparison-spinner" aria-hidden="true" />
                : <Play size={14} aria-hidden="true" />}
              {isRunning ? 'Running' : configuration.label}
            </button>
          )
        })}
      </div>
      <div className="map-comparison-table-wrap">
        <table className="comparison-table map-comparison-table">
          <thead>
            <tr><th>Method</th><th>Nodes</th><th>Backtracks</th><th>Pruned</th><th>Tested</th><th>Conflicts</th><th>Time</th></tr>
          </thead>
          <tbody>
            {Object.entries(MAP_SOLVER_METHODS).map(([method, configuration]) => {
              const run = comparisonRuns[method]
              const error = comparisonErrors[method]
              return (
                <Fragment key={method}>
                  <tr className="comparison-result">
                    <th scope="row">{configuration.label}</th>
                    <td>{run?.statistics.nodesExplored ?? '—'}</td>
                    <td>{run?.statistics.backtracks ?? '—'}</td>
                    <td>{run?.statistics.colorsPruned ?? '—'}</td>
                    <td>{run?.statistics.colorsTested ?? '—'}</td>
                    <td>{run?.statistics.conflicts ?? '—'}</td>
                    <td>{run ? formatTime(run.statistics.executionTimeMs) : '—'}</td>
                  </tr>
                  {error && (
                    <tr className="map-comparison-error-row">
                      <td colSpan="7" role="status">{configuration.label}: {error}</td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      {Object.entries(comparisonRuns).map(([method, result]) => result.error && (
        <p className="map-comparison-error" key={method} role="status">
          {MAP_SOLVER_METHODS[method].label}: {result.error}
        </p>
      ))}
    </section>
  )
}

export default MapHeuristicImpact