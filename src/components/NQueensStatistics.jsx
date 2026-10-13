import { summarizeNQueensEvents } from '../puzzles/nqueens/nQueensSolver.js'

function NQueensStatistics({ events, elapsedMs }) {
  const statistics = summarizeNQueensEvents(events, elapsedMs)
  const entries = [
    ['Positions tested', statistics.positionsTested],
    ['Queens placed', statistics.queensPlaced],
    ['Positions rejected', statistics.positionsRejected],
    ['Conflicts', statistics.conflicts],
    ['Backtracks', statistics.backtracks],
    ['Nodes explored', statistics.nodesExplored],
    ['Maximum search depth', statistics.maximumDepth],
    ['Execution time', `${statistics.elapsedMs.toFixed(2)} ms`],
  ]

  return (
    <section className="panel nqueens-statistics" aria-labelledby="nqueens-statistics-title">
      <header className="panel-heading">
        <div>
          <span className="panel-kicker">Calculated from processed events</span>
          <h2 id="nqueens-statistics-title">Statistics</h2>
        </div>
      </header>
      <dl className="nqueens-stat-grid">
        {entries.map(([label, value]) => (
          <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
        ))}
      </dl>
    </section>
  )
}

export default NQueensStatistics