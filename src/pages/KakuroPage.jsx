import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CircleAlert, Grid3X3 } from 'lucide-react'
import KakuroActivity from '../components/KakuroActivity.jsx'
import KakuroControls from '../components/KakuroControls.jsx'
import KakuroDomainPanel from '../components/KakuroDomainPanel.jsx'
import KakuroGrid from '../components/KakuroGrid.jsx'
import KakuroHeuristicImpact from '../components/KakuroHeuristicImpact.jsx'
import KakuroRunPanel from '../components/KakuroRunPanel.jsx'
import KakuroSearchSpace from '../components/KakuroSearchSpace.jsx'
import KakuroSolutionSummary from '../components/KakuroSolutionSummary.jsx'
import KakuroStatistics from '../components/KakuroStatistics.jsx'
import SearchDepthPanel from '../components/SearchDepthPanel.jsx'
import SearchTreePanel from '../components/SearchTreePanel.jsx'
import SolverTimeline from '../components/SolverTimeline.jsx'
import TopNavigation from '../components/TopNavigation.jsx'
import '../Kakuro.css'
import { kakuroPuzzles } from '../puzzles/kakuro/kakuroPuzzles.js'

function KakuroPage() {
  const [puzzleId, setPuzzleId] = useState('easy')
  const [events, setEvents] = useState([])
  const [stepIndex, setStepIndex] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [visualError, setVisualError] = useState('')
  const [benchmarkRuns, setBenchmarkRuns] = useState({})
  const [activeBenchmarks, setActiveBenchmarks] = useState([])
  const [benchmarkErrors, setBenchmarkErrors] = useState({})
  const visualWorkerRef = useRef(null)
  const benchmarkWorkersRef = useRef(new Map())

  const puzzle = kakuroPuzzles[puzzleId]
  const visibleEvents = events.slice(0, stepIndex)
  const currentEvent = visibleEvents.at(-1)
  const solution = currentEvent?.type === 'solution-found' ? currentEvent.solution : null
  const noSolution = currentEvent?.type === 'no-solution'

  useEffect(() => {
    if (!isPlaying || stepIndex >= events.length) return undefined
    const timeout = window.setTimeout(() => {
      setStepIndex((current) => Math.min(current + 1, events.length))
      if (stepIndex + 1 >= events.length) setIsPlaying(false)
    }, 800 / speed)
    return () => window.clearTimeout(timeout)
  }, [events.length, isPlaying, speed, stepIndex])

  useEffect(() => () => {
    visualWorkerRef.current?.terminate()
    for (const worker of benchmarkWorkersRef.current.values()) worker.terminate()
    benchmarkWorkersRef.current.clear()
  }, [])

  function clearBenchmarks() {
    for (const worker of benchmarkWorkersRef.current.values()) worker.terminate()
    benchmarkWorkersRef.current.clear()
    setBenchmarkRuns({})
    setBenchmarkErrors({})
    setActiveBenchmarks([])
  }

  function resetSolver() {
    visualWorkerRef.current?.terminate()
    visualWorkerRef.current = null
    setEvents([])
    setStepIndex(0)
    setElapsedMs(0)
    setIsPlaying(false)
    setIsPreparing(false)
    setVisualError('')
    clearBenchmarks()
  }

  function changePuzzle(nextPuzzle) {
    resetSolver()
    setPuzzleId(nextPuzzle)
  }

  function runVisualSolver({ autoplay = false, firstStep = false } = {}) {
    visualWorkerRef.current?.terminate()
    setEvents([])
    setStepIndex(0)
    setIsPlaying(false)
    setIsPreparing(true)
    setVisualError('')
    try {
      const worker = new Worker(new URL('../puzzles/kakuro/KakuroWorker.js', import.meta.url), { type: 'module' })
      visualWorkerRef.current = worker
      worker.onmessage = ({ data }) => {
        if (visualWorkerRef.current !== worker) return
        setEvents(data.events ?? [])
        setStepIndex(firstStep ? Math.min(1, data.events?.length ?? 0) : 0)
        setElapsedMs(data.statistics.elapsedMs)
        setVisualError('')
        setIsPreparing(false)
        setIsPlaying(autoplay && (data.events?.length ?? 0) > 0)
        visualWorkerRef.current = null
        worker.terminate()
      }
      worker.onerror = (event) => {
        if (visualWorkerRef.current !== worker) return
        setVisualError(event.message || 'Kakuro search failed.')
        setIsPreparing(false)
        visualWorkerRef.current = null
        worker.terminate()
      }
      worker.postMessage({ puzzle })
    } catch (error) {
      setVisualError(error.message || 'Kakuro worker could not be started.')
      setIsPreparing(false)
    }
  }

  function startSolver() {
    if (isPreparing) return
    if (!events.length) {
      runVisualSolver({ autoplay: true })
      return
    }
    if (stepIndex >= events.length) setStepIndex(0)
    setIsPlaying(true)
  }

  function advanceOneStep() {
    if (isPreparing) return
    if (!events.length) {
      runVisualSolver({ firstStep: true })
      return
    }
    setStepIndex((current) => Math.min(current + 1, events.length))
  }

  function runBenchmark(method) {
    if (benchmarkWorkersRef.current.has(method)) return
    setActiveBenchmarks((current) => current.includes(method) ? current : [...current, method])
    setBenchmarkErrors((current) => ({ ...current, [method]: '' }))
    try {
      const worker = new Worker(new URL('../puzzles/kakuro/KakuroBenchmarkWorker.js', import.meta.url), { type: 'module' })
      benchmarkWorkersRef.current.set(method, worker)
      const finish = ({ data, error }) => {
        if (benchmarkWorkersRef.current.get(method) !== worker) return
        benchmarkWorkersRef.current.delete(method)
        setActiveBenchmarks((current) => current.filter((activeMethod) => activeMethod !== method))
        worker.terminate()
        if (error) {
          setBenchmarkErrors((current) => ({ ...current, [method]: error }))
        } else if (data?.method === method && data.statistics) {
          setBenchmarkRuns((current) => ({ ...current, [method]: data }))
        } else {
          setBenchmarkErrors((current) => ({ ...current, [method]: 'Benchmark worker returned an invalid result.' }))
        }
      }
      worker.onmessage = ({ data }) => finish({ data })
      worker.onerror = () => finish({ error: 'Benchmark worker failed before returning statistics.' })
      worker.postMessage({ puzzle, method })
    } catch (error) {
      benchmarkWorkersRef.current.delete(method)
      setActiveBenchmarks((current) => current.filter((activeMethod) => activeMethod !== method))
      setBenchmarkErrors((current) => ({ ...current, [method]: error.message || 'Benchmark worker could not be started.' }))
    }
  }

  function jumpToStep(nextStep) {
    setIsPlaying(false)
    setStepIndex(nextStep)
  }

  return (
    <div className="app-shell kakuro-page">
      <TopNavigation />
      <main className="kakuro-main">
        <div className="kakuro-heading">
          <Link className="back-link" to="/">
            <ArrowLeft size={16} aria-hidden="true" />
            Puzzle library
          </Link>
          <div className="kakuro-title-row">
            <div>
              <span className="eyebrow"><span className="eyebrow-dot" aria-hidden="true" />Constraint satisfaction search</span>
              <h1>Kakuro Solver</h1>
              <p>Visualizing CSP, Constraint Propagation and Backtracking</p>
            </div>
            <span className="kakuro-title-badge"><Grid3X3 size={15} aria-hidden="true" />{puzzle.name}</span>
          </div>
        </div>

        <KakuroControls
          puzzleId={puzzleId}
          puzzles={Object.values(kakuroPuzzles)}
          isPlaying={isPlaying}
          isPreparing={isPreparing}
          onPuzzleChange={changePuzzle}
          onStart={startSolver}
          onPause={() => setIsPlaying(false)}
          onNextStep={advanceOneStep}
          onReset={resetSolver}
          speed={speed}
          onSpeedChange={setSpeed}
          stepIndex={stepIndex}
          totalSteps={events.length}
        />

        {(noSolution || visualError) && (
          <div className="kakuro-alert" role="alert"><CircleAlert size={17} aria-hidden="true" /><span>{currentEvent?.reason ?? visualError}</span></div>
        )}

        <div className="kakuro-workspace">
          <section className="panel kakuro-board-panel" aria-labelledby="kakuro-board-title">
            <header className="panel-heading">
              <div>
                <span className="panel-kicker">{puzzle.name} · {puzzle.grid.length} × {puzzle.grid[0].length}</span>
                <h2 id="kakuro-board-title">Kakuro Grid</h2>
              </div>
              <span className="kakuro-board-count">{puzzle.grid.flat().filter((cell) => cell.type === 'white').length} white cells</span>
            </header>
            <KakuroGrid puzzle={puzzle} events={visibleEvents} />
            <KakuroDomainPanel puzzle={puzzle} events={visibleEvents} />
          </section>

          <KakuroActivity events={visibleEvents} stepIndex={stepIndex} />
          <KakuroRunPanel puzzle={puzzle} events={visibleEvents} />
          {solution && <KakuroSolutionSummary puzzle={puzzle} events={visibleEvents} elapsedMs={elapsedMs} solution={solution} />}
          <KakuroStatistics events={visibleEvents} elapsedMs={elapsedMs} />
          <SearchDepthPanel events={visibleEvents} />
          <SolverTimeline events={visibleEvents} stepIndex={stepIndex} onJumpToStep={jumpToStep} />
          <SearchTreePanel events={visibleEvents} />
          <KakuroSearchSpace puzzle={puzzle} events={visibleEvents} />
          <KakuroHeuristicImpact runs={benchmarkRuns} activeMethods={activeBenchmarks} errors={benchmarkErrors} onRun={runBenchmark} />
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

export default KakuroPage