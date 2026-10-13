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
  'try-value': Search,
  'check-constraint': CircleCheck,
  'assign-value': CircleCheck,
  'forward-check': Search,
  'prune-value': Scissors,
  conflict: CircleAlert,
  backtrack: CornerDownLeft,
  'solution-found': Sparkles,
}

function getCurrentVariable(events) {
  const latestEvent = events.at(-1)
  let selection = null
  let selectedAt = -1
  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (events[index].type === 'select-variable') {
      selection = events[index]
      selectedAt = index
      break
    }
  }
  if (latestEvent?.type === 'backtrack') {
    for (let index = events.length - 1; index >= 0; index -= 1) {
      if (events[index].type === 'select-variable' && events[index].cell === latestEvent.cell) {
        selection = events[index]
        selectedAt = index
        break
      }
    }
  } else if (latestEvent?.type === 'conflict' && latestEvent.reason === 'empty domain') {
    selection = {
      ...latestEvent,
      reason: 'forward-checking',
      domain: latestEvent.domain ?? [],
      beforeDomain: latestEvent.beforeDomain ?? [],
      prunedCandidates: latestEvent.prunedCandidates ?? [],
    }
    selectedAt = events.length - 1
  }
  if (!selection) return null

  const relatedEvents = events.slice(selectedAt + 1)
  const selectedValue = relatedEvents.findLast(
    (event) => event.type === 'try-value' && event.cell === selection.cell,
  )
  const constraintResults = { row: null, column: null, box: null }
  for (const event of relatedEvents) {
    if (
      event.type === 'check-constraint'
      && event.cell === selection.cell
      && event.nodeId === selectedValue?.nodeId
    ) {
      constraintResults[event.constraint] = event.valid
    }
  }
  const statusEvent = relatedEvents.findLast((event) =>
    event.cell === selection.cell && ['try-value', 'check-constraint', 'assign-value', 'conflict', 'backtrack'].includes(event.type),
  )
  const status = latestEvent?.type === 'conflict' && latestEvent.reason === 'empty domain'
    ? 'Dead end'
    : statusEvent?.type === 'backtrack'
    ? 'Backtracking'
    : statusEvent?.type === 'conflict'
      ? 'Dead end'
      : statusEvent?.type === 'assign-value'
        ? 'Assigned'
        : selectedValue
          ? 'Testing'
          : 'Selected'

  return { selection, selectedValue, constraintResults, status }
}

function LiveSolverActivity({ events, stepIndex, explanationMode, onExplanationModeChange }) {
  const currentEvent = events.at(-1)
  const currentVariable = getCurrentVariable(events)
  const recentEvents = events.slice(-9).reverse()
  const isDeadEnd = currentEvent?.type === 'conflict'
  const latestCheck = currentEvent?.type === 'check-constraint' ? currentEvent : null
  const prune = currentVariable?.selection.prunedCandidates ?? []
  const selectedDomain = currentVariable?.selection.domain ?? []
  const domainDecision = currentVariable?.selection.reason === 'MRV'
    ? `MRV selected ${currentVariable.selection.cell} because it has the smallest remaining domain.`
    : currentVariable?.selection.reason === 'forward-checking'
      ? `Forward checking detected that ${currentVariable.selection.cell} has no legal values after this assignment.`
      : `Basic backtracking selected the first unassigned cell, ${currentVariable?.selection.cell ?? 'none'}.`

  return (
    <section className="panel live-activity-panel" aria-labelledby="live-activity-title">
      <header className="panel-heading">
        <div>
          <span className="panel-kicker">Step {stepIndex}</span>
          <h2 id="live-activity-title">Live Solver Activity</h2>
        </div>
        <label className="learning-toggle">
          <span>Learning Mode</span>
          <input
            type="checkbox"
            role="switch"
            checked={explanationMode}
            onChange={(event) => onExplanationModeChange(event.target.checked)}
          />
          <span className="toggle-state">{explanationMode ? 'ON' : 'OFF'}</span>
        </label>
      </header>

      <div className={`activity-current${isDeadEnd ? ' is-dead-end' : ''}${currentEvent?.type === 'backtrack' ? ' is-backtracking' : ''}`} aria-live="polite">
        {currentEvent && (() => {
          const Icon = eventIcons[currentEvent.type] ?? Search
          return <Icon size={18} aria-hidden="true" />
        })()}
        <div>
          <span className="field-label">
            {isDeadEnd ? 'DEAD END' : currentEvent?.type === 'backtrack' ? 'BACKTRACKING' : currentEvent?.type === 'solution-found' ? 'SOLVED' : 'Current operation'}
          </span>
          <p>{currentEvent ? formatSolverEvent(currentEvent) : 'Start or step through the solver to see its decisions.'}</p>
        </div>
      </div>

      <div className="activity-feed" aria-label="Recent live solver activity">
        {recentEvents.map((event, index) => {
          const Icon = eventIcons[event.type] ?? Search
          return (
            <div className={index === 0 ? 'activity-item is-active' : 'activity-item'} key={`${stepIndex - index}-${event.type}-${event.cell ?? ''}`}>
              <span className={`activity-icon activity-${event.type}`}><Icon size={14} aria-hidden="true" /></span>
              <span>{formatSolverEvent(event)}</span>
            </div>
          )
        })}
      </div>

      <div className="insight-grid">
        <section className="insight-card" aria-labelledby="current-variable-title">
          <h3 id="current-variable-title">Current Variable</h3>
          <dl className="variable-fields">
            <div><dt>Cell</dt><dd>{currentVariable?.selection.cell ?? 'Waiting'}</dd></div>
            <div><dt>Domain</dt><dd className="insight-domains">
              {selectedDomain.length
                ? selectedDomain.map((value) => <span className="domain-value" key={value}>{value}</span>)
                : currentVariable ? <span className="empty-domain-label">Empty</span> : '—'}
            </dd></div>
            <div><dt>Selected</dt><dd>{currentVariable?.selectedValue?.value ?? '—'}</dd></div>
            <div><dt>Status</dt><dd>{currentVariable?.status ?? 'Idle'}</dd></div>
          </dl>
          <p className="why-copy"><strong>Why was this cell selected?</strong>{' '}{domainDecision}</p>
        </section>

        <section className="insight-card constraint-card" aria-labelledby="constraint-title">
          <h3 id="constraint-title">Constraint Check</h3>
          <ul>
            {['row', 'column', 'box'].map((constraint) => {
              const result = currentVariable?.constraintResults[constraint]
              const isCurrent = latestCheck?.constraint === constraint
              return (
                <li className={isCurrent ? 'constraint-current' : ''} key={constraint}>
                  <span>{constraint === 'box' ? '3×3 box' : constraint[0].toUpperCase() + constraint.slice(1)}</span>
                  <strong aria-label={result === null || result === undefined ? 'Not checked' : result ? 'Passed' : 'Failed'}>
                    {result === null || result === undefined ? '—' : result ? '✓' : '✗'}
                  </strong>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      <section className="pruning-card" aria-labelledby="candidate-pruning-title">
        <div className="pruning-heading">
          <h3 id="candidate-pruning-title">Candidate Pruning</h3>
          {currentVariable && <span>{currentVariable.selection.cell}</span>}
        </div>
        {currentVariable ? (
          <>
            <div className="candidate-stage">
              <span>Before</span>
              <code>{`{${currentVariable.selection.beforeDomain.join(', ')}}`}</code>
            </div>
            <div className="candidate-stage">
              <span>After constraints</span>
              <code>{`{${selectedDomain.join(', ')}}`}</code>
            </div>
            <div className="pruned-values">
              <span className="field-label">Pruned</span>
              {prune.length ? prune.map(({ value, reason }) => (
                <span className="pruned-value" key={value}>{value}<small>{reason}</small></span>
              )) : <span className="muted-value">No candidates pruned from this cell.</span>}
            </div>
          </>
        ) : <p className="empty-note">Candidate domains appear after the first variable selection.</p>}
      </section>

      {explanationMode && currentEvent && (
        <section className="learning-explanation" aria-label="Detailed explanation">
          <span className="field-label">Why?</span>
          <p>{domainDecision}</p>
          <span className="field-label">What?</span>
          <p>{currentVariable
            ? `${currentVariable.selection.cell} currently has ${selectedDomain.length} legal value${selectedDomain.length === 1 ? '' : 's'}.`
            : formatSolverEvent(currentEvent)}</p>
          <span className="field-label">Action / result</span>
          <p>{formatSolverEvent(currentEvent)}</p>
          <span className="field-label">Constraint</span>
          <p>{currentEvent.type === 'check-constraint'
            ? `${currentEvent.value} ${currentEvent.valid ? 'passes' : 'fails'} the ${currentEvent.constraint} constraint.`
            : currentVariable?.selectedValue
              ? `Row, column, and 3×3 box results are shown above for ${currentVariable.selectedValue.value}.`
              : 'Constraint results appear when a candidate is tested.'}</p>
        </section>
      )}
    </section>
  )
}

export default LiveSolverActivity