import { useMemo } from 'react'
import { CircleAlert, Sigma } from 'lucide-react'
import { buildKakuroViewState } from '../puzzles/kakuro/kakuroViewState.js'

function KakuroGrid({ puzzle, events }) {
  const state = useMemo(() => buildKakuroViewState(puzzle, events), [puzzle, events])
  const currentEvent = events.at(-1)
  const selectedVariable = ['backtrack', 'remove-assignment', 'conflict', 'prune-digit'].includes(currentEvent?.type)
    ? currentEvent.variable
    : [...events].reverse().find((event) => event.type === 'select-cell')?.variable
  const attempt = [...events].reverse().find((event) => event.type === 'try-digit')
  const rejected = new Map()
  for (const event of events) {
    if (event.type === 'prune-digit') rejected.set(`${event.variable}:${event.value}`, event)
    if (event.type === 'try-digit') rejected.delete(`${event.variable}:${event.value}`)
    if (event.type === 'assign-digit') {
      for (const rejectedVariable of [...rejected.keys()]) {
        if (rejectedVariable.startsWith(`${event.variable}:`)) rejected.delete(rejectedVariable)
      }
    }
  }
  const activeRuns = selectedVariable
    ? new Set(state.parsed.runsByVariable[selectedVariable].map((run) => run.id))
    : new Set()
  const solved = currentEvent?.type === 'solution-found'

  return (
    <div className="kakuro-board-wrap">
      <div
        className="kakuro-grid"
        role="grid"
        aria-label={`${state.parsed.height} by ${state.parsed.width} Kakuro grid`}
        style={{ '--kakuro-columns': state.parsed.width }}
      >
        {puzzle.grid.flatMap((row, rowIndex) => row.map((cell, columnIndex) => {
          if (cell.type === 'black') {
            const acrossRun = state.parsed.runs.find((run) => run.clueRow === rowIndex && run.clueColumn === columnIndex && run.direction === 'across')
            const downRun = state.parsed.runs.find((run) => run.clueRow === rowIndex && run.clueColumn === columnIndex && run.direction === 'down')
            return (
              <div className="kakuro-black-cell" role="gridcell" aria-label={`Black clue${cell.across ? ` across ${cell.across}` : ''}${cell.down ? ` down ${cell.down}` : ''}`} key={`${rowIndex}:${columnIndex}`}>
                <span className={`kakuro-down-clue${downRun && activeRuns.has(downRun.id) ? ' is-active' : ''}`}><Sigma size={9} aria-hidden="true" />{cell.down ?? ''}</span>
                <span className={`kakuro-across-clue${acrossRun && activeRuns.has(acrossRun.id) ? ' is-active' : ''}`}>{cell.across ?? ''}</span>
              </div>
            )
          }

          const variable = cell.id
          const value = state.assignments[variable]
          const candidate = attempt?.variable === variable ? attempt.value : null
          const lastReject = [...rejected.values()].findLast((event) => event.variable === variable)
          const classes = ['kakuro-white-cell']
          if (selectedVariable === variable) classes.push('is-selected')
          if (state.parsed.runsByVariable[variable].some((run) => activeRuns.has(run.id))) classes.push('is-active-run-cell')
          if (state.backtracked.has(variable) && value === undefined) classes.push('is-backtracked')
          if (lastReject) classes.push('is-rejected')
          if (solved && value !== undefined) classes.push('is-solved')

          return (
            <div
              aria-label={`${variable}${value === undefined ? '' : ` equals ${value}`}${selectedVariable === variable ? ', selected' : ''}${lastReject ? `, rejected: ${lastReject.reason}` : ''}`}
              className={classes.join(' ')}
              key={`${rowIndex}:${columnIndex}`}
              role="gridcell"
            >
              {value !== undefined
                ? <strong className="kakuro-value">{value}</strong>
                : candidate !== null
                  ? <span className="kakuro-candidate">{candidate}</span>
                  : selectedVariable === variable
                    ? <span className="kakuro-cell-domain">{state.domains[variable].join(' ')}</span>
                    : null}
              {lastReject && <CircleAlert className="kakuro-cell-alert" size={13} aria-hidden="true" />}
            </div>
          )
        }))}
      </div>
      <ul className="kakuro-board-legend" aria-label="Kakuro board states">
        <li><span className="kakuro-legend-clue" />Black sum clue</li>
        <li><span className="kakuro-legend-current" />Current cell / run</li>
        <li><span className="kakuro-legend-rejected" />Rejected candidate</li>
        <li><span className="kakuro-legend-solved" />Assigned digit</li>
      </ul>
    </div>
  )
}
export default KakuroGrid