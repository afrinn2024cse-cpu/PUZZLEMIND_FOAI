import {
  CircleAlert,
  CircleCheck,
  CircleDot,
  CornerDownLeft,
  Search,
  Scissors,
  Sigma,
  Sparkles,
} from 'lucide-react'
import { formatSolverEvent } from '../utils/solverSteps.js'

const icons = {
  'node-explored': CircleDot,
  'select-cell': Search,
  'calculate-domain': Search,
  'try-digit': Search,
  'assign-digit': CircleCheck,
  'sum-check': Sigma,
  'duplicate-check': CircleCheck,
  'prune-digit': Scissors,
  'domain-reduction': Scissors,
  conflict: CircleAlert,
  backtrack: CornerDownLeft,
  'remove-assignment': CornerDownLeft,
  'solution-found': Sparkles,
}

function KakuroActivity({ events, stepIndex }) {
  const currentEvent = events.at(-1)
  const focusVariable = ['backtrack', 'remove-assignment', 'prune-digit', 'conflict'].includes(currentEvent?.type)
    ? currentEvent.variable
    : null
  const selection = [...events].reverse().find((event) =>
    event.type === 'select-cell' && (!focusVariable || event.variable === focusVariable),
  )
  const followingEvents = selection
    ? events.slice(events.lastIndexOf(selection) + 1)
    : events
  const attempt = followingEvents.findLast((event) => event.type === 'try-digit')
  const attemptEvents = events.filter((event) =>
    event.nodeId === attempt?.nodeId
      && event.variable === attempt?.variable
      && (event.value === attempt?.value || event.digit === attempt?.value),
  )
  const rejection = [...attemptEvents].reverse().find((event) => event.type === 'prune-digit')
  const sumChecks = attemptEvents.filter((event) => event.type === 'sum-check')
  const duplicateChecks = attemptEvents.filter((event) => event.type === 'duplicate-check')
  const domain = selection?.domain ?? []
  const status = currentEvent?.type === 'prune-digit' || currentEvent?.type === 'conflict'
    ? 'Rejected'
    : currentEvent?.type === 'assign-digit'
      ? 'Assigned'
      : currentEvent?.type === 'backtrack' || currentEvent?.type === 'remove-assignment'
        ? 'Backtracking'
        : currentEvent?.type === 'solution-found'
          ? 'Solved'
          : attempt
            ? sumChecks.some((event) => !event.possible) ? 'Rejected' : 'Valid'
            : 'Waiting'
  const reason = rejection?.reason
    ?? (currentEvent?.type === 'backtrack'
      ? currentEvent.reason
      : sumChecks.at(-1)
        ? `${sumChecks.at(-1).direction} run has ${sumChecks.at(-1).remainingSum} remaining for ${sumChecks.at(-1).remainingCells} cells.`
        : attempt
          ? `${duplicateChecks.length} duplicate checks and ${sumChecks.length} sum checks passed so far.`
          : 'Each candidate is checked against both intersecting runs.')
  const recentEvents = events.slice(-10).reverse()

  return (
    <section className="panel kakuro-activity" aria-labelledby="kakuro-activity-title">
      <header className="panel-heading">
        <div>
          <span className="panel-kicker">Step {stepIndex}</span>
          <h2 id="kakuro-activity-title">Live Solver Activity</h2>
        </div>
        <span className="kakuro-heuristic-chip">MRV + Degree + FC</span>
      </header>

      <div className={`kakuro-current-operation${currentEvent?.type === 'conflict' ? ' is-dead-end' : ''}${currentEvent?.type === 'backtrack' ? ' is-backtracking' : ''}`} aria-live="polite">
        {currentEvent && (() => {
          const Icon = icons[currentEvent.type] ?? Search
          return <Icon size={19} aria-hidden="true" />
        })()}
        <div>
          <span className="field-label">{currentEvent?.type === 'conflict' ? 'DEAD END' : currentEvent?.type === 'backtrack' ? 'BACKTRACKING' : 'Current operation'}</span>
          <p>{currentEvent ? formatSolverEvent(currentEvent) : 'Start or step through Kakuro search to inspect each candidate.'}</p>
        </div>
      </div>

      <div className="kakuro-event-feed" aria-label="Recent Kakuro solver events">
        {recentEvents.map((event, index) => {
          const Icon = icons[event.type] ?? CircleDot
          return (
            <div className={index === 0 ? 'kakuro-event is-active' : 'kakuro-event'} key={`${stepIndex - index}-${event.type}-${event.nodeId ?? ''}`}>
              <span className={`kakuro-event-icon event-${event.type}`}><Icon size={14} aria-hidden="true" /></span>
              <span>{formatSolverEvent(event)}</span>
            </div>
          )
        })}
      </div>

      <section className="kakuro-decision" aria-labelledby="kakuro-decision-title">
        <h3 id="kakuro-decision-title">Current Decision</h3>
        <dl>
          <div><dt>Current cell</dt><dd>{selection?.variable ?? attempt?.variable ?? '—'}</dd></div>
          <div><dt>Current domain</dt><dd>{domain.length ? `{${domain.join(', ')}}` : '—'}</dd></div>
          <div><dt>Testing</dt><dd>{attempt?.value ?? '—'}</dd></div>
          <div><dt>Status</dt><dd>{status}</dd></div>
          <div className="kakuro-decision-reason"><dt>Reason</dt><dd>{reason}</dd></div>
        </dl>
      </section>

      <section className="kakuro-check-summary">
        <h3>Constraint Checks for {attempt?.variable ?? 'current cell'}</h3>
        <div><strong>{duplicateChecks.length}</strong> uniqueness checks</div>
        <div><strong>{sumChecks.length}</strong> sum checks</div>
        {sumChecks.slice(-2).map((check, index) => (
          <p className={check.possible ? 'is-feasible' : 'is-infeasible'} key={`${check.runId}-${check.variable}-${check.digit}-${index}`}>
            {check.direction} {check.clue}: {check.remainingSum} left for {check.remainingCells} cells
            {check.possible ? ' ✓' : ' ✗'}
          </p>
        ))}
      </section>

      <div className="kakuro-explanations">
        <section>
          <span className="field-label">Why was this digit rejected?</span>
          <p>{rejection?.reason ?? 'A rejected digit will show the exact duplicate or remaining-sum constraint.'}</p>
        </section>
        <section>
          <span className="field-label">Why did the solver backtrack?</span>
          <p>{currentEvent?.type === 'backtrack'
            ? currentEvent.reason
            : 'The solver returns to its previous assignment when a cell has no legal digit.'}</p>
        </section>
        <section>
          <span className="field-label">Why was this cell selected?</span>
          <p>{selection?.why ?? 'MRV chooses the unassigned cell with the fewest legal digits; run degree breaks ties.'}</p>
        </section>
      </div>
    </section>
  )
}

export default KakuroActivity