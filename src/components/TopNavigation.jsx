import { ArrowUpRight, BrainCircuit } from 'lucide-react'
import { Link } from 'react-router-dom'

function TopNavigation() {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link className="brand" to="/" aria-label="PuzzleMind home">
          <span className="brand-mark">
            <BrainCircuit size={21} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <span>
            <span className="brand-name">PuzzleMind</span>
            <span className="brand-subtitle">CSP &amp; Search Visualization Suite</span>
          </span>
        </Link>
        <nav className="topbar-nav" aria-label="Main navigation">
          <Link to="/#puzzles">Puzzles</Link>
          <Link to="/#about">About</Link>
          <Link className="nav-cta" to="/#puzzles">
            Explore suite
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </nav>
      </div>
    </header>
  )
}

export default TopNavigation