import { X } from 'lucide-react'
import { getMapEdges, MAP_COLORS } from '../puzzles/mapColoring/mapColoringSolver.js'

const regionPoints = {
  A: [100, 72],
  B: [270, 72],
  C: [185, 180],
  D: [355, 180],
  E: [270, 288],
  F: [440, 288],
  G: [355, 396],
}

function MapDiagram({ graph, events, palette }) {
  const assignments = new Map()
  const rejections = new Map()
  const backtracked = new Set()
  let selectedRegion = null
  let candidate = null
  let activeEdge = null
  let edgeConflict = false

  for (const event of events) {
    if (event.type === 'select-variable') {
      selectedRegion = event.variable
      candidate = null
      activeEdge = null
    }
    if (event.type === 'try-color') {
      selectedRegion = event.variable
      candidate = { variable: event.variable, color: event.color, nodeId: event.nodeId }
      rejections.delete(event.variable)
      backtracked.delete(event.variable)
    }
    if (event.type === 'constraint-check' && event.neighbor) {
      activeEdge = [event.variable, event.neighbor]
      edgeConflict = !event.valid
    }
    if (event.type === 'reject-color') {
      rejections.set(event.variable, event)
      activeEdge = [event.variable, event.conflictingNeighbor]
      edgeConflict = true
    }
    if (event.type === 'assign-color') {
      assignments.set(event.variable, event.color)
      rejections.delete(event.variable)
      backtracked.delete(event.variable)
    }
    if (event.type === 'forward-check') {
      activeEdge = null
      edgeConflict = false
    }
    if (event.type === 'backtrack') {
      selectedRegion = event.variable
      backtracked.add(event.variable)
      activeEdge = null
    }
    if (event.type === 'remove-assignment') {
      assignments.delete(event.variable)
      selectedRegion = event.variable
      backtracked.add(event.variable)
    }
  }

  const focusRegion = candidate?.variable ?? selectedRegion
  const highlightedRegions = new Set(focusRegion ? [focusRegion, ...(graph[focusRegion] ?? [])] : [])
  const colorValue = (color) => MAP_COLORS.find((entry) => entry.name === color)?.value ?? '#dfe7e1'
  const edgeKey = ([left, right]) => [left, right].sort().join(':')
  const activeEdgeKey = activeEdge ? edgeKey(activeEdge) : null

  return (
    <div className="map-diagram-wrap">
      <svg className="map-diagram" viewBox="20 18 500 430" role="img" aria-label="Map regions connected by CSP constraints">
        <g className="map-edges" aria-label="Neighbor constraints">
          {getMapEdges(graph).map(([left, right]) => {
            const [x1, y1] = regionPoints[left]
            const [x2, y2] = regionPoints[right]
            const isActive = activeEdgeKey === edgeKey([left, right])
            return (
              <line
                className={`map-edge${isActive ? edgeConflict ? ' is-conflict' : ' is-checked' : ''}`}
                key={`${left}-${right}`}
                x1={x1}
                x2={x2}
                y1={y1}
                y2={y2}
                aria-label={`${left} adjacent to ${right}`}
              />
            )
          })}
        </g>
        <g className="map-regions">
          {Object.keys(graph).map((region) => {
            const [x, y] = regionPoints[region]
            const assignedColor = assignments.get(region)
            const rejected = rejections.get(region)
            const isSelected = candidate?.variable === region
            const isNeighbor = highlightedRegions.has(region) && !isSelected
            const classes = ['map-region']
            if (isSelected) classes.push('is-selected')
            if (isNeighbor) classes.push('is-neighbor-highlight')
            if (rejected) classes.push('is-rejected')
            if (backtracked.has(region) && !assignedColor) classes.push('is-backtracked')
            if (events.some((event) => event.type === 'solution-found') && assignedColor) classes.push('is-solution-region')
            const fill = assignedColor ? colorValue(assignedColor) : '#f8faf7'
            const textColor = assignedColor === 'Yellow' ? '#443719' : assignedColor ? '#fff' : '#31463a'

            return (
              <g
                aria-label={`Region ${region}${assignedColor ? `, ${assignedColor}` : ''}${isSelected ? ', current region' : ''}${rejected ? `, rejected: ${rejected.reason}` : ''}`}
                className={classes.join(' ')}
                key={region}
                role="group"
              >
                <path
                  d={`M ${x - 56} ${y - 26} L ${x - 34} ${y - 46} L ${x + 34} ${y - 46} L ${x + 56} ${y - 26} L ${x + 56} ${y + 26} L ${x + 34} ${y + 46} L ${x - 34} ${y + 46} L ${x - 56} ${y + 26} Z`}
                  fill={fill}
                />
                <text className="region-label" fill={textColor} x={x} y={assignedColor ? y - 3 : y + 4}>{region}</text>
                {assignedColor && <text className="region-color-label" fill={textColor} x={x} y={y + 17}>{assignedColor}</text>}
                {isSelected && candidate && (
                  <text className="region-testing-label" x={x} y={y + (assignedColor ? 32 : 25)}>Testing {candidate.color}</text>
                )}
                {rejected && <X className="region-reject-icon" x={x + 37} y={y - 40} size={17} aria-hidden="true" />}
              </g>
            )
          })}
        </g>
      </svg>
      <ul className="map-color-legend" aria-label="Map coloring palette">
        {palette.map((color) => {
          const colorDetails = MAP_COLORS.find((entry) => entry.name === color)
          return <li key={color}><span style={{ '--legend-color': colorDetails.value }} />{color}</li>
        })}
        <li><span className="map-legend-selected" />Selected</li>
        <li><span className="map-legend-rejected"><X size={11} aria-hidden="true" /></span>Rejected</li>
      </ul>
    </div>
  )
}

export default MapDiagram