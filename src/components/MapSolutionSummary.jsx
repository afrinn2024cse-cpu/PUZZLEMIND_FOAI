import { PartyPopper } from 'lucide-react'
import { summarizeMapColoringEvents } from '../puzzles/mapColoring/mapColoringSolver.js'

function MapSolutionSummary({ events, elapsedMs, solution, graph }) {
  const statistics = summarizeMapColoringEvents(events, elapsedMs)
  const metrics = [
    ['Regions', Object.keys(graph).length],
    ['Colors used', new Set(Object.values(solution)).size],
    ['Nodes', statistics.nodesExplored],
    ['Colors tested', statistics.colorsTested],
    ['Pruned', statistics.colorsPruned],
    ['Conflicts', statistics.conflicts],
    ['Backtracks', statistics.backtracks],
    ['Maximum depth', statistics.maximumDepth],
    ['Execution time', `${statistics.elapsedMs.toFixed(2)} ms`],
  ]

  return (
    <section className="map-solution-summary" role="status" aria-labelledby="map-solution-summary-title">
      <header>
        <PartyPopper size={22} aria-hidden="true" />
        <div>
          <span className="panel-kicker">Constraint graph fully colored</span>
          <h2 id="map-solution-summary-title">Valid Coloring Found</h2>
        </div>
      </header>
      <dl>{metrics.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </section>
  )
}

export default MapSolutionSummary