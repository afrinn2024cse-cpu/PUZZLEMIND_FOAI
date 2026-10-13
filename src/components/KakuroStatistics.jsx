import { summarizeKakuroEvents } from '../puzzles/kakuro/kakuroSolver.js'

function KakuroStatistics({ events, elapsedMs }) {
  const stats = summarizeKakuroEvents(events, elapsedMs)
  const rows = [
    ['Cells assigned', stats.cellsAssigned],
    ['Digits tested', stats.digitsTested],
    ['Digits pruned', stats.digitsPruned],
    ['Constraint checks', stats.constraintChecks],
    ['Sum checks', stats.sumChecks],
    ['Duplicate checks', stats.duplicateChecks],
    ['Conflicts', stats.conflicts],
    ['Backtracks', stats.backtracks],
    ['Nodes explored', stats.nodesExplored],
    ['Maximum depth', stats.maximumDepth],
    ['Execution time', `${stats.elapsedMs.toFixed(2)} ms`],
  ]

  return (
    <section className="panel kakuro-statistics" aria-labelledby="kakuro-statistics-title">
      <header className="panel-heading">
        <div>
          <span className="panel-kicker">Calculated from processed solver events</span>
          <h2 id="kakuro-statistics-title">Statistics</h2>
        </div>
      </header>
      <dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </section>
  )
}

export default KakuroStatistics