import { formatSolverEvent } from '../utils/solverSteps.js'

function SolverExplanation({ events, stepIndex, totalSteps }) {
  const currentEvent = events.at(-1)
  const currentSelection = [...events].reverse().find((event) => event.type === 'select-variable')
  const recentEvents = events.slice(-7)

  return (
    <section className="panel explanation-panel" aria-labelledby="explanation-title">
      <header className="panel-heading">
        <div>
          <span className="panel-kicker">Step {stepIndex} / {totalSteps}</span>
          <h2 id="explanation-title">Solver Explanation</h2>
        </div>
        <span className="algorithm-chip">MRV + FC</span>
      </header>

      <div className="operation-box" aria-live="polite">
        <span className="field-label">Current operation</span>
        <p>{currentEvent ? formatSolverEvent(currentEvent) : 'Start the solver or advance one step to inspect its decisions.'}</p>
      </div>

      <div className="variable-summary">
        <div className="field-label">Current variable</div>
        <strong>{currentSelection?.cell ?? 'Not selected'}</strong>
        <div className="field-label domain-label">Domain</div>
        <div className="domain-values" aria-label="Current variable domain">
          {currentSelection?.domain.length ? currentSelection.domain.map((value) => (
            <span className="domain-value" key={value}>{value}</span>
          )) : <span className="muted-value">{currentSelection ? 'Empty domain' : 'Waiting for a selection'}</span>}
        </div>
      </div>

      <div className="pruned-list">
        <div className="field-label">Pruned candidates for {currentSelection?.cell ?? 'current cell'}</div>
        {currentSelection?.prunedCandidates.length ? (
          <ul>
            {currentSelection.prunedCandidates.map(({ value, reason }) => (
              <li key={value}><span>{value}</span><span>{reason}</span></li>
            ))}
          </ul>
        ) : <p className="empty-note">Candidates removed by row, column, and box constraints appear here.</p>}
      </div>

      <div className="event-history" aria-label="Recent solver events">
        <div className="field-label">Recent events</div>
        {recentEvents.length ? (
          <ol>
            {recentEvents.map((event, index) => (
              <li key={`${stepIndex - recentEvents.length + index}-${event.type}-${event.cell ?? ''}`}>
                <span className="event-marker" aria-hidden="true" />
                <span>{formatSolverEvent(event)}</span>
              </li>
            ))}
          </ol>
        ) : <p className="empty-note">Solver operations will be listed here as they occur.</p>}
      </div>
    </section>
  )
}

export default SolverExplanation