import {
  BrainCircuit,
  CircleAlert,
  CircleCheck,
  CircleDot,
  CornerDownLeft,
  Scissors,
  Search,
  Sparkles,
} from 'lucide-react'
import { formatSolverEvent } from '../utils/solverSteps.js'

const eventIcons = {
  'initial-domain-summary': Search,
  'node-explored': CircleDot,
  'select-variable': BrainCircuit,
  'calculate-domain': Search,
  'try-color': Search,
  'constraint-check': CircleCheck,
  'assign-color': CircleCheck,
  'forward-check': Search,
  'prune-color': Scissors,
  'reject-color': CircleAlert,
  conflict: CircleAlert,
  backtrack: CornerDownLeft,
  'remove-assignment': CornerDownLeft,
  'solution-found': Sparkles,
  'no-solution': CircleAlert,
}

function MapColoringActivity({ events, stepIndex, palette, graph }) {
  const currentEvent = events.at(-1)
  const focusVariable = ['backtrack', 'remove-assignment', 'reject-color', 'conflict', 'prune-color'].includes(currentEvent?.type)
    ? currentEvent.variable
    : null
  const selectionIndex = events.findLastIndex((event) =>
    event.type === 'select-variable' && (!focusVariable || event.variable === focusVariable),
  )
  const currentSelection = selectionIndex >= 0 ? events[selectionIndex] : null
  const followingEvents = events.slice(selectionIndex + 1)
  const currentAttempt = followingEvents.findLast((event) => event.type === 'try-color')
  const checkEvents = events.filter((event) =>
    event.type === 'constraint-check' && event.nodeId === currentAttempt?.nodeId,
  )
  const rejections = events.filter((event) => event.type === 'reject-color')
  const currentRejection = rejections.findLast((event) =>
    event.variable === currentAttempt?.variable
      && event.color === currentAttempt?.color
      && event.nodeId === currentAttempt?.nodeId,
  )
  const recentEvents = events.slice(-9).reverse()
  const domain = currentSelection?.domain ?? palette
  const status = currentEvent?.type === 'reject-color'
    ? 'Rejected'
    : currentEvent?.type === 'conflict'
      ? 'Dead end'
      : currentEvent?.type === 'assign-color'
        ? 'Assigned'
        : currentEvent?.type === 'backtrack' || currentEvent?.type === 'remove-assignment'
          ? 'Backtracking'
          : currentEvent?.type === 'solution-found'
            ? 'Solved'
            : currentAttempt
              ? checkEvents.length === 0 ? 'Testing' : checkEvents.at(-1).valid ? 'Valid' : 'Rejected'
              : 'Waiting'
  const assignedNeighborCount = currentAttempt?.assignedNeighbors?.length ?? 0
  const allChecksPassed = checkEvents.length === assignedNeighborCount
    && checkEvents.every((event) => event.valid)
  const decisionReason = currentRejection?.reason
    ?? (currentAttempt && (assignedNeighborCount === 0 || allChecksPassed)
      ? `No adjacent assigned region uses ${currentAttempt.color}.`
      : currentEvent?.type === 'backtrack'
        ? currentEvent.reason
        : currentEvent?.type === 'conflict'
          ? currentEvent.reason
          : 'Neighbor constraints are checked against the current assignments.')
  const whyVariable = currentSelection?.reason === 'MRV'
    ? `MRV selected Region ${currentSelection.variable} with ${currentSelection.domain.length} remaining legal colors.`
    : currentSelection
      ? `Basic backtracking selected the first unassigned region, ${currentSelection.variable}.`
      : 'The solver will choose a region after it starts.'

  return (
    <section className="panel map-activity-panel" aria-labelledby="map-activity-title">
      <header className="panel-heading">
        <div>
          <span className="panel-kicker">Step {stepIndex}</span>
          <h2 id="map-activity-title">Live Solver Activity</h2>
        </div>
        <span className="map-method-chip">MRV + Degree + FC</span>
      </header>

      <div className={`map-current-operation${currentEvent?.type === 'conflict' ? ' is-dead-end' : ''}${currentEvent?.type === 'backtrack' ? ' is-backtracking' : ''}`} aria-live="polite">
        {currentEvent && (() => {
          const Icon = eventIcons[currentEvent.type] ?? Search
          return <Icon size={19} aria-hidden="true" />
        })()}
        <div>
          <span className="field-label">{currentEvent?.type === 'conflict' ? 'DEAD END' : currentEvent?.type === 'backtrack' ? 'BACKTRACKING' : 'Current operation'}</span>
          <p>{currentEvent ? formatSolverEvent(currentEvent) : 'Start or step through the solver to inspect its actual choices.'}</p>
        </div>
      </div>

      <div className="map-activity-feed" aria-label="Recent map coloring events">
        {recentEvents.map((event, index) => {
          const Icon = eventIcons[event.type] ?? CircleDot
          return (
            <div className={index === 0 ? 'map-event is-active' : 'map-event'} key={`${stepIndex - index}-${event.type}-${event.nodeId ?? ''}`}>
              <span className={`map-event-icon event-${event.type}`}><Icon size={14} aria-hidden="true" /></span>
              <span>{formatSolverEvent(event)}</span>
            </div>
          )
        })}
      </div>

      <section className="map-decision-card" aria-labelledby="map-current-decision-title">
        <h3 id="map-current-decision-title">Current Decision</h3>
        <dl>
          <div><dt>Current region</dt><dd>{currentSelection?.variable ?? currentAttempt?.variable ?? '—'}</dd></div>
          <div><dt>Available colors</dt><dd>{domain.join(', ') || 'No legal colors'}</dd></div>
          <div><dt>Testing</dt><dd>{currentAttempt?.color ?? '—'}</dd></div>
          <div><dt>Status</dt><dd>{status}</dd></div>
          <div className="map-decision-reason"><dt>Reason</dt><dd>{decisionReason}</dd></div>
        </dl>
      </section>

      <section className="map-check-panel" aria-labelledby="map-check-title">
        <h3 id="map-check-title">Neighbor Constraint Checks</h3>
        {checkEvents.length ? (
          <ul>
            {checkEvents.map((event) => (
              <li className={event.valid ? 'is-valid' : 'is-invalid'} key={event.neighbor}>
                <span>Region {event.neighbor}: {event.neighborColor}</span>
                <strong>{event.valid ? '✓ Different' : '✗ Conflict'}</strong>
              </li>
            ))}
          </ul>
        ) : <p className="map-empty-note">Neighbor checks appear while a color is tested.</p>}
      </section>

      <div className="map-csp-model">
        <h3>CSP Model</h3>
        <p><strong>Variables:</strong> each region ({Object.keys(graph).join(', ')})</p>
        <p><strong>Domain:</strong> {`{${palette.join(', ')}}`}</p>
        <p><strong>Constraints:</strong> adjacent regions must have different colors.</p>
        <p>Each region is a variable. Each available color is a domain value. Edges represent constraints.</p>
        <p>{currentSelection?.degreeTieBreakApplied
          ? `Degree tie-break selected ${currentSelection.variable}, which has ${currentSelection.degree} unassigned neighbors.`
          : 'Equal MRV domains are broken by choosing the region with the most unassigned neighbors.'}</p>
      </div>

      <div className="map-why-panels">
        <section>
          <span className="field-label">Why was this color rejected?</span>
          <p>{currentRejection?.reason ?? 'A rejection will identify the adjacent region using the same color.'}</p>
        </section>
        <section>
          <span className="field-label">Why did the solver backtrack?</span>
          <p>{currentEvent?.type === 'backtrack'
            ? currentEvent.reason
            : 'The solver returns to the previous assignment only after a region has no remaining legal colors.'}</p>
        </section>
        <section>
          <span className="field-label">Variable selection</span>
          <p>{whyVariable}</p>
        </section>
      </div>
    </section>
  )
}

export default MapColoringActivity