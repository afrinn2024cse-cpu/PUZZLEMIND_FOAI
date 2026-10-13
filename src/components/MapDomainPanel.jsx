import { MAP_COLORS } from '../puzzles/mapColoring/mapColoringSolver.js'

function MapDomainPanel({ graph, palette, events }) {
  const assignments = new Map()
  for (const event of events) {
    if (event.type === 'assign-color') assignments.set(event.variable, event.color)
    if (event.type === 'remove-assignment') assignments.delete(event.variable)
  }

  return (
    <section className="panel map-domain-panel" aria-labelledby="map-domains-title">
      <header className="panel-heading">
        <div>
          <span className="panel-kicker">Calculated from current assignments</span>
          <h2 id="map-domains-title">Current Domains</h2>
        </div>
      </header>
      <ul className="map-domain-list">
        {Object.entries(graph).map(([region, neighbors]) => {
          const assignedColor = assignments.get(region)
          const neighborColors = new Set(neighbors.map((neighbor) => assignments.get(neighbor)).filter(Boolean))
          const domain = assignedColor
            ? [assignedColor]
            : palette.filter((color) => !neighborColors.has(color))
          return (
            <li className={assignedColor ? 'is-assigned' : ''} key={region}>
              <strong>{region}</strong>
              <div className="domain-color-values" aria-label={`Region ${region} domain`}>
                {domain.length ? domain.map((color) => {
                  const colorValue = MAP_COLORS.find((entry) => entry.name === color)?.value
                  return <span className="map-domain-color" key={color} style={{ '--domain-color': colorValue }}>{color}</span>
                }) : <span className="domain-empty">Empty domain</span>}
              </div>
              {assignedColor && <span className="domain-assignment">Assigned</span>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default MapDomainPanel