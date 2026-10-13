import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CircleAlert, Map as MapIcon } from 'lucide-react'
import ConstraintGraphPanel from '../components/ConstraintGraphPanel.jsx'
import MapColoringActivity from '../components/MapColoringActivity.jsx'
import MapColoringControls from '../components/MapColoringControls.jsx'
import MapColoringStatistics from '../components/MapColoringStatistics.jsx'
import MapDiagram from '../components/MapDiagram.jsx'
import MapDomainPanel from '../components/MapDomainPanel.jsx'
import MapHeuristicImpact from '../components/MapHeuristicImpact.jsx'
import MapSearchSpace from '../components/MapSearchSpace.jsx'
import MapSolutionSummary from '../components/MapSolutionSummary.jsx'
import SearchDepthPanel from '../components/SearchDepthPanel.jsx'
import SearchTreePanel from '../components/SearchTreePanel.jsx'
import SolverTimeline from '../components/SolverTimeline.jsx'
import TopNavigation from '../components/TopNavigation.jsx'
import '../MapColoring.css'
import {
  COMPLETE_FOUR_GRAPH,
  DEFAULT_MAP_GRAPH,
  MAP_COLORS,
} from '../puzzles/mapColoring/mapColoringSolver.js'

const mapScenarios = {
  map: DEFAULT_MAP_GRAPH,
  k4: COMPLETE_FOUR_GRAPH,
}

function MapColoringPage() {
  const [scenario, setScenario] = useState('map')
  const [colorCount, setColorCount] = useState(3)
  const [events, setEvents] = useState([])
  const [stepIndex, setStepIndex] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [solverError, setSolverError] = useState('')
  const [comparisonRuns, setComparisonRuns] = useState({})
  const [activeComparisons, setActiveComparisons] = useState([])
  const [comparisonErrors, setComparisonErrors] = useState({})
  const solverWorkerRef = useRef(null)
  const comparisonWorkersRef = useRef(new Map())

  const graph = mapScenarios[scenario]
  const palette = MAP_COLORS.slice(0, colorCount).map(({ name }) => name)
  const variables = Object.keys(graph)
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
    solverWorkerRef.current?.terminate()
    for (const worker of comparisonWorkersRef.current.values()) worker.terminate()
    comparisonWorkersRef.current.clear()
  }, [])

  function clearComparisons() {
    for (const worker of comparisonWorkersRef.current.values()) worker.terminate()
    comparisonWorkersRef.current.clear()
    setComparisonRuns({})
    setActiveComparisons([])
    setComparisonErrors({})
  }

  function resetSolver() {
    solverWorkerRef.current?.terminate()
    solverWorkerRef.current = null
    setEvents([])
    setStepIndex(0)
    setElapsedMs(0)
    setIsPlaying(false)
    setIsPreparing(false)
    setSolverError('')
    clearComparisons()
  }

  function changeScenario(nextScenario) {
    resetSolver()
    setScenario(nextScenario)
  }

  function changeColorCount(nextCount) {
    resetSolver()
    setColorCount(nextCount)
  }

  function runSearch({ autoplay = false, firstStep = false } = {}) {
    solverWorkerRef.current?.terminate()
    setEvents([])
    setStepIndex(0)
    setIsPlaying(false)
    setIsPreparing(true)
    setSolverError('')
    try {
      const worker = new Worker(new URL('../puzzles/mapColoring/mapColoringWorker.js', import.meta.url), { type: 'module' })
      solverWorkerRef.current = worker
      worker.onmessage = ({ data }) => {
        if (solverWorkerRef.current !== worker) return
        setEvents(data.events ?? [])
        setStepIndex(firstStep ? Math.min(1, data.events?.length ?? 0) : 0)
        setElapsedMs(data.statistics.executionTimeMs)
        setSolverError(data.error ?? '')
        setIsPreparing(false)
        setIsPlaying(autoplay && (data.events?.length ?? 0) > 0)
        solverWorkerRef.current = null
        worker.terminate()
      }
      worker.onerror = (event) => {
        if (solverWorkerRef.current !== worker) return
        setSolverError(event.message || 'The map-coloring search could not be completed.')
        setIsPreparing(false)
        solverWorkerRef.current = null
        worker.terminate()
      }
      worker.postMessage({ graph, palette, method: 'mrv-forward', captureEvents: true })
    } catch (error) {
      setSolverError(error.message || 'The map-coloring worker could not be started.')
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

  function runComparison(method) {
    if (comparisonWorkersRef.current.has(method)) return
    setActiveComparisons((current) => current.includes(method) ? current : [...current, method])
    setComparisonErrors((current) => ({ ...current, [method]: '' }))
    try {
      const worker = new Worker(new URL('../puzzles/mapColoring/mapColoringBenchmarkWorker.js', import.meta.url), { type: 'module' })
      comparisonWorkersRef.current.set(method, worker)

      const finishComparison = ({ data, error }) => {
        if (comparisonWorkersRef.current.get(method) !== worker) return
        comparisonWorkersRef.current.delete(method)
        setActiveComparisons((current) => current.filter((activeMethod) => activeMethod !== method))
        worker.terminate()

        if (error) {
          setComparisonErrors((current) => ({ ...current, [method]: error }))
          return
        }
        if (data?.method !== method || !data.statistics) {
          setComparisonErrors((current) => ({
            ...current,
            [method]: 'The worker returned an invalid comparison result.',
          }))
          return
        }
        setComparisonErrors((current) => ({ ...current, [method]: '' }))
        setComparisonRuns((current) => ({ ...current, [method]: data }))
      }

      worker.onmessage = ({ data }) => {
        finishComparison({ data })
      }
      worker.onerror = () => {
        finishComparison({ error: 'The comparison worker failed before returning statistics.' })
      }
      worker.postMessage({ graph, palette, method, captureEvents: false })
    } catch (error) {
      const worker = comparisonWorkersRef.current.get(method)
      worker?.terminate()
      comparisonWorkersRef.current.delete(method)
      setActiveComparisons((current) => current.filter((activeMethod) => activeMethod !== method))
      setComparisonErrors((current) => ({
        ...current,
        [method]: error.message || 'The comparison worker could not be started.',
      }))
    }
  }

  function jumpToStep(nextStep) {
    setIsPlaying(false)
    setStepIndex(nextStep)
  }

  return (
    <div className="app-shell map-coloring-page">
      <TopNavigation />
      <main className="map-coloring-main">
        <div className="map-coloring-heading">
          <Link className="back-link" to="/">
            <ArrowLeft size={16} aria-hidden="true" />
            Puzzle library
          </Link>
          <div className="map-coloring-title-row">
            <div>
              <span className="eyebrow"><span className="eyebrow-dot" aria-hidden="true" />Constraint satisfaction search</span>
              <h1>Map Coloring Solver</h1>
              <p>Visualizing CSP, Constraint Propagation and Backtracking</p>
            </div>
            <span className="map-title-badge"><MapIcon size={16} aria-hidden="true" />{variables.length} regions · {colorCount} colors</span>
          </div>
        </div>

        <MapColoringControls
          scenario={scenario}
          colorCount={colorCount}
          onScenarioChange={changeScenario}
          onColorCountChange={changeColorCount}
          isPlaying={isPlaying}
          isPreparing={isPreparing}
          onStart={startSolver}
          onPause={() => setIsPlaying(false)}
          onNextStep={advanceOneStep}
          onReset={resetSolver}
          speed={speed}
          onSpeedChange={setSpeed}
          stepIndex={stepIndex}
          totalSteps={events.length}
        />

        {(noSolution || solverError) && (
          <div className="map-coloring-alert" role="alert">
            <CircleAlert size={17} aria-hidden="true" />
            <span>{currentEvent?.reason ?? solverError}</span>
          </div>
        )}

        <div className="map-coloring-workspace">
          <section className="panel map-visual-panel" aria-labelledby="map-visual-title">
            <header className="panel-heading">
              <div>
                <span className="panel-kicker">{scenario === 'k4' ? 'Complete graph K4' : 'Predefined seven-region map'}</span>
                <h2 id="map-visual-title">Region Map</h2>
              </div>
              <span className="map-edge-count">{Object.values(graph).reduce((sum, neighbors) => sum + neighbors.length, 0) / 2} edges</span>
            </header>
            <MapDiagram graph={graph} events={visibleEvents} palette={palette} />
            <MapDomainPanel graph={graph} palette={palette} events={visibleEvents} />
          </section>

          <MapColoringActivity events={visibleEvents} stepIndex={stepIndex} palette={palette} graph={graph} />

          {solution && <MapSolutionSummary events={visibleEvents} elapsedMs={elapsedMs} solution={solution} graph={graph} />}
          <MapColoringStatistics events={visibleEvents} elapsedMs={elapsedMs} />
          <SearchDepthPanel events={visibleEvents} />
          <SolverTimeline events={visibleEvents} stepIndex={stepIndex} onJumpToStep={jumpToStep} />
          <ConstraintGraphPanel graph={graph} events={visibleEvents} />
          <MapHeuristicImpact
            comparisonRuns={comparisonRuns}
            activeMethods={activeComparisons}
            comparisonErrors={comparisonErrors}
            onRun={runComparison}
          />
          <MapSearchSpace events={visibleEvents} palette={palette} regionCount={variables.length} />
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

export default MapColoringPage