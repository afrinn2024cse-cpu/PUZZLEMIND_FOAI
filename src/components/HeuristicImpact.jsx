import { Fragment } from 'react'
import { LoaderCircle, Play } from 'lucide-react'
import { SOLVER_METHODS } from '../puzzles/sudoku/sudokuSolver.js'

function formatTime(milliseconds) {
  return `${milliseconds.toFixed(2)} ms`
}

function HeuristicImpact({ comparisonRuns, activeMethods, comparisonErrors, onRun }) {
  return (
    <section className="panel heuristic-impact-panel" aria-labelledby="heuristic-impact-title">
      <header className="panel-heading">
        <div>
          <span className="panel-kicker">Same board, independently executed</span>
          <h2 id="heuristic-impact-title">Heuristic Impact</h2>
        </div>
      </header>
      <div className="comparison-actions">
        {Object.entries(SOLVER_METHODS).map(([method, configuration]) => (
          (() => {
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
          })()
        ))}
      </div>
      <div className="comparison-table-wrap">
        <table className="comparison-table">
          <thead>
            <tr><th>Method</th><th>Nodes</th><th>Backtracks</th><th>Pruned</th><th>Time</th></tr>
          </thead>
          <tbody>
            {Object.entries(SOLVER_METHODS).map(([method, configuration]) => {
              const run = comparisonRuns[method]
              const error = comparisonErrors[method]
              return (
                <Fragment key={method}>
                  <tr className="comparison-result">
                    <th scope="row">{configuration.label}</th>
                    <td>{run?.statistics.nodesExplored ?? '—'}</td>
                    <td>{run?.statistics.backtracks ?? '—'}</td>
                    <td>{run?.statistics.candidatesPruned ?? '—'}</td>
                    <td>{run ? formatTime(run.statistics.executionTimeMs) : '—'}</td>
                  </tr>
                  {(run || error) && (
                    <tr className="comparison-detail">
                      <td colSpan="5">
                        {error ? `Comparison failed: ${error}` : run.solved ? 'Solved' : run.error || 'No solution'}
                        {run && (
                          <>
                            {' · '}{run.statistics.assignments} assignments
                            {' · '}{run.statistics.candidatesTested} candidates tested
                            {' · '}{run.statistics.candidatesPruned} pruned
                            {' · '}{run.statistics.conflicts} conflicts
                            {' · '}depth {run.statistics.maximumDepth}
                          </>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default HeuristicImpact