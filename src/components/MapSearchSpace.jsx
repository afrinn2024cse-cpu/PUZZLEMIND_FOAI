import { ArrowDown, Check, Filter, GitBranch, Search, Sparkles } from 'lucide-react'
import { summarizeMapColoringEvents } from '../puzzles/mapColoring/mapColoringSolver.js'

function MapSearchSpace({ events, palette, regionCount }) {
  const initial = events.find((event) => event.type === 'initial-domain-summary')
  const latestSelection = [...events].reverse().find((event) => event.type === 'select-variable')
  const statistics = summarizeMapColoringEvents(events)
  const reduction = initial?.domainValues
    ? (statistics.colorsPruned / initial.domainValues) * 100
    : null
  const solved = events.some((event) => event.type === 'solution-found')
  const stages = [
    { title: 'Initial domains', value: initial ? `${initial.domainValues} values` : `${regionCount * palette.length} values`, Icon: Search },
    { title: 'Constraint filtering', value: `${statistics.constraintChecks} checks`, Icon: Filter },
    { title: 'MRV + degree', value: latestSelection ? `${latestSelection.variable} · ${latestSelection.domain.length} colors` : 'Awaiting selection', Icon: GitBranch },
    { title: 'Forward checking', value: `${statistics.colorsPruned} colors pruned`, Icon: Check },
    { title: 'Reduced domains', value: latestSelection ? `${latestSelection.domain.join(', ') || 'empty'}` : 'Awaiting search', Icon: ArrowDown },
    { title: 'Solution', value: solved ? 'Valid coloring' : 'In progress', Icon: Sparkles },
  ]

  return (
    <section className="panel map-search-space" aria-labelledby="map-search-space-title">
      <header className="panel-heading">
        <div>
          <span className="panel-kicker">Derived from actual search and prune events</span>
          <h2 id="map-search-space-title">Search Space Reduction</h2>
        </div>
        {reduction !== null && (
          <span className="map-pruning-badge">{reduction.toFixed(1)}% pruning operations / initial domain values</span>
        )}
      </header>
      <ol className="map-search-stages">
        {stages.map(({ title, value, Icon }, index) => (
          <li key={title}>
            <span className="map-stage-icon"><Icon size={15} aria-hidden="true" /></span>
            <span>{title}</span>
            <strong>{value}</strong>
            {index < stages.length - 1 && <i aria-hidden="true">↓</i>}
          </li>
        ))}
      </ol>
      <p className="map-panel-note">Pruning percentage counts real domain-removal operations; repeated removals after backtracking are counted again.</p>
    </section>
  )
}

export default MapSearchSpace