import { summarizeSolverEvents } from '../utils/solverSteps.js'

function formatElapsed(milliseconds) {
  if (milliseconds < 1000) return `${milliseconds.toFixed(1)} ms`
  return `${(milliseconds / 1000).toFixed(2)} s`
}

function StatisticsPanel({ events, elapsedMs }) {
  const statistics = summarizeSolverEvents(events, elapsedMs)
  const metrics = [
    ['Assignments', statistics.assignments],
    ['Candidates tested', statistics.candidatesTested],
    ['Candidates pruned', statistics.candidatesPruned],
    ['Conflicts', statistics.conflicts],
    ['Backtracks', statistics.backtracks],
    ['Nodes explored', statistics.nodesExplored],
    ['Maximum depth', statistics.maximumDepth],
    ['Elapsed time', formatElapsed(statistics.elapsedMs)],
  ]

  return (
    <section className="panel statistics-panel" aria-labelledby="statistics-title">
      <header className="panel-heading">
        <div>
          <span className="panel-kicker">Live from processed events</span>
          <h2 id="statistics-title">Statistics</h2>
        </div>
      </header>
      <dl className="statistics-grid">
        {metrics.map(([label, value]) => (
          <div className="statistic" key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export default StatisticsPanel