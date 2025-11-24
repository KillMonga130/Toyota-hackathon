import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';

interface LapTimeChartProps {
  track: string | null;
  race: string | null;
}

export default function LapTimeChart({ track, race }: LapTimeChartProps) {
  const [lapData, setLapData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!track || !race) return;

    setLoading(true);
    axios.get('/api/race/' + track + '/' + race)
      .then(response => {
        // Process lap times from telemetry
        const vehicles = [...new Set(response.data.telemetry.map((t: any) => t.vehicle_id))];
        const vehicleId = vehicles[0];
        
        if (vehicleId) {
          const vehicleTelemetry = response.data.telemetry
            .filter((t: any) => t.vehicle_id === vehicleId)
            .slice(0, 1000); // Sample for performance

          // Group by approximate lap (simplified)
          const lapGroups = new Map<number, any[]>();
          vehicleTelemetry.forEach((point: any, index: number) => {
            const lap = Math.floor(index / 100); // Approximate lap grouping
            if (!lapGroups.has(lap)) lapGroups.set(lap, []);
            lapGroups.get(lap)!.push(point);
          });

          const data = Array.from(lapGroups.entries()).map(([lap, points]) => {
            const speeds = points.filter((p: any) => p.Speed).map((p: any) => p.Speed);
            const avgSpeed = speeds.length > 0
              ? speeds.reduce((a: number, b: number) => a + b, 0) / speeds.length
              : 0;
            return { lap: lap + 1, speed: Math.round(avgSpeed) };
          });

          setLapData(data);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading lap data:', error);
        setLoading(false);
      });
  }, [track, race]);

  if (loading) {
    return (
      <div className="bg-background-tertiary border border-border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Lap Analysis</h2>
        <div className="text-text-secondary text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-background-tertiary border border-border rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Average Speed by Lap</h2>
      {lapData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={lapData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="lap" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #374151' }}
              labelStyle={{ color: '#fff' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="speed"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Speed (km/h)"
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="text-text-secondary text-sm">No lap data available</div>
      )}
    </div>
  );
}

