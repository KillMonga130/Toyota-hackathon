import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRaceStore } from '../store/raceStore';

export default function TelemetryOverlay() {
  const { selectedTrack, selectedRace } = useRaceStore();
  const [telemetry, setTelemetry] = useState<any>(null);
  const [currentFrame, setCurrentFrame] = useState(0);

  useEffect(() => {
    if (!selectedTrack || !selectedRace) return;

    axios.get('/api/race/' + selectedTrack + '/' + selectedRace)
      .then(response => {
        const data = response.data.telemetry || [];
        if (data.length > 0) {
          setTelemetry(data);
        }
      });
  }, [selectedTrack, selectedRace]);

  useEffect(() => {
    if (!telemetry) return;

    const interval = setInterval(() => {
      setCurrentFrame(prev => (prev + 1) % telemetry.length);
    }, 100);

    return () => clearInterval(interval);
  }, [telemetry]);

  if (!telemetry || telemetry.length === 0) return null;

  const current = telemetry[currentFrame];
  const speed = current?.Speed || 0;
  const rpm = current?.nmot || 0;
  const gear = current?.Gear || 0;
  const throttle = current?.ath || 0;
  const brake = (current?.pbrake_f || 0) + (current?.pbrake_r || 0);

  return (
    <div className="absolute bottom-4 right-4 bg-black/90 rounded-lg p-4 border border-border min-w-[200px]">
      <div className="text-xs text-text-secondary mb-3 font-semibold">LIVE TELEMETRY</div>
      
      <div className="space-y-3">
        {/* Speed */}
        <div>
          <div className="text-xs text-gray-500 mb-1">Speed</div>
          <div className="text-2xl font-bold text-white tabular-nums">
            {Math.round(speed)}
            <span className="text-sm text-gray-500 ml-1">km/h</span>
          </div>
        </div>

        {/* RPM & Gear */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-gray-500 mb-1">RPM</div>
            <div className="text-lg font-semibold text-cyan-400 tabular-nums">
              {Math.round(rpm)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Gear</div>
            <div className="text-lg font-semibold text-white">
              {gear === 0 ? 'N' : gear}
            </div>
          </div>
        </div>

        {/* Throttle */}
        <div>
          <div className="text-xs text-gray-500 mb-1">Throttle</div>
          <div className="w-full bg-background-secondary rounded-full h-2">
            <div
              className="h-2 bg-green-500 rounded-full transition-all"
              style={{ width: `${throttle}%` }}
            />
          </div>
        </div>

        {/* Brake */}
        <div>
          <div className="text-xs text-gray-500 mb-1">Brake</div>
          <div className="w-full bg-background-secondary rounded-full h-2">
            <div
              className="h-2 bg-red-500 rounded-full transition-all"
              style={{ width: `${Math.min(brake / 2, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

