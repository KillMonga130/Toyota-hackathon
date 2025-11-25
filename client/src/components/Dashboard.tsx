import { useRef, useState } from 'react';
import { useRaceStore } from '../store/raceStore';
import { useTelemetryLoader } from '../hooks/useTelemetryLoader';
import {
  useRaceCoach,
  type FeedbackEvent,
  type ReportCardSummary,
} from '../hooks/useRaceCoach';

/**
 * Telemetry Dashboard - Racing telemetry overlay
 * Displays live telemetry data and playback controls
 * Positioned as an absolute overlay at the bottom of the screen
 */
export default function Dashboard() {
  const {
    telemetryData,
    currentFrameIndex,
    isPlaying,
    setIsPlaying,
    setCurrentFrameIndex,
    visualizationMode,
    setVisualizationMode,
  } = useRaceStore();
  
  const { loadTelemetry, isLoading, error } = useTelemetryLoader();
  const {
    currentScore,
    breakdown,
    feedbackEvents,
    latestFeedback,
    ggPoint,
    reportCard,
    showReportCard,
    closeReportCard,
  } = useRaceCoach();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Handle file selection
  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    // Just pass the file directly!
    loadTelemetry(file);
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

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

  // Show file upload UI if no data loaded
  if (totalFrames === 0) {
    return (
      <div className="absolute bottom-0 left-0 right-0 z-50 p-6">
        <div className="space-y-4">
          <div
            className={`bg-black/80 backdrop-blur-sm border-2 border-dashed rounded-lg p-8 font-mono transition-colors ${
              isDragging ? 'border-primary bg-primary/10' : 'border-gray-700'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="text-4xl mb-2">📂</div>
              <div className="text-white text-lg font-semibold uppercase tracking-wider">
                Drop Telemetry Data Here
              </div>
              <div className="text-gray-400 text-sm text-center">
                Look for files ending in <span className="text-primary font-mono">_telemetry_data.csv</span>
              </div>
              <div className="text-yellow-400 text-xs text-center mt-2 px-4 py-2 bg-yellow-900/20 border border-yellow-800/50 rounded">
                ⚠️ Note: For performance, only the first 50,000 frames will be loaded.
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="px-6 py-3 bg-primary hover:bg-primary-dark rounded-lg font-semibold text-white transition-colors uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Loading...' : 'Browse Files'}
              </button>
            </div>
          </div>

          {/* Error Display - Bright Red Box */}
          {error && (
            <div className="bg-red-600 border-2 border-red-400 rounded-lg p-4 font-mono">
              <div className="text-white font-bold text-sm uppercase tracking-wider mb-1">
                ⚠️ Upload Error
              </div>
              <div className="text-red-100 text-sm">{error}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Instructor HUD */}
      <div className="absolute top-0 right-0 z-50 p-6 hidden lg:flex pointer-events-none">
        <CoachHud
          score={currentScore}
          breakdown={breakdown}
          ggPoint={ggPoint}
          feedbackEvents={feedbackEvents}
          latestFeedback={latestFeedback}
        />
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-40 p-6">
        <div className="bg-black/80 backdrop-blur-sm border border-gray-800 rounded-lg p-6 font-mono">
          <div className="flex flex-col gap-6">
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
            {/* Visualization Mode Toggle */}
            <div className="flex items-center gap-2 bg-black/60 rounded-lg p-1 border border-gray-700">
              <button
                onClick={() => setVisualizationMode('speed')}
                className={`px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${
                  visualizationMode === 'speed'
                    ? 'bg-primary text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Speed
              </button>
              <button
                onClick={() => setVisualizationMode('input')}
                className={`px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${
                  visualizationMode === 'input'
                    ? 'bg-primary text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Input
              </button>
            </div>

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

            {/* Feedback ticker for smaller screens */}
            <div className="lg:hidden bg-gray-900/70 border border-gray-800 rounded-lg p-4 text-sm text-gray-200 font-mono">
              <div className="text-xs uppercase text-gray-500 mb-1 tracking-widest">Instructor</div>
              <div className="text-primary">
                {latestFeedback?.message ?? 'Clean inputs. Keep pushing.'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showReportCard && reportCard && (
        <ReportCardModal summary={reportCard} onClose={closeReportCard} />
      )}
    </>
  );
}

interface CoachHudProps {
  score: number;
  breakdown: { braking: number; throttle: number; smoothness: number };
  ggPoint: { latG: number; longG: number; utilization: number };
  feedbackEvents: FeedbackEvent[];
  latestFeedback: FeedbackEvent | null;
}

function CoachHud({ score, breakdown, ggPoint, feedbackEvents, latestFeedback }: CoachHudProps) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const scoreColor =
    clampedScore >= 80 ? '#22c55e' : clampedScore >= 50 ? '#facc15' : '#f97316';
  const ringStyle = {
    background: `conic-gradient(${scoreColor} ${clampedScore}%, rgba(15,23,42,0.8) ${clampedScore}% 100%)`,
  };

  return (
    <div className="flex gap-6 pointer-events-auto">
      <div className="bg-black/70 border border-gray-800 rounded-2xl p-6 w-64 shadow-2xl shadow-black/60">
        <div className="text-xs text-gray-500 uppercase tracking-[0.3em] mb-4">Driving Score</div>
        <div className="flex items-center gap-4">
          <div className="relative w-28 h-28">
            <div className="absolute inset-0 rounded-full" style={ringStyle} />
            <div className="absolute inset-[0.45rem] rounded-full bg-black/90 flex flex-col items-center justify-center">
              <span className="text-[10px] uppercase text-gray-500 tracking-widest">Live</span>
              <span className="text-3xl font-bold text-white">{clampedScore}</span>
            </div>
          </div>
          <div className="text-xs text-gray-300 space-y-2">
            <BreakdownBar label="Trail Brake" value={breakdown.braking} />
            <BreakdownBar label="Throttle" value={breakdown.throttle} />
            <BreakdownBar label="Smoothness" value={breakdown.smoothness} />
          </div>
        </div>
        <div className="mt-4 text-xs text-gray-400">
          {latestFeedback?.message ?? 'Telemetry looks tidy.'}
        </div>
      </div>

      <div className="bg-black/70 border border-gray-800 rounded-2xl p-6 w-64 shadow-2xl shadow-black/60">
        <div className="text-xs text-gray-500 uppercase tracking-[0.3em] mb-4">Friction Circle</div>
        <GGDiagram ggPoint={ggPoint} />
        <div className="mt-4 text-xs text-gray-400 flex items-center justify-between">
          <span>Utilization</span>
          <span className="text-primary font-semibold">
            {(ggPoint.utilization * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="bg-black/70 border border-gray-800 rounded-2xl p-6 w-72 shadow-2xl shadow-black/60 hidden xl:flex flex-col">
        <div className="text-xs text-gray-500 uppercase tracking-[0.3em] mb-4">
          Coach Feed
        </div>
        <div className="space-y-3 text-sm text-gray-200">
          {feedbackEvents.length === 0 && <div>Awaiting telemetry...</div>}
          {feedbackEvents.map((event) => (
            <div
              key={event.id}
              className="border border-gray-800 rounded-lg px-3 py-2 bg-gray-900/60"
            >
              <span className="text-primary mr-2">•</span>
              {event.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BreakdownBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span>{label}</span>
        <span className="text-white">{value}</span>
      </div>
      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-200"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function GGDiagram({ ggPoint }: { ggPoint: { latG: number; longG: number; utilization: number } }) {
  const radius = 70;
  const limit = 1.5;
  const clampG = (value: number) => Math.max(-limit, Math.min(limit, value));
  const long = clampG(ggPoint.longG);
  const lat = clampG(ggPoint.latG);
  const x = radius + (long / limit) * radius;
  const y = radius - (lat / limit) * radius;

  return (
    <svg width={radius * 2} height={radius * 2} className="text-gray-700">
      <circle cx={radius} cy={radius} r={radius} fill="none" stroke="#1f2937" strokeWidth="2" />
      <circle
        cx={radius}
        cy={radius}
        r={radius * (ggPoint.utilization || 1)}
        fill="none"
        stroke="#374151"
        strokeDasharray="4 6"
      />
      <line x1={radius} y1={0} x2={radius} y2={radius * 2} stroke="#1f2937" strokeWidth="1" />
      <line x1={0} y1={radius} x2={radius * 2} y2={radius} stroke="#1f2937" strokeWidth="1" />
      <circle cx={x} cy={y} r={6} fill="#ef4444" />
    </svg>
  );
}

function ReportCardModal({
  summary,
  onClose,
}: {
  summary: ReportCardSummary;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
      <div className="bg-gray-950 border border-gray-800 rounded-3xl max-w-xl w-full p-8 text-gray-100 font-mono">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-[0.4em]">Report Card</div>
            <div className="text-4xl font-bold text-white mt-2">{summary.grade}</div>
            <div className="text-sm text-gray-400">{summary.summary}</div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-4">
            <div className="text-xs uppercase text-gray-500 tracking-widest mb-1">
              Best Corner
            </div>
            <div className="text-lg text-white">
              {summary.bestCorner ?? 'Collect more laps for data'}
            </div>
          </div>
          <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-4">
            <div className="text-xs uppercase text-gray-500 tracking-widest mb-1">
              Focus Area
            </div>
            <div className="text-lg text-white">
              {summary.improvement ?? 'Keep doing what you are doing.'}
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3 text-xs text-gray-400">
          <BreakdownBar label="Trail Brake" value={summary.breakdown.braking} />
          <BreakdownBar label="Throttle" value={summary.breakdown.throttle} />
          <BreakdownBar label="Smoothness" value={summary.breakdown.smoothness} />
        </div>
      </div>
    </div>
  );
}
