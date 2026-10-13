import { summarizeMapColoringEvents } from '../puzzles/mapColoring/mapColoringSolver.js'

function MapColoringStatistics({ events, elapsedMs }) {
  const statistics = summarizeMapColoringEvents(events, elapsedMs)
  const entries = [
    ['Regions assigned', statistics.regionsAssigned],
    ['Colors tested', statistics.colorsTested],
    ['Colors pruned', statistics.colorsPruned],
    ['Constraint checks', statistics.constraintChecks],
    ['Conflicts', statistics.conflicts],
    ['Backtracks', statistics.backtracks],
    ['Nodes explored', statistics.nodesExplored],
    ['Maximum depth', statistics.maximumDepth],
    ['Execution time', `${statistics.elapsedMs.toFixed(2)} ms`],
  ]

  return (
    <section className="panel map-statistics" aria-labelledby="map-statistics-title">
      <header className="panel-heading">
        <div>
          <span className="panel-kicker">Calculated from processed events</span>
          <h2 id="map-statistics-title">Statistics</h2>
        </div>
      </header>
      <dl>
        {entries.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
    </section>
  )
}

export default MapColoringStatistics