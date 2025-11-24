import { useRaceStore } from '../store/raceStore';

/**
 * Telemetry Dashboard - Racing telemetry overlay
 * Displays live telemetry data and playback controls
 */
export default function TelemetryDashboard() {
  const {
    telemetryData,
    currentFrameIndex,
    isPlaying,
    setIsPlaying,
    setCurrentFrameIndex,
  } = useRaceStore();

  // Get current data point
  const currentData = telemetryData[currentFrameIndex];
  const totalFrames = telemetryData.length;

  // Handle seek bar change
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIndex = parseInt(e.target.value, 10);
    if (!isNaN(newIndex) && newIndex >= 0 && newIndex < totalFrames) {
      setCurrentFrameIndex(newIndex);
    }
  };

  // Format speed display
  const speed = currentData?.speed ?? 0;
  const speedDisplay = `${Math.round(speed)} km/h`;

  // Format gear display (only show if available)
  const gear = currentData?.gear;

  if (totalFrames === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 z-50 p-6">
      <div className="bg-black/80 backdrop-blur-sm border border-gray-800 rounded-lg p-6 font-mono">
        <div className="flex items-center justify-between gap-8">
          {/* Live Telemetry Display */}
          <div className="flex items-center gap-8">
            {/* Speed - Large Display */}
            <div className="flex flex-col">
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                Speed
              </div>
              <div className="text-5xl font-bold text-green-400 tabular-nums">
                {speedDisplay}
              </div>
            </div>

            {/* Gear - Only show if available */}
            {gear !== undefined && gear !== null && (
              <div className="flex flex-col">
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                  Gear
                </div>
                <div className="text-4xl font-bold text-blue-400 tabular-nums">
                  {gear}
                </div>
              </div>
            )}

            {/* Frame Info */}
            <div className="flex flex-col">
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                Frame
              </div>
              <div className="text-sm text-gray-300 tabular-nums">
                {currentFrameIndex + 1} / {totalFrames}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-6">
            {/* Play/Pause Button */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-6 py-3 bg-primary hover:bg-primary-dark rounded-lg font-semibold text-white transition-colors uppercase tracking-wider text-sm"
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>

            {/* Seek Bar */}
            <div className="flex items-center gap-4 min-w-[300px]">
              <span className="text-xs text-gray-400 tabular-nums w-12 text-right">
                0
              </span>
              <input
                type="range"
                min={0}
                max={Math.max(0, totalFrames - 1)}
                value={currentFrameIndex}
                onChange={handleSeek}
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                style={{
                  background: `linear-gradient(to right, #DC2626 0%, #DC2626 ${
                    (currentFrameIndex / Math.max(1, totalFrames - 1)) * 100
                  }%, #374151 ${
                    (currentFrameIndex / Math.max(1, totalFrames - 1)) * 100
                  }%, #374151 100%)`,
                }}
              />
              <span className="text-xs text-gray-400 tabular-nums w-12">
                {totalFrames - 1}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

