import { formatSolverEvent, describeTimelineEvent } from '../utils/solverSteps.js'

const MAX_VISIBLE_STEPS = 60

function SolverTimeline({ events, stepIndex, onJumpToStep }) {
  const startIndex = Math.max(0, events.length - MAX_VISIBLE_STEPS)
  const recentEvents = events.slice(startIndex)

  return (
    <details className="panel collapsible-panel timeline-panel">
      <summary>
        <span>
          <span className="panel-kicker">{events.length} processed operations</span>
          <strong>Solver Timeline</strong>
        </span>
        <span className="collapse-hint">Expand timeline</span>
      </summary>
      <div className="timeline-content">
        <p className="panel-note">
          {events.length > MAX_VISIBLE_STEPS
            ? `Showing the latest ${MAX_VISIBLE_STEPS} of ${events.length} processed steps.`
            : 'Select a step to inspect that exact point in the solver trace.'}
        </p>
        {recentEvents.length ? (
          <ol className="timeline-list">
            {recentEvents.map((event, index) => {
              const eventStep = startIndex + index + 1
              const active = eventStep === stepIndex
              return (
                <li className={active ? 'is-active' : ''} key={`${eventStep}-${event.type}-${event.cell ?? ''}`}>
                  <button type="button" onClick={() => onJumpToStep(eventStep)} aria-current={active ? 'step' : undefined}>
                    <span className="timeline-step">Step {eventStep}</span>
                    <strong>{describeTimelineEvent(event)}</strong>
                    <span className="timeline-detail">{formatSolverEvent(event)}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        ) : <p className="empty-note">Solver steps will appear here.</p>}
      </div>
    </details>
  )
}

export default SolverTimeline