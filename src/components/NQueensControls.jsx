const playbackSpeeds = [0.25, 0.5, 1, 2, 4]
const boardSizes = Array.from({ length: 11 }, (_, index) => index + 2)

function NQueensControls({
  size,
  onSizeChange,
  isPlaying,
  isPreparing,
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
    <section className="nqueens-controls" aria-label="N-Queens solver controls">
      <label className="nqueens-size-select">
        <span>Board size</span>
        <select value={size} onChange={(event) => onSizeChange(Number(event.target.value))}>
          {boardSizes.map((boardSize) => (
            <option key={boardSize} value={boardSize}>
              {boardSize}{boardSize === 2 || boardSize === 3 ? ' · no solution' : ''}
            </option>
          ))}
        </select>
      </label>

      <div className="nqueens-playback">
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
          Next Step
        </button>
        <button className="secondary-button" type="button" onClick={onReset}>
          Reset
        </button>
      </div>

      <div className="nqueens-speed" role="group" aria-label="Playback speed">
        <span>Speed</span>
        <div className="speed-options">
          {playbackSpeeds.map((playbackSpeed) => (
            <button
              aria-pressed={speed === playbackSpeed}
              className={speed === playbackSpeed ? 'speed-option is-active' : 'speed-option'}
              key={playbackSpeed}
              onClick={() => onSpeedChange(playbackSpeed)}
              type="button"
            >
              {playbackSpeed}x
            </button>
          ))}
        </div>
      </div>

      <p className="nqueens-step-count" aria-live="polite">Step {stepIndex} / {totalSteps}</p>
    </section>
  )
}

export default NQueensControls