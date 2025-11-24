import { useState, useEffect } from 'react';
import axios from 'axios';

interface DriverPerformanceProps {
  track: string | null;
  race: string | null;
}

export default function DriverPerformance({ track, race }: DriverPerformanceProps) {
  const [performance, setPerformance] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');

  useEffect(() => {
    if (!track || !race || !selectedVehicle) return;

    setLoading(true);
    axios.post('/api/analytics/driver-performance', {
      track,
      race,
      vehicleId: selectedVehicle
    })
      .then(response => {
        setPerformance(response.data.performance);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading performance:', error);
        setLoading(false);
      });
  }, [track, race, selectedVehicle]);

  useEffect(() => {
    if (!track || !race) return;

    // Get first vehicle ID
    axios.get('/api/race/' + track + '/' + race)
      .then(response => {
        const vehicles = [...new Set(response.data.telemetry.map((t: any) => t.vehicle_id))] as string[];
        if (vehicles.length > 0) {
          setSelectedVehicle(vehicles[0]);
        }
      })
      .catch(console.error);
  }, [track, race]);

  const formatTime = (seconds: number) => {
    if (!seconds) return '--';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, '0')}`;
  };

  return (
    <div className="bg-background-tertiary border border-border rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Driver Performance</h2>
      
      {loading ? (
        <div className="text-text-secondary text-sm">Loading...</div>
      ) : performance ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-black/50 rounded border border-border">
              <div className="text-xs text-text-secondary mb-1">Best Lap</div>
              <div className="text-lg font-bold text-green-400">
                {formatTime(performance.bestLap)}
              </div>
            </div>
            <div className="p-3 bg-black/50 rounded border border-border">
              <div className="text-xs text-text-secondary mb-1">Average Lap</div>
              <div className="text-lg font-bold">
                {formatTime(performance.averageLap)}
              </div>
            </div>
          </div>

          <div className="p-3 bg-black/50 rounded border border-border">
            <div className="text-xs text-text-secondary mb-1">Consistency</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-background-tertiary rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${performance.consistency}%` }}
                />
              </div>
              <span className="text-sm font-semibold">{performance.consistency.toFixed(1)}%</span>
            </div>
          </div>

          {performance.improvements && performance.improvements.length > 0 && (
            <div className="p-3 bg-yellow-900/20 rounded border border-yellow-700">
              <div className="text-xs text-yellow-300 mb-2 font-semibold">Areas for Improvement</div>
              <ul className="text-sm space-y-1">
                {performance.improvements.map((imp: string, i: number) => (
                  <li key={i} className="text-yellow-200">• {imp}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="text-text-secondary text-sm">Select a vehicle to view performance</div>
      )}
    </div>
  );
}

