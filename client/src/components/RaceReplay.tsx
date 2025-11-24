import { useState, useEffect, useRef } from 'react';
import { useRaceStore } from '../store/raceStore';
import axios from 'axios';

interface ReplayState {
  isPlaying: boolean;
  currentTime: number;
  playbackSpeed: number;
  totalTime: number;
}

export default function RaceReplay() {
  const { selectedTrack, selectedRace } = useRaceStore();
  const [replayState, setReplayState] = useState<ReplayState>({
    isPlaying: false,
    currentTime: 0,
    playbackSpeed: 1,
    totalTime: 0
  });
  const [telemetry, setTelemetry] = useState<any[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!selectedTrack || !selectedRace) return;

    axios.get('/api/race/' + selectedTrack + '/' + selectedRace)
      .then(response => {
        const data = response.data.telemetry || [];
        setTelemetry(data);
        if (data.length > 0) {
          const firstTime = new Date(data[0].meta_time).getTime();
          const lastTime = new Date(data[data.length - 1].meta_time).getTime();
          setReplayState(prev => ({
            ...prev,
            totalTime: (lastTime - firstTime) / 1000
          }));
        }
      });
  }, [selectedTrack, selectedRace]);

  useEffect(() => {
    if (replayState.isPlaying) {
      intervalRef.current = setInterval(() => {
        setReplayState(prev => {
          const newTime = prev.currentTime + 0.1 * prev.playbackSpeed;
          if (newTime >= prev.totalTime) {
            return { ...prev, isPlaying: false, currentTime: prev.totalTime };
          }
          return { ...prev, currentTime: newTime};
        });
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [replayState.isPlaying, replayState.playbackSpeed]);

  const handleSeek = (progress: number) => {
    setReplayState(prev => ({
      ...prev,
      currentTime: prev.totalTime * progress,
      isPlaying: false
    }));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, '0')}`;
  };

  const progress = replayState.totalTime > 0
    ? (replayState.currentTime / replayState.totalTime) * 100
    : 0;

  return (
    <div className="bg-background-tertiary border border-border rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Race Replay</h2>

      <div className="space-y-4">
        {/* Timeline */}
        <div>
          <div className="flex justify-between text-xs text-text-secondary mb-2">
            <span>{formatTime(replayState.currentTime)}</span>
            <span>{formatTime(replayState.totalTime)}</span>
          </div>
          <div className="relative">
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => handleSeek(parseFloat(e.target.value) / 100)}
              className="w-full h-2 bg-background-tertiary rounded-lg appearance-none cursor-pointer slider"
            />
            <div
              className="absolute top-0 left-0 h-2 bg-primary rounded-lg pointer-events-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setReplayState(prev => ({ ...prev, isPlaying: !prev.isPlaying }))}
            className="px-6 py-2 bg-primary hover:bg-red-700 rounded font-semibold transition-colors"
          >
            {replayState.isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>

          <button
            onClick={() => setReplayState(prev => ({ ...prev, currentTime: 0 }))}
            className="px-4 py-2 bg-background-tertiary hover:bg-background-tertiary rounded text-sm"
          >
            ⏮ Reset
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-text-secondary">Speed:</span>
            {[0.5, 1, 2, 4].map(speed => (
              <button
                key={speed}
                onClick={() => setReplayState(prev => ({ ...prev, playbackSpeed: speed }))}
                className={`px-3 py-1 rounded text-sm ${
                  replayState.playbackSpeed === speed
                    ? 'bg-primary text-white'
                    : 'bg-background-tertiary text-text-secondary hover:bg-background-tertiary'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* Current Frame Info */}
        {telemetry.length > 0 && (
          <div className="bg-black/50 p-4 rounded">
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-text-secondary">Frame</div>
                <div className="font-bold">
                  {Math.floor((replayState.currentTime / replayState.totalTime) * telemetry.length)}
                </div>
              </div>
              <div>
                <div className="text-text-secondary">Progress</div>
                <div className="font-bold">{progress.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-text-secondary">Playback</div>
                <div className="font-bold">{replayState.playbackSpeed}x</div>
              </div>
              <div>
                <div className="text-text-secondary">Status</div>
                <div className={`font-bold ${replayState.isPlaying ? 'text-green-400' : 'text-text-secondary'}`}>
                  {replayState.isPlaying ? 'Playing' : 'Paused'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: #EB0A1E;
          border-radius: 50%;
          cursor: pointer;
        }
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #EB0A1E;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}

