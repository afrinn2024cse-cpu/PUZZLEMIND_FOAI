import { PartyPopper } from 'lucide-react'
import { summarizeKakuroEvents } from '../puzzles/kakuro/kakuroSolver.js'

function KakuroSolutionSummary({ puzzle, events, elapsedMs, solution }) {
  const stats = summarizeKakuroEvents(events, elapsedMs)
  const rows = [
    ['Cells', Object.keys(solution).length],
    ['Digits tested', stats.digitsTested],
    ['Pruned', stats.digitsPruned],
    ['Conflicts', stats.conflicts],
    ['Backtracks', stats.backtracks],
    ['Nodes', stats.nodesExplored],
    ['Maximum depth', stats.maximumDepth],
    ['Execution time', `${stats.elapsedMs.toFixed(2)} ms`],
  ]

  return (
    <section className="kakuro-solution-summary" role="status" aria-labelledby="kakuro-solution-title">
      <header>
        <PartyPopper size={22} aria-hidden="true" />
        <div><span className="panel-kicker">{puzzle.name} puzzle</span><h2 id="kakuro-solution-title">Kakuro Solved</h2></div>
      </header>
      <dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </section>
  )
}

export default KakuroSolutionSummary