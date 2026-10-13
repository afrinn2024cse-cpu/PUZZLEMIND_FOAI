import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

function PuzzleCard({ puzzle }) {
  const { title, description, type, number, tone, Icon, href } = puzzle

  return (
    <article className="puzzle-card" data-tone={tone}>
      <div className="puzzle-card-top">
        <span className="puzzle-icon">
          <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <span className="puzzle-number">{number}</span>
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      <div className="puzzle-card-footer">
        <span className="puzzle-type">{type}</span>
        {href ? (
          <Link className="solve-button" to={href}>
            Solve now
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        ) : (
          <button className="solve-button" type="button" disabled>
            Coming soon
          </button>
        )}
      </div>
    </article>
  )
}

export default PuzzleCard