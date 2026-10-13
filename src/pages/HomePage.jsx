import { Calculator, Crown, Grid3X3, Map } from 'lucide-react'
import PuzzleCard from '../components/PuzzleCard.jsx'
import TopNavigation from '../components/TopNavigation.jsx'

const puzzles = [
  {
    title: 'Sudoku',
    description: 'Fill each row, column, and box while tracking domains and backtracking.',
    type: 'Logic grid',
    number: '01',
    tone: 'green',
    href: '/sudoku',
    Icon: Grid3X3,
  },
  {
    title: 'N-Queens',
    description: 'Place queens so no pair can attack across a row, column, or diagonal.',
    type: 'Placement',
    number: '02',
    tone: 'coral',
    href: '/nqueens',
    Icon: Crown,
  },
  {
    title: 'Map Coloring',
    description: 'Color neighboring regions differently with the fewest possible choices.',
    type: 'Graph coloring',
    number: '03',
    tone: 'blue',
    href: '/map-coloring',
    Icon: Map,
  },
  {
    title: 'Kakuro',
    description: 'Complete cross-sums with distinct digits and shrinking candidate sets.',
    type: 'Number logic',
    number: '04',
    tone: 'yellow',
    href: '/kakuro',
    Icon: Calculator,
  },
]

function HomePage() {
  return (
    <div className="app-shell" id="home">
      <TopNavigation />
      <main className="page-content">
        <section className="welcome-row" aria-labelledby="welcome-title">
          <div>
            <span className="eyebrow">
              <span className="eyebrow-dot" aria-hidden="true" />
              Interactive algorithm lab
            </span>
            <h1 id="welcome-title">Choose a puzzle</h1>
            <p className="welcome-copy">
              Follow each decision, domain change, and backtrack as classic puzzles
              unfold into a search problem.
            </p>
          </div>
          <aside className="suite-summary" aria-label="Puzzle suite summary">
            <div className="summary-count">
              <strong>04</strong>
              <span>puzzle types</span>
            </div>
            <span className="summary-caption">Ready to explore</span>
          </aside>
        </section>

        <section id="puzzles" aria-labelledby="puzzles-title">
          <div className="section-heading">
            <h2 id="puzzles-title">Puzzle library</h2>
            <span>Four classic constraint problems</span>
          </div>
          <div className="puzzle-grid">
            {puzzles.map((puzzle) => (
              <PuzzleCard key={puzzle.title} puzzle={puzzle} />
            ))}
          </div>
        </section>
      </main>
      <footer className="site-footer" id="about">
        <div className="footer-inner">
          <span className="footer-brand">PuzzleMind</span>
          <span>CSP &amp; Search Visualization Suite</span>
        </div>
      </footer>
    </div>
  )
}

export default HomePage