import { ArrowDown, Check, Filter, GitBranch, Search, Sparkles } from 'lucide-react'
import { calculateCandidateReduction, summarizeSolverEvents } from '../utils/solverSteps.js'

function SearchSpaceReduction({ events, comparisonRuns }) {
  const initial = events.find((event) => event.type === 'initial-domain-summary')
  const selection = [...events].reverse().find((event) => event.type === 'select-variable')
  const statistics = summarizeSolverEvents(events)
  const basicCount = comparisonRuns.basic?.statistics.candidatesTested
  const enhancedCount = comparisonRuns['mrv-forward']?.statistics.candidatesTested
  const measuredReduction = calculateCandidateReduction(basicCount, enhancedCount)
  const filterPercent = initial?.candidateSlots
    ? ((initial.candidateSlots - initial.legalCandidateCount) / initial.candidateSlots) * 100
    : null

  const stages = [
    { title: 'Initial candidates', value: initial ? `${initial.candidateSlots} slots` : 'Awaiting run', Icon: Search },
    { title: 'Constraint filtering', value: initial ? `${initial.legalCandidateCount} legal${filterPercent === null ? '' : ` · ${filterPercent.toFixed(1)}% removed`}` : 'Awaiting run', Icon: Filter },
    { title: 'MRV selection', value: selection ? `${selection.cell} · domain ${selection.domain.length}` : 'Awaiting selection', Icon: GitBranch },
    { title: 'Forward checking', value: `${statistics.candidatesPruned} candidates pruned`, Icon: Check },
    { title: 'Candidate trials', value: `${statistics.candidatesTested} tested`, Icon: ArrowDown },
    { title: 'Solution', value: events.some((event) => event.type === 'solution-found') ? 'Found' : 'In progress', Icon: Sparkles },
  ]

  return (
    <section className="panel search-space-panel" aria-labelledby="search-space-title">
      <header className="panel-heading">
        <div>
          <span className="panel-kicker">Measured from domain and search events</span>
          <h2 id="search-space-title">Search Space Reduction</h2>
        </div>
        {measuredReduction !== null && (
          <span className={measuredReduction >= 0 ? 'reduction-badge' : 'reduction-badge is-increase'}>
            {Math.abs(measuredReduction).toFixed(1)}% {measuredReduction >= 0 ? 'fewer' : 'more'} candidate trials vs Basic
          </span>
        )}
      </header>
      <ol className="search-space-stages">
        {stages.map(({ title, value, Icon }, index) => (
          <li key={title}>
            <div className="stage-icon"><Icon size={15} aria-hidden="true" /></div>
            <span className="stage-title">{title}</span>
            <strong>{value}</strong>
            {index < stages.length - 1 && <span className="stage-arrow" aria-hidden="true">↓</span>}
          </li>
        ))}
      </ol>
      {measuredReduction === null && (
        <p className="panel-note">Candidate-trial change appears after actual Basic and MRV + Forward Checking comparison runs finish.</p>
      )}
    </section>
  )
}

export default SearchSpaceReduction