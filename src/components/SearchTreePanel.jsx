import { CircleAlert, CircleCheck, CircleDot, CornerDownLeft, GitBranch } from 'lucide-react'
import { buildSearchTree } from '../utils/solverSteps.js'

const stateIcons = {
  explored: CircleDot,
  current: GitBranch,
  pruned: CircleAlert,
  backtracked: CornerDownLeft,
  solution: CircleCheck,
}

function SearchTreePanel({ events, maxNodes = 100 }) {
  const tree = buildSearchTree(events, maxNodes)

  return (
    <details className="panel collapsible-panel search-tree-panel">
      <summary>
        <span>
          <span className="panel-kicker">{tree.totalNodes} decision and outcome nodes</span>
          <strong>Search Tree</strong>
        </span>
        <span className="collapse-hint">Expand tree</span>
      </summary>
      <div className="tree-content">
        <ul className="tree-list">
          {tree.nodes.map((node) => {
            const Icon = stateIcons[node.state] ?? CircleDot
            return (
              <li className={`tree-node is-${node.state}`} key={node.id} style={{ '--tree-depth': Math.min(node.depth, 12) }}>
                <span className="tree-branch" aria-hidden="true" />
                <Icon size={14} aria-hidden="true" />
                <span>{node.label}</span>
                <small>{node.state}</small>
              </li>
            )
          })}
        </ul>
        {tree.truncatedCount > 0 && (
          <p className="panel-note">Showing {tree.nodes.length} nodes; {tree.truncatedCount} additional nodes remain in the complete solver history.</p>
        )}
        {!events.length && <p className="empty-note">Decision branches appear as the solver explores candidate values.</p>}
      </div>
    </details>
  )
}

export default SearchTreePanel