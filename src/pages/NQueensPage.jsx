import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CircleAlert, Crown } from 'lucide-react'
import NQueensActivity from '../components/NQueensActivity.jsx'
import NQueensControls from '../components/NQueensControls.jsx'
import NQueensStatistics from '../components/NQueensStatistics.jsx'
import SearchDepthPanel from '../components/SearchDepthPanel.jsx'
import SearchTreePanel from '../components/SearchTreePanel.jsx'
import SolverTimeline from '../components/SolverTimeline.jsx'
import TopNavigation from '../components/TopNavigation.jsx'
import NQueensBoard from '../puzzles/nqueens/NQueensBoard.jsx'
import '../NQueens.css'

function NQueensPage() {
  const [size, setSize] = useState(8)
  const [events, setEvents] = useState([])
  const [stepIndex, setStepIndex] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [solutionsFound, setSolutionsFound] = useState(0)
  const [solverError, setSolverError] = useState('')
  const workerRef = useRef(null)

  const visibleEvents = events.slice(0, stepIndex)
  const currentEvent = visibleEvents.at(-1)
  const isSolved = currentEvent?.type === 'solution-found'
  const hasNoSolution = currentEvent?.type === 'no-solution'
  const specialNoSolutionSize = size === 2 || size === 3

  useEffect(() => {
    if (!isPlaying || stepIndex >= events.length) return undefined
    const timeout = window.setTimeout(() => {
      setStepIndex((current) => Math.min(current + 1, events.length))
      if (stepIndex + 1 >= events.length) setIsPlaying(false)
    }, 800 / speed)
    return () => window.clearTimeout(timeout)
  }, [events.length, isPlaying, speed, stepIndex])

  useEffect(() => () => workerRef.current?.terminate(), [])

  function clearSearch() {
    workerRef.current?.terminate()
    workerRef.current = null
    setEvents([])
    setStepIndex(0)
    setIsPlaying(false)
    setIsPreparing(false)
    setElapsedMs(0)
    setSolutionsFound(0)
    setSolverError('')
  }

  function changeSize(nextSize) {
    clearSearch()
    setSize(nextSize)
  }

  function runSearch({ solutionOffset = 0, autoplay = false, firstStep = false } = {}) {
    workerRef.current?.terminate()
    setEvents([])
    setStepIndex(0)
    setIsPlaying(false)
    setIsPreparing(true)
    setSolverError('')
    try {
      const worker = new Worker(new URL('../puzzles/nqueens/NQueensWorker.js', import.meta.url), { type: 'module' })
      workerRef.current = worker
      worker.onmessage = ({ data }) => {
        if (workerRef.current !== worker) return
        setEvents(data.events)
        setStepIndex(firstStep ? Math.min(1, data.events.length) : 0)
        setElapsedMs(data.statistics.executionTimeMs)
        setSolutionsFound(data.solutionsFound)
        setSolverError(data.error ?? '')
        setIsPreparing(false)
        setIsPlaying(autoplay && data.events.length > 0)
        workerRef.current = null
        worker.terminate()
      }
      worker.onerror = (event) => {
        if (workerRef.current !== worker) return
        setSolverError(event.message || 'The N-Queens search could not be completed.')
        setIsPreparing(false)
        workerRef.current = null
        worker.terminate()
      }
      worker.postMessage({ size, solutionOffset })
    } catch (error) {
      setSolverError(error.message || 'The N-Queens worker could not be started.')
      setIsPreparing(false)
    }
  }

  function startSolver() {
    if (isPreparing) return
    if (events.length === 0) {
      runSearch({ autoplay: true })
      return
    }
    if (stepIndex >= events.length) setStepIndex(0)
    setIsPlaying(true)
  }

  function advanceOneStep() {
    if (isPreparing) return
    if (events.length === 0) {
      runSearch({ firstStep: true })
      return
    }
    setStepIndex((current) => Math.min(current + 1, events.length))
  }

  function findAnotherSolution() {
    runSearch({ solutionOffset: solutionsFound, autoplay: true })
  }

  function jumpToStep(nextStep) {
    setIsPlaying(false)
    setStepIndex(nextStep)
  }

  return (
    <div className="app-shell nqueens-page">
      <TopNavigation />
      <main className="nqueens-main">
        <div className="nqueens-heading">
          <Link className="back-link" to="/">
            <ArrowLeft size={16} aria-hidden="true" />
            Puzzle library
          </Link>
          <div className="nqueens-title-row">
            <div>
              <span className="eyebrow"><span className="eyebrow-dot" aria-hidden="true" />Constraint satisfaction search</span>
              <h1>N-Queens Solver</h1>
              <p>Visualizing Backtracking and Constraint Satisfaction</p>
            </div>
            <span className="nqueens-model-badge"><Crown size={15} aria-hidden="true" />N = {size}</span>
          </div>
        </div>

        <NQueensControls
          size={size}
          onSizeChange={changeSize}
          isPlaying={isPlaying}
          isPreparing={isPreparing}
          onStart={startSolver}
          onPause={() => setIsPlaying(false)}
          onNextStep={advanceOneStep}
          onReset={clearSearch}
          speed={speed}
          onSpeedChange={setSpeed}
          stepIndex={stepIndex}
          totalSteps={events.length}
        />

        {specialNoSolutionSize && (
          <div className="nqueens-alert" role="status">
            <CircleAlert size={17} aria-hidden="true" />
            <span>No solution exists for N={size}. Start the solver to inspect the exhausted search.</span>
          </div>
        )}
        {hasNoSolution && !specialNoSolutionSize && (
          <div className="nqueens-alert" role="alert">
            <CircleAlert size={17} aria-hidden="true" />
            <span>{currentEvent.reason}</span>
          </div>
        )}
        {solverError && !hasNoSolution && (
          <div className="nqueens-alert" role="alert">
            <CircleAlert size={17} aria-hidden="true" />
            <span>{solverError}</span>
          </div>
        )}

        <div className="nqueens-workspace">
          <section className="panel nqueens-board-panel" aria-labelledby="nqueens-board-title">
            <header className="panel-heading">
              <div>
                <span className="panel-kicker">{size} × {size} search board</span>
                <h2 id="nqueens-board-title">Board</h2>
              </div>
              <span className="nqueens-count-badge">{visibleEvents.filter((event) => event.type === 'place-queen').length} placements</span>
            </header>
            <NQueensBoard size={size} events={visibleEvents} solved={isSolved} />
          </section>

          <NQueensActivity events={visibleEvents} stepIndex={stepIndex} size={size} />

          {isSolved && (
            <section className="nqueens-solution-banner" role="status">
              <Crown size={22} aria-hidden="true" />
              <div>
                <span className="panel-kicker">Search completed</span>
                <h2>Solution {currentEvent.solutionNumber} found for N={size}</h2>
              </div>
              <button className="primary-button" type="button" onClick={findAnotherSolution} disabled={isPreparing}>
                Find Another Solution
              </button>
            </section>
          )}

          <NQueensStatistics events={visibleEvents} elapsedMs={elapsedMs} />
          <SearchDepthPanel events={visibleEvents} />
          <SolverTimeline events={visibleEvents} stepIndex={stepIndex} onJumpToStep={jumpToStep} />
          <SearchTreePanel events={visibleEvents} />
        </div>
      </main>
      <footer className="site-footer">
        <div className="footer-inner">
          <Link className="footer-brand" to="/">PuzzleMind</Link>
          <span>CSP &amp; Search Visualization Suite</span>
        </div>
      </footer>
    </div>
  )
}

export default NQueensPage