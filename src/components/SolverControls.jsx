const speeds = [0.25, 0.5, 1, 2, 4]

function SolverControls({
  difficulty,
  isPlaying,
  isPreparing,
  onLoadPuzzle,
  onClearBoard,
  onStart,
  onPause,
  onNextStep,
  onReset,
  speed,
  onSpeedChange,
  stepIndex,
  totalSteps,
}) {
  return (
    <section className="solver-controls" aria-label="Solver controls">
      <div className="puzzle-actions">
        <label className="difficulty-select">
          <span>Puzzle</span>
          <select value={difficulty} onChange={(event) => onLoadPuzzle(event.target.value)}>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
            <option value="Custom">Custom</option>
          </select>
        </label>
        <button className="secondary-button" type="button" onClick={onClearBoard}>
          Clear board
        </button>
      </div>

      <div className="playback-controls">
        <button className="primary-button" type="button" onClick={onStart} disabled={isPlaying || isPreparing}>
          {isPreparing ? 'Preparing...' : stepIndex >= totalSteps && totalSteps > 0 ? 'Replay' : stepIndex > 0 ? 'Resume' : 'Start'}
        </button>
        <button className="secondary-button" type="button" onClick={onPause} disabled={!isPlaying}>
          Pause
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={onNextStep}
          disabled={isPlaying || isPreparing || stepIndex >= totalSteps && totalSteps > 0}
        >
          Next step
        </button>
        <button className="secondary-button" type="button" onClick={onReset}>
          Reset
        </button>
      </div>

      <div className="speed-control" role="group" aria-label="Playback speed">
        <span>Speed</span>
        <div className="speed-options">
          {speeds.map((value) => (
            <button
              key={value}
              className={speed === value ? 'speed-option is-active' : 'speed-option'}
              type="button"
              aria-pressed={speed === value}
              onClick={() => onSpeedChange(value)}
            >
              {value}x
            </button>
          ))}
        </div>
      </div>
      <p className="step-counter" aria-live="polite">
        Step {stepIndex} / {totalSteps}
      </p>
    </section>
  )
}

export default SolverControls