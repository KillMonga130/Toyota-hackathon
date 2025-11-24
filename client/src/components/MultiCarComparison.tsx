import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRaceStore } from '../store/raceStore';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function MultiCarComparison() {
  const { selectedTrack, selectedRace } = useRaceStore();
  const [vehicles, setVehicles] = useState<string[]>([]);
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedTrack || !selectedRace) return;

    axios.get('/api/race/' + selectedTrack + '/' + selectedRace)
      .then(response => {
        const vehicleList = [...new Set(response.data.telemetry.map((t: any) => t.vehicle_id))] as string[];
        setVehicles(vehicleList);
        setSelectedVehicles(vehicleList.slice(0, 3)); // Default to first 3
      });
  }, [selectedTrack, selectedRace]);

  useEffect(() => {
    if (!selectedTrack || !selectedRace || selectedVehicles.length === 0) return;

    setLoading(true);
    Promise.all(
      selectedVehicles.map(vehicleId =>
        axios.post('/api/analytics/driver-performance', {
          track: selectedTrack,
          race: selectedRace,
          vehicleId
        }).then(res => ({ vehicleId, ...res.data.performance }))
      )
    ).then(results => {
      setComparisonData(results);
      setLoading(false);
    }).catch(console.error);
  }, [selectedTrack, selectedRace, selectedVehicles]);

  const chartData = comparisonData.map(d => ({
    vehicle: d.vehicle_id,
    bestLap: d.bestLap,
    averageLap: d.averageLap,
    consistency: d.consistency
  }));

  const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div className="bg-background-tertiary border border-border rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Multi-Car Comparison</h2>

      {/* Vehicle Selection */}
      <div className="mb-6 flex flex-wrap gap-2">
        {vehicles.map((vehicle, i) => (
          <button
            key={vehicle}
            onClick={() => {
              if (selectedVehicles.includes(vehicle)) {
                setSelectedVehicles(selectedVehicles.filter(v => v !== vehicle));
              } else if (selectedVehicles.length < 5) {
                setSelectedVehicles([...selectedVehicles, vehicle]);
              }
            }}
            className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${
              selectedVehicles.includes(vehicle)
                ? 'bg-primary text-white'
                : 'bg-background-tertiary text-text-secondary hover:bg-background-tertiary'
            }`}
          >
            {vehicle}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-text-secondary py-12">Loading comparison...</div>
      ) : comparisonData.length > 0 ? (
        <div className="space-y-6">
          {/* Performance Chart */}
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="vehicle" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #374151' }}
              />
              <Legend />
              <Bar dataKey="bestLap" fill="#ef4444" name="Best Lap (s)" />
              <Bar dataKey="averageLap" fill="#3b82f6" name="Average Lap (s)" />
            </BarChart>
          </ResponsiveContainer>

          {/* Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3">Vehicle</th>
                  <th className="text-right py-2 px-3">Best Lap</th>
                  <th className="text-right py-2 px-3">Avg Lap</th>
                  <th className="text-right py-2 px-3">Consistency</th>
                  <th className="text-right py-2 px-3">Gap to Best</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData
                  .sort((a, b) => a.bestLap - b.bestLap)
                  .map((data, i) => {
                    const bestBestLap = Math.min(...comparisonData.map(d => d.bestLap));
                    const gap = data.bestLap - bestBestLap;
                    return (
                      <tr
                        key={data.vehicle_id}
                        className={`border-b border-border ${
                          i === 0 ? 'bg-green-900/20' : ''
                        }`}
                      >
                        <td className="py-2 px-3 font-mono text-xs">{data.vehicle_id}</td>
                        <td className="py-2 px-3 text-right">
                          {data.bestLap > 0 ? `${Math.floor(data.bestLap / 60)}:${(data.bestLap % 60).toFixed(3).padStart(6, '0')}` : '--'}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {data.averageLap > 0 ? `${Math.floor(data.averageLap / 60)}:${(data.averageLap % 60).toFixed(3).padStart(6, '0')}` : '--'}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span className={data.consistency > 80 ? 'text-green-400' : data.consistency > 60 ? 'text-yellow-400' : 'text-red-400'}>
                            {data.consistency.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          {i === 0 ? (
                            <span className="text-green-400 font-bold">Leader</span>
                          ) : (
                            <span className="text-text-secondary">+{gap.toFixed(3)}s</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center text-text-secondary py-12">Select vehicles to compare</div>
      )}
    </div>
  );
}

