import { PartyPopper } from 'lucide-react'
import { summarizeSolverEvents } from '../utils/solverSteps.js'

function SolutionSummary({ events, elapsedMs, steps }) {
  const statistics = summarizeSolverEvents(events, elapsedMs)
  const metrics = [
    ['Steps', steps],
    ['Nodes explored', statistics.nodesExplored],
    ['Assignments', statistics.assignments],
    ['Candidates pruned', statistics.candidatesPruned],
    ['Conflicts', statistics.conflicts],
    ['Backtracks', statistics.backtracks],
    ['Maximum depth', statistics.maximumDepth],
    ['Execution time', `${statistics.elapsedMs.toFixed(2)} ms`],
  ]

  return (
    <section className="solution-summary" aria-labelledby="solution-summary-title" role="status">
      <header>
        <PartyPopper size={22} aria-hidden="true" />
        <div>
          <span className="panel-kicker">MRV + Forward Checking</span>
          <h2 id="solution-summary-title">Solution Found</h2>
        </div>
      </header>
      <dl>
        {metrics.map(([label, value]) => (
          <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
        ))}
      </dl>
    </section>
  )
}

export default SolutionSummary