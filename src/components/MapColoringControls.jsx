const playbackSpeeds = [0.25, 0.5, 1, 2, 4]

function MapColoringControls({
  scenario,
  colorCount,
  onScenarioChange,
  onColorCountChange,
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
    <section className="map-coloring-controls" aria-label="Map Coloring controls">
      <label className="map-control-select">
        <span>Map</span>
        <select value={scenario} onChange={(event) => onScenarioChange(event.target.value)}>
          <option value="map">Seven-region map</option>
          <option value="k4">Complete graph K4</option>
        </select>
      </label>
      <label className="map-control-select">
        <span>Palette</span>
        <select value={colorCount} onChange={(event) => onColorCountChange(Number(event.target.value))}>
          <option value={3}>3 Colors</option>
          <option value={4}>4 Colors</option>
        </select>
      </label>

      <div className="map-playback-controls">
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

      <div className="map-speed-control" role="group" aria-label="Playback speed">
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

      <p className="map-step-count" aria-live="polite">Step {stepIndex} / {totalSteps}</p>
    </section>
  )
}

export default MapColoringControls