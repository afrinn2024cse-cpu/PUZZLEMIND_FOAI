import { summarizeSolverEvents } from '../utils/solverSteps.js'

function SearchDepthPanel({ events }) {
  const latest = [...events].reverse().find((event) => Number.isInteger(event.depth))
  const currentDepth = latest?.depth ?? 0
  const { maximumDepth } = summarizeSolverEvents(events)
  const depths = Array.from({ length: Math.max(1, maximumDepth + 1) }, (_, depth) => depth)

  return (
    <section className="panel depth-panel" aria-labelledby="depth-title">
      <header className="panel-heading">
        <div>
          <span className="panel-kicker">Recursive search</span>
          <h2 id="depth-title">Search Depth</h2>
        </div>
        <span className="depth-current">Current depth: <strong>{currentDepth}</strong></span>
      </header>
      <div className="depth-track-scroll" aria-label={`Current depth ${currentDepth}; maximum depth ${maximumDepth}`}>
        <ol className="depth-track">
          {depths.map((depth) => (
            <li className={depth === currentDepth ? 'is-current' : depth < currentDepth ? 'is-visited' : ''} key={depth}>
              <span>{depth}</span>
            </li>
          ))}
        </ol>
      </div>
      <p className="depth-maximum">Maximum depth reached: <strong>{maximumDepth}</strong></p>
    </section>
  )
}

export default SearchDepthPanel