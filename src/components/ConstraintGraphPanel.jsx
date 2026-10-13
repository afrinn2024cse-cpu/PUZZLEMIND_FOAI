import { getMapEdges } from '../puzzles/mapColoring/mapColoringSolver.js'

function ConstraintGraphPanel({ graph, events }) {
  const latestCheck = [...events].reverse().find((event) =>
    event.type === 'constraint-check' || event.type === 'reject-color',
  )
  const activeEdge = latestCheck?.neighbor
    ? [latestCheck.variable, latestCheck.neighbor].sort().join(':')
    : latestCheck?.conflictingNeighbor
      ? [latestCheck.variable, latestCheck.conflictingNeighbor].sort().join(':')
      : null

  return (
    <details className="panel collapsible-panel map-constraint-graph">
      <summary>
        <span>
          <span className="panel-kicker">{getMapEdges(graph).length} adjacency constraints</span>
          <strong>Constraint Graph</strong>
        </span>
        <span className="collapse-hint">Expand graph</span>
      </summary>
      <div className="map-graph-content">
        <p className="map-panel-note">An edge means the two connected regions must have different colors.</p>
        <ul>
          {getMapEdges(graph).map(([left, right]) => {
            const isActive = activeEdge === `${left}:${right}`
            return (
              <li className={isActive ? 'is-active' : ''} key={`${left}-${right}`}>
                <strong>{left}</strong><span aria-hidden="true">—</span><strong>{right}</strong>
                {isActive && <em>{latestCheck.valid === false || latestCheck.type === 'reject-color' ? 'Conflict' : 'Checking'}</em>}
              </li>
            )
          })}
        </ul>
      </div>
    </details>
  )
}

export default ConstraintGraphPanel