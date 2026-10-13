const speeds = [0.25, 0.5, 1, 2, 4]

function KakuroControls({
  puzzleId,
  puzzles,
  isPlaying,
  isPreparing,
  onPuzzleChange,
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
    <section className="kakuro-controls" aria-label="Kakuro solver controls">
      <label className="kakuro-puzzle-select">
        <span>Puzzle</span>
        <select value={puzzleId} onChange={(event) => onPuzzleChange(event.target.value)}>
          {puzzles.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
        </select>
      </label>

      <div className="kakuro-playback-controls">
        <button className="primary-button" type="button" onClick={onStart} disabled={isPlaying || isPreparing}>
          {isPreparing ? 'Preparing...' : stepIndex >= totalSteps && totalSteps > 0 ? 'Replay' : stepIndex > 0 ? 'Resume' : 'Start'}
        </button>
        <button className="secondary-button" type="button" onClick={onPause} disabled={!isPlaying}>Pause</button>
        <button
          className="secondary-button"
          type="button"
          onClick={onNextStep}
          disabled={isPlaying || isPreparing || stepIndex >= totalSteps && totalSteps > 0}
        >
          Next Step
        </button>
        <button className="secondary-button" type="button" onClick={onReset}>Reset</button>
      </div>

      <div className="kakuro-speed" role="group" aria-label="Playback speed">
        <span>Speed</span>
        <div className="speed-options">
          {speeds.map((value) => (
            <button
              aria-pressed={speed === value}
              className={speed === value ? 'speed-option is-active' : 'speed-option'}
              key={value}
              onClick={() => onSpeedChange(value)}
              type="button"
            >
              {value}x
            </button>
          ))}
        </div>
      </div>
      <p className="kakuro-step-count" aria-live="polite">Step {stepIndex} / {totalSteps}</p>
    </section>
  )
}

export default KakuroControls