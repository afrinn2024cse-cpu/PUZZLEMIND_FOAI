import { useMemo } from 'react'
import { buildKakuroViewState } from '../puzzles/kakuro/kakuroViewState.js'

function KakuroDomainPanel({ puzzle, events }) {
  const state = useMemo(() => buildKakuroViewState(puzzle, events), [puzzle, events])
  const assigned = Object.keys(state.assignments).length

  return (
    <section className="panel kakuro-domain-panel" aria-labelledby="kakuro-domains-title">
      <header className="panel-heading">
        <div>
          <span className="panel-kicker">{assigned} of {state.parsed.variables.length} cells assigned</span>
          <h2 id="kakuro-domains-title">Cell Domains</h2>
        </div>
      </header>
      <ul className="kakuro-domain-list">
        {state.parsed.variables.map(({ id }) => {
          const digit = state.assignments[id]
          const domain = state.domains[id] ?? []
          return (
            <li className={digit === undefined ? '' : 'is-assigned'} key={id}>
              <strong>{id}</strong>
              <span>{digit === undefined ? `{${domain.join(', ')}}` : `= ${digit}`}</span>
              {state.backtracked.has(id) && digit === undefined && <small>Backtracked</small>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default KakuroDomainPanel