import {
  ArrowDownLeft,
  Check,
  CircleAlert,
  CircleCheck,
  CircleDot,
  Crown,
  Search,
  X,
} from 'lucide-react'

function eventMessage(event) {
  switch (event.type) {
    case 'node-explored': return `Exploring search depth ${event.depth}.`
    case 'select-variable': return `Selecting column ${event.column}.`
    case 'try-value': return `Trying row ${event.row} in column ${event.column}.`
    case 'check-constraint': return `${event.constraint[0].toUpperCase()}${event.constraint.slice(1)} constraint ${event.valid ? 'passed' : 'failed'}.`
    case 'place-queen': return `Queen placed at column ${event.column}, row ${event.row}.`
    case 'reject-value': return `Position rejected: ${event.reason}.`
    case 'conflict': return event.reason.startsWith('no valid row')
      ? `Dead end detected: ${event.reason}.`
      : `Conflict detected: ${event.reason}.`
    case 'backtrack': return `Backtracking from column ${event.column}, row ${event.row}.`
    case 'remove-queen': return `Removed queen from column ${event.column}, row ${event.row}.`
    case 'solution-skipped': return `Continuing search after solution ${event.solutionNumber}.`
    case 'solution-found': return `Solution ${event.solutionNumber} found.`
    case 'no-solution': return event.reason
    case 'invalid-puzzle': return event.reason
    default: return event.type
  }
}

const eventIcons = {
  'node-explored': CircleDot,
  'select-variable': Search,
  'try-value': Search,
  'check-constraint': CircleCheck,
  'place-queen': Crown,
  'reject-value': X,
  conflict: CircleAlert,
  backtrack: ArrowDownLeft,
  'remove-queen': X,
  'solution-found': Check,
}

function NQueensActivity({ events, stepIndex, size }) {
  const currentEvent = events.at(-1)
  const recentEvents = events.slice(-9).reverse()
  const focusColumn = ['backtrack', 'remove-queen', 'reject-value', 'conflict'].includes(currentEvent?.type)
    ? currentEvent.column
    : null
  const selectionIndex = events.findLastIndex((event) =>
    event.type === 'select-variable' && (focusColumn === null || event.column === focusColumn),
  )
  const currentSelection = selectionIndex >= 0 ? events[selectionIndex] : null
  const currentAttempt = events
    .slice(selectionIndex + 1)
    .findLast((event) => event.type === 'try-value')
  const sameAttempt = events.filter((event) =>
    event.nodeId && currentAttempt?.nodeId === event.nodeId,
  )
  const checks = { row: null, diagonal: null, column: null }
  for (const event of sameAttempt) {
    if (event.type === 'check-constraint') checks[event.constraint] = event.valid
  }

  const latestRejection = [...events].reverse().find((event) =>
    event.type === 'reject-value'
      && event.column === currentAttempt?.column
      && event.row === currentAttempt?.row,
  )
  const latestDeadEnd = [...events].reverse().find((event) =>
    event.type === 'conflict' && event.reason.startsWith('no valid row'),
  )
  const status = currentEvent?.type === 'reject-value'
    ? 'Rejected'
    : currentEvent?.type === 'place-queen'
      ? 'Placed'
        : currentEvent?.type === 'backtrack' || currentEvent?.type === 'remove-queen'
        ? 'Backtracking'
        : currentEvent?.type === 'conflict'
          ? 'Dead end'
          : currentEvent?.type === 'solution-found'
            ? 'Solved'
            : currentAttempt
              ? 'Testing'
              : 'Waiting'

  const rejectionReason = latestRejection
    ? latestRejection.reason === 'row conflict'
      ? `Row ${latestRejection.row} conflicts with the queen at C${latestRejection.conflictingQueen.column}, R${latestRejection.conflictingQueen.row}.`
      : `Position C${latestRejection.column}, R${latestRejection.row} lies on the same diagonal as C${latestRejection.conflictingQueen.column}, R${latestRejection.conflictingQueen.row}.`
    : 'A rejected position will show its conflicting queen here.'
  const backtrackReason = currentEvent?.type === 'backtrack'
    ? `${latestDeadEnd?.reason ?? `The next column had no remaining valid row`}, so the search returns to column ${currentEvent.column}.`
    : 'The solver backtracks only after a deeper column has no legal row.'

  return (
    <section className="panel nqueens-activity" aria-labelledby="nqueens-activity-title">
      <header className="panel-heading">
        <div>
          <span className="panel-kicker">Step {stepIndex}</span>
          <h2 id="nqueens-activity-title">Live Solver Activity</h2>
        </div>
        <span className="nqueens-method-chip">Backtracking</span>
      </header>

      <div className={`nqueens-current-operation${currentEvent?.type === 'conflict' ? ' is-dead-end' : ''}${currentEvent?.type === 'backtrack' ? ' is-backtracking' : ''}`} aria-live="polite">
        {currentEvent && (() => {
          const Icon = eventIcons[currentEvent.type] ?? Search
          return <Icon size={19} aria-hidden="true" />
        })()}
        <div>
          <span className="field-label">
            {currentEvent?.type === 'conflict' ? 'DEAD END' : currentEvent?.type === 'backtrack' ? 'BACKTRACKING' : 'Current operation'}
          </span>
          <p>{currentEvent ? eventMessage(currentEvent) : 'Start or step through the search to inspect each position.'}</p>
        </div>
      </div>

      <div className="nqueens-activity-feed" aria-label="Recent N-Queens events">
        {recentEvents.map((event, index) => {
          const Icon = eventIcons[event.type] ?? CircleDot
          return (
            <div className={index === 0 ? 'nqueens-event is-active' : 'nqueens-event'} key={`${stepIndex - index}-${event.type}-${event.nodeId ?? ''}`}>
              <span className={`nqueens-event-icon event-${event.type}`}><Icon size={14} aria-hidden="true" /></span>
              <span>{eventMessage(event)}</span>
            </div>
          )
        })}
      </div>

      <section className="nqueens-decision-card" aria-labelledby="decision-title">
        <h3 id="decision-title">Current Decision</h3>
        <dl>
            <div><dt>Current column</dt><dd>{currentSelection?.column ?? currentAttempt?.column ?? currentEvent?.column ?? '—'}</dd></div>
          <div><dt>Candidate row</dt><dd>{currentAttempt?.row ?? '—'}</dd></div>
          <div><dt>Status</dt><dd>{status}</dd></div>
          <div><dt>Reason</dt><dd>{latestRejection?.reason ?? (currentEvent?.type === 'conflict' ? currentEvent.reason : '—')}</dd></div>
        </dl>
      </section>

      <section className="nqueens-checks" aria-labelledby="nqueens-checks-title">
        <h3 id="nqueens-checks-title">Constraint Check</h3>
        <ul>
          {['row', 'diagonal', 'column'].map((constraint) => (
            <li key={constraint}>
              <span>{constraint === 'column' ? 'One queen per column' : `${constraint[0].toUpperCase()}${constraint.slice(1)} constraint`}</span>
              <strong aria-label={checks[constraint] === null ? 'Not checked' : checks[constraint] ? 'Passed' : 'Failed'}>
                {checks[constraint] === null ? '—' : checks[constraint] ? '✓' : '✗'}
              </strong>
            </li>
          ))}
        </ul>
      </section>

      <div className="nqueens-csp-model">
        <h3>CSP Model</h3>
        <p><strong>Variables:</strong> each of the {size} columns</p>
        <p><strong>Domain:</strong> rows 1 through {size}</p>
        <p><strong>Constraints:</strong> one queen per column, no shared rows or diagonals</p>
      </div>

      <div className="nqueens-explanations">
        <section>
          <span className="field-label">Why was this position rejected?</span>
          <p>{latestRejection ? rejectionReason : 'The row and diagonal checks identify a real attacking queen before rejecting a square.'}</p>
        </section>
        <section>
          <span className="field-label">Why did the algorithm backtrack?</span>
          <p>{backtrackReason}</p>
        </section>
      </div>
    </section>
  )
}

export default NQueensActivity