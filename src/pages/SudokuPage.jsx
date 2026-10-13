import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CircleAlert, SlidersHorizontal } from 'lucide-react'
import SolverControls from '../components/SolverControls.jsx'
import HeuristicImpact from '../components/HeuristicImpact.jsx'
import LiveSolverActivity from '../components/LiveSolverActivity.jsx'
import SearchDepthPanel from '../components/SearchDepthPanel.jsx'
import SearchSpaceReduction from '../components/SearchSpaceReduction.jsx'
import SearchTreePanel from '../components/SearchTreePanel.jsx'
import StatisticsPanel from '../components/StatisticsPanel.jsx'
import SolverTimeline from '../components/SolverTimeline.jsx'
import SolutionSummary from '../components/SolutionSummary.jsx'
import TopNavigation from '../components/TopNavigation.jsx'
import SudokuBoard from '../puzzles/sudoku/SudokuBoard.jsx'
import { cloneSudokuBoard, sudokuPuzzles } from '../puzzles/sudoku/sudokuPuzzles.js'
import { findSudokuConflicts } from '../puzzles/sudoku/sudokuSolver.js'
import '../SudokuVisualization.css'

function SudokuPage() {
  const [difficulty, setDifficulty] = useState('Easy')
  const [clues, setClues] = useState(() => cloneSudokuBoard(sudokuPuzzles.Easy))
  const [board, setBoard] = useState(() => cloneSudokuBoard(sudokuPuzzles.Easy))
  const [events, setEvents] = useState([])
  const [stepIndex, setStepIndex] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPreparingRun, setIsPreparingRun] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [solverError, setSolverError] = useState('')
  const [explanationMode, setExplanationMode] = useState(true)
  const [comparisonRuns, setComparisonRuns] = useState({})
  const [activeComparisons, setActiveComparisons] = useState([])
  const [comparisonErrors, setComparisonErrors] = useState({})
  const solverWorkerRef = useRef(null)
  const comparisonWorkersRef = useRef(new Map())

  const visibleEvents = events.slice(0, stepIndex)
  const currentEvent = visibleEvents.at(-1)
  const solved = currentEvent?.type === 'solution-found'
  const conflicts = findSudokuConflicts(board)
  const currentError = currentEvent?.type === 'invalid-puzzle' || currentEvent?.type === 'no-solution'
    ? currentEvent.reason
    : ''

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

  function clearPlayback() {
    solverWorkerRef.current?.terminate()
    solverWorkerRef.current = null
    setIsPlaying(false)
    setIsPreparingRun(false)
    setEvents([])
    setStepIndex(0)
    setElapsedMs(0)
    setSolverError('')
  }

  function clearComparisons() {
    for (const worker of comparisonWorkersRef.current.values()) worker.terminate()
    comparisonWorkersRef.current.clear()
    setComparisonRuns({})
    setActiveComparisons([])
    setComparisonErrors({})
  }

  function loadPuzzle(name) {
    if (name === 'Custom') return
    const nextBoard = cloneSudokuBoard(sudokuPuzzles[name])
    setDifficulty(name)
    setClues(cloneSudokuBoard(nextBoard))
    setBoard(nextBoard)
    clearPlayback()
    clearComparisons()
  }

  function clearBoard() {
    const emptyBoard = Array.from({ length: 9 }, () => Array(9).fill(0))
    setDifficulty('Custom')
    setClues(cloneSudokuBoard(emptyBoard))
    setBoard(emptyBoard)
    clearPlayback()
    clearComparisons()
  }

  function editCell(row, col, rawValue) {
    if (clues[row][col] !== 0) return
    const trimmed = rawValue.trim()
    if (trimmed !== '' && !/^[1-9]$/.test(trimmed)) return
    setBoard((current) => current.map((boardRow, rowIndex) =>
      rowIndex === row
        ? boardRow.map((value, colIndex) => colIndex === col ? Number(trimmed) || 0 : value)
        : boardRow,
    ))
    setDifficulty('Custom')
    clearPlayback()
    clearComparisons()
  }

  function generateRun({ autoplay = false, firstStep = false } = {}) {
    solverWorkerRef.current?.terminate()
    setIsPreparingRun(true)
    setSolverError('')
    try {
      const worker = new Worker(
        new URL('../puzzles/sudoku/sudokuComparisonWorker.js', import.meta.url),
        { type: 'module' },
      )
      solverWorkerRef.current = worker
      worker.onmessage = ({ data }) => {
        if (solverWorkerRef.current !== worker) return
        setEvents(data.events ?? [])
        setStepIndex(firstStep ? Math.min(1, data.events?.length ?? 0) : 0)
        setElapsedMs(data.statistics.executionTimeMs)
        setSolverError(data.error ?? '')
        setIsPreparingRun(false)
        setIsPlaying(autoplay && (data.events?.length ?? 0) > 0)
        solverWorkerRef.current = null
        worker.terminate()
      }
      worker.onerror = (event) => {
        if (solverWorkerRef.current !== worker) return
        setSolverError(event.message || 'The solver could not be completed.')
        setIsPreparingRun(false)
        solverWorkerRef.current = null
        worker.terminate()
      }
      worker.postMessage({ board: cloneSudokuBoard(board), method: 'mrv-forward', captureEvents: true })
    } catch (error) {
      setSolverError(error.message || 'The solver worker could not be started.')
      setIsPreparingRun(false)
    }
  }

  function startSolver() {
    if (isPreparingRun) return
    if (events.length === 0) {
      generateRun({ autoplay: true })
      return
    }
    if (stepIndex >= events.length) {
      setStepIndex(0)
    }
    setIsPlaying(true)
  }

  function advanceOneStep() {
    if (isPreparingRun) return
    if (events.length === 0) {
      generateRun({ firstStep: true })
      return
    }
    setStepIndex((current) => Math.min(current + 1, events.length))
  }

  function resetSolver() {
    setBoard(cloneSudokuBoard(clues))
    clearPlayback()
    clearComparisons()
  }

  function runComparison(method) {
    if (comparisonWorkersRef.current.has(method)) return
    setActiveComparisons((current) => current.includes(method) ? current : [...current, method])
    setComparisonErrors((current) => ({ ...current, [method]: '' }))
    try {
      const worker = new Worker(
        new URL('../puzzles/sudoku/sudokuComparisonWorker.js', import.meta.url),
        { type: 'module' },
      )
      comparisonWorkersRef.current.set(method, worker)
      worker.onmessage = ({ data }) => {
        if (comparisonWorkersRef.current.get(method) !== worker) return
        setComparisonRuns((current) => ({ ...current, [data.method]: data }))
        comparisonWorkersRef.current.delete(method)
        setActiveComparisons((current) => current.filter((activeMethod) => activeMethod !== method))
        worker.terminate()
      }
      worker.onerror = (event) => {
        if (comparisonWorkersRef.current.get(method) !== worker) return
        setComparisonErrors((current) => ({
          ...current,
          [method]: event.message || 'The comparison run could not be completed.',
        }))
        comparisonWorkersRef.current.delete(method)
        setActiveComparisons((current) => current.filter((activeMethod) => activeMethod !== method))
        worker.terminate()
      }
      worker.postMessage({ board: cloneSudokuBoard(board), method })
    } catch (error) {
      const worker = comparisonWorkersRef.current.get(method)
      worker?.terminate()
      comparisonWorkersRef.current.delete(method)
      setComparisonErrors((current) => ({
        ...current,
        [method]: error.message || 'The comparison worker could not be started.',
      }))
      setActiveComparisons((current) => current.filter((activeMethod) => activeMethod !== method))
    }
  }

  function jumpToStep(nextStep) {
    setIsPlaying(false)
    setStepIndex(nextStep)
  }

  return (
    <div className="app-shell sudoku-page">
      <TopNavigation />
      <main className="sudoku-main">
        <div className="sudoku-heading">
          <Link className="back-link" to="/">
            <ArrowLeft size={16} aria-hidden="true" />
            Puzzle library
          </Link>
          <div className="sudoku-title-row">
            <div>
              <span className="eyebrow"><span className="eyebrow-dot" aria-hidden="true" />CSP search visualization</span>
              <h1>Sudoku Solver</h1>
              <p className="sudoku-subtitle">CSP · Backtracking · MRV · Forward Checking</p>
            </div>
            <span className="heuristic-badge"><SlidersHorizontal size={14} aria-hidden="true" />MRV + Forward Checking</span>
          </div>
        </div>

        <SolverControls
          difficulty={difficulty}
          isPlaying={isPlaying}
          isPreparing={isPreparingRun}
          onLoadPuzzle={loadPuzzle}
          onClearBoard={clearBoard}
          onStart={startSolver}
          onPause={() => setIsPlaying(false)}
          onNextStep={advanceOneStep}
          onReset={resetSolver}
          speed={speed}
          onSpeedChange={setSpeed}
          stepIndex={stepIndex}
          totalSteps={events.length}
        />

        {(conflicts.length > 0 || currentError || solverError) && (
          <div className="sudoku-alert" role="alert">
            <CircleAlert size={17} aria-hidden="true" />
            <span>{currentError || solverError || 'This Sudoku configuration is invalid.'}</span>
          </div>
        )}

        <div className="sudoku-workspace">
          <section className="board-panel panel" aria-labelledby="board-title">
            <header className="panel-heading board-heading">
              <div>
                <span className="panel-kicker">{difficulty} puzzle</span>
                <h2 id="board-title">Sudoku Board</h2>
              </div>
              <span className="board-size">9 × 9</span>
            </header>
            <SudokuBoard
              board={board}
              clues={clues}
              events={visibleEvents}
              onCellChange={editCell}
              solved={solved}
            />
          </section>
          <LiveSolverActivity
            events={visibleEvents}
            stepIndex={stepIndex}
            explanationMode={explanationMode}
            onExplanationModeChange={setExplanationMode}
          />

          <StatisticsPanel events={visibleEvents} elapsedMs={elapsedMs} />
          <SearchDepthPanel events={visibleEvents} />
          {solved && <SolutionSummary events={visibleEvents} elapsedMs={elapsedMs} steps={stepIndex} />}
          <SolverTimeline events={visibleEvents} stepIndex={stepIndex} onJumpToStep={jumpToStep} />
          <HeuristicImpact
            comparisonRuns={comparisonRuns}
            activeMethods={activeComparisons}
            comparisonErrors={comparisonErrors}
            onRun={runComparison}
          />
          <SearchSpaceReduction events={visibleEvents} comparisonRuns={comparisonRuns} />
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

export default SudokuPage