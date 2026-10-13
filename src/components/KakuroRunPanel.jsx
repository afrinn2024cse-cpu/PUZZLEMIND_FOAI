import { useMemo } from 'react'
import { getKakuroRunStates } from '../puzzles/kakuro/kakuroSolver.js'
import { buildKakuroViewState } from '../puzzles/kakuro/kakuroViewState.js'

function KakuroRunPanel({ puzzle, events }) {
  const view = useMemo(() => buildKakuroViewState(puzzle, events), [puzzle, events])
  const runs = useMemo(
    () => getKakuroRunStates(view.parsed, view.assignments, view.domains),
    [view],
  )
  const selected = [...events].reverse().find((event) => event.type === 'select-cell')?.variable
  const activeRunIds = new Set(selected ? view.parsed.runsByVariable[selected].map((run) => run.id) : [])

  return (
    <section className="panel kakuro-run-panel" aria-labelledby="kakuro-runs-title">
      <header className="panel-heading">
        <div>
          <span className="panel-kicker">Across and down sum constraints</span>
          <h2 id="kakuro-runs-title">Run Constraints</h2>
        </div>
      </header>
      <div className="kakuro-run-list">
        {runs.map((run) => (
          <article className={activeRunIds.has(run.id) ? 'kakuro-run is-active' : 'kakuro-run'} key={run.id}>
            <header>
              <strong>{run.direction === 'across' ? 'Across' : 'Down'} {run.clue}</strong>
              <span>{run.remainingCells} remaining</span>
            </header>
            <div className="run-cell-list">Cells: {run.cells.join(' · ')}</div>
            <div className="run-equation">
              Current: {run.cells.map((variable) => view.assignments[variable] ?? '?').join(' + ')} = {run.currentSum}
            </div>
            <div className="run-remaining">
              Remaining sum: <strong>{run.remainingSum}</strong>
              {run.remainingCells > 0 && <span> across {run.remainingCells} cells</span>}
            </div>
            <div className="run-combinations">
              <span>Possible:</span>
              {run.remainingCells === 0
                ? run.remainingSum === 0 ? ' Complete' : ' Invalid sum'
                : run.possibleCombinations.length
                  ? run.possibleCombinations.slice(0, 4).map((combination) => (
                    <code key={combination.join('-')}>{`{${combination.join(', ')}}`}</code>
                  ))
                  : <em>No feasible combination</em>}
              {run.possibleCombinations.length >= 16 && <small>More combinations</small>}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default KakuroRunPanel