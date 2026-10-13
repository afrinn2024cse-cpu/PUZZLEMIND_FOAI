import { ArrowDown, Check, Filter, GitBranch, Search, Sparkles } from 'lucide-react'
import { buildKakuroViewState } from '../puzzles/kakuro/kakuroViewState.js'
import { summarizeKakuroEvents } from '../puzzles/kakuro/kakuroSolver.js'

function KakuroSearchSpace({ puzzle, events }) {
  const view = buildKakuroViewState(puzzle, events)
  const stats = summarizeKakuroEvents(events)
  const initialValues = view.parsed.variables.length * 9
  const remainingValues = Object.values(view.domains).reduce((total, domain) => total + domain.length, 0)
  const currentCell = [...events].reverse().find((event) => event.type === 'select-cell')
  const solved = events.some((event) => event.type === 'solution-found')
  const stages = [
    { title: 'Initial candidates', value: `${initialValues} values`, Icon: Search },
    { title: 'MRV', value: currentCell ? `${currentCell.variable} · ${currentCell.domain.length} digits` : 'Awaiting search', Icon: GitBranch },
    { title: 'Duplicate rules', value: `${stats.duplicateChecks} checks`, Icon: Filter },
    { title: 'Sum constraints', value: `${stats.sumChecks} checks`, Icon: Check },
    { title: 'Forward checking', value: `${stats.digitsPruned} pruned · ${remainingValues} remain`, Icon: ArrowDown },
    { title: 'Solution', value: solved ? 'Kakuro solved' : 'In progress', Icon: Sparkles },
  ]

  return (
    <section className="panel kakuro-search-space" aria-labelledby="kakuro-search-space-title">
      <header className="panel-heading">
        <div>
          <span className="panel-kicker">Live counts from domains and solver events</span>
          <h2 id="kakuro-search-space-title">Search Space Reduction</h2>
        </div>
        <span className="kakuro-space-count">{remainingValues} / {initialValues} candidate values remain</span>
      </header>
      <ol>
        {stages.map(({ title, value, Icon }, index) => (
          <li key={title}>
            <span><Icon size={15} aria-hidden="true" /></span>
            <strong>{title}</strong>
            <em>{value}</em>
            {index < stages.length - 1 && <i aria-hidden="true">↓</i>}
          </li>
        ))}
      </ol>
    </section>
  )
}

export default KakuroSearchSpace