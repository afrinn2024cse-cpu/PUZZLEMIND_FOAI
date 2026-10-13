import { Fragment } from 'react'
import { LoaderCircle, Play } from 'lucide-react'
import { KAKURO_METHODS } from '../puzzles/kakuro/kakuroSolver.js'

function KakuroHeuristicImpact({ runs, activeMethods, errors, onRun }) {
  return (
    <section className="panel kakuro-heuristic-impact" aria-labelledby="kakuro-impact-title">
      <header className="panel-heading">
        <div>
          <span className="panel-kicker">Fresh synchronous CSP runs on the selected puzzle</span>
          <h2 id="kakuro-impact-title">Heuristic Impact</h2>
        </div>
      </header>
      <div className="kakuro-benchmark-actions">
        {Object.entries(KAKURO_METHODS).map(([method, config]) => {
          const active = activeMethods.includes(method)
          return (
            <button className={active ? 'comparison-button is-running' : 'comparison-button'} disabled={active} key={method} onClick={() => onRun(method)} type="button">
              {active ? <LoaderCircle size={15} className="comparison-spinner" aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
              {active ? 'Running' : config.label}
            </button>
          )
        })}
      </div>
      <div className="kakuro-benchmark-table-wrap">
        <table className="comparison-table kakuro-benchmark-table">
          <thead><tr><th>Method</th><th>Nodes</th><th>Backtracks</th><th>Tested</th><th>Pruned</th><th>Conflicts</th><th>Checks</th><th>Time</th></tr></thead>
          <tbody>
            {Object.entries(KAKURO_METHODS).map(([method, config]) => {
              const run = runs[method]
              const error = errors[method]
              return (
                <Fragment key={method}>
                  <tr>
                    <th scope="row">{config.label}</th>
                    <td>{run?.statistics.nodesExplored ?? '—'}</td>
                    <td>{run?.statistics.backtracks ?? '—'}</td>
                    <td>{run?.statistics.digitsTested ?? '—'}</td>
                    <td>{run?.statistics.digitsPruned ?? '—'}</td>
                    <td>{run?.statistics.conflicts ?? '—'}</td>
                    <td>{run?.statistics.constraintChecks ?? '—'}</td>
                    <td>{run ? `${run.statistics.executionTimeMs.toFixed(2)} ms` : '—'}</td>
                  </tr>
                  {error && <tr className="kakuro-benchmark-error"><td colSpan="8" role="status">{error}</td></tr>}
                  {run?.error && <tr className="kakuro-benchmark-error"><td colSpan="8">{run.error}</td></tr>}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default KakuroHeuristicImpact