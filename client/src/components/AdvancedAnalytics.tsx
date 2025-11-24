import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRaceStore } from '../store/raceStore';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

export default function AdvancedAnalytics() {
  const { selectedTrack, selectedRace } = useRaceStore();
  const [overtakeOps, setOvertakeOps] = useState<any[]>([]);
  const [sectorPerf, setSectorPerf] = useState<any[]>([]);
  const [lapComparison, setLapComparison] = useState<any[]>([]);
  const [prediction, setPrediction] = useState<any>(null);
  const [racingLine, setRacingLine] = useState<any>(null);
  const [criticalMoments, setCriticalMoments] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');

  useEffect(() => {
    if (!selectedTrack || !selectedRace) return;

    // Get first vehicle
    axios.get('/api/race/' + selectedTrack + '/' + selectedRace)
      .then(response => {
        const vehicles = [...new Set(response.data.telemetry.map((t: any) => t.vehicle_id))] as string[];
        if (vehicles.length > 0) {
          setSelectedVehicle(vehicles[0]);
        }
      });
  }, [selectedTrack, selectedRace]);

  useEffect(() => {
    if (!selectedTrack || !selectedRace || !selectedVehicle) return;

    // Load all advanced analytics
    Promise.all([
      axios.post('/api/advanced/overtake-opportunities', {
        track: selectedTrack,
        race: selectedRace,
        currentLap: 10
      }),
      axios.post('/api/advanced/sector-performance', {
        track: selectedTrack,
        race: selectedRace,
        vehicleId: selectedVehicle
      }),
      axios.post('/api/advanced/lap-comparison', {
        track: selectedTrack,
        race: selectedRace,
        vehicleId: selectedVehicle
      }),
      axios.post('/api/advanced/predict-finish', {
        track: selectedTrack,
        race: selectedRace,
        currentLap: 10,
        totalLaps: 30
      }),
      axios.post('/api/advanced/racing-line', {
        track: selectedTrack,
        race: selectedRace,
        vehicleId: selectedVehicle
      }),
      axios.post('/api/advanced/critical-moments', {
        track: selectedTrack,
        race: selectedRace,
        vehicleId: selectedVehicle
      })
    ]).then(([ops, sectors, laps, pred, line, moments]) => {
      setOvertakeOps(ops.data.opportunities || []);
      setSectorPerf(sectors.data.performance || []);
      setLapComparison(laps.data.comparison || []);
      setPrediction(pred.data.prediction);
      setRacingLine(line.data.analysis);
      setCriticalMoments(moments.data.moments || []);
    }).catch(console.error);
  }, [selectedTrack, selectedRace, selectedVehicle]);

  const sectorRadarData = sectorPerf.map(s => ({
    sector: `S${s.sector}`,
    performance: s.consistency,
    improvement: s.improvement
  }));

  return (
    <div className="space-y-6">
      {/* Overtake Opportunities */}
      {overtakeOps.length > 0 && (
        <div className="bg-background-tertiary border border-border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-primary">Overtake Opportunities</h2>
          <div className="space-y-3">
            {overtakeOps.slice(0, 3).map((op, i) => (
              <div key={i} className="bg-black/50 p-4 rounded border border-yellow-700">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold text-yellow-300">
                      {op.vehicleId} → {op.targetVehicleId}
                    </div>
                    <div className="text-sm text-text-secondary">{op.reason}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-400">
                      {Math.round(op.confidence * 100)}%
                    </div>
                    <div className="text-xs text-text-secondary">Confidence</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Estimated Lap: {op.estimatedLap} | Sector: {op.sector}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sector Performance Radar */}
      {sectorPerf.length > 0 && (
        <div className="bg-background-tertiary border border-border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Sector Performance</h2>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={sectorRadarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="sector" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar
                name="Consistency"
                dataKey="performance"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.6}
              />
            </RadarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-3 gap-4 mt-4">
            {sectorPerf.map((s) => (
              <div key={s.sector} className="bg-black/50 p-3 rounded">
                <div className="text-xs text-text-secondary">Sector {s.sector}</div>
                <div className="text-lg font-bold">{s.bestTime.toFixed(2)}s</div>
                <div className="text-xs text-green-400">
                  {s.improvement > 0 ? `+${s.improvement.toFixed(1)}%` : `${s.improvement.toFixed(1)}%`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lap Comparison */}
      {lapComparison.length > 0 && (
        <div className="bg-background-tertiary border border-border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Lap Comparison</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={lapComparison.slice(0, 20)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="lap" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #374151' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="time"
                stroke="#ef4444"
                strokeWidth={2}
                name="Lap Time (s)"
              />
              <Line
                type="monotone"
                dataKey="speed"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Avg Speed (km/h)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Prediction & Racing Line */}
      <div className="grid grid-cols-2 gap-6">
        {prediction && (
          <div className="bg-background-tertiary border border-border rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Finish Prediction</h2>
            <div className="space-y-3">
              <div className="bg-black/50 p-4 rounded">
                <div className="text-sm text-text-secondary">Predicted Position</div>
                <div className="text-3xl font-bold text-primary">
                  P{prediction.predictedFinishPosition}
                </div>
              </div>
              <div className="bg-black/50 p-4 rounded">
                <div className="text-sm text-text-secondary">Predicted Time</div>
                <div className="text-2xl font-bold">
                  {Math.floor(prediction.predictedFinishTime / 60)}:
                  {(prediction.predictedFinishTime % 60).toFixed(0).padStart(2, '0')}
                </div>
              </div>
              <div className="text-xs text-text-secondary">
                Confidence: {Math.round(prediction.confidence * 100)}%
              </div>
              <div className="mt-4 space-y-1">
                {prediction.keyFactors.map((factor: string, i: number) => (
                  <div key={i} className="text-sm text-yellow-300">• {factor}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {racingLine && (
          <div className="bg-background-tertiary border border-border rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Racing Line Efficiency</h2>
            <div className="space-y-4">
              <div className="bg-black/50 p-4 rounded">
                <div className="text-sm text-text-secondary mb-2">Efficiency Score</div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-background-tertiary rounded-full h-4">
                    <div
                      className={`h-4 rounded-full ${
                        racingLine.efficiency > 80 ? 'bg-green-500' :
                        racingLine.efficiency > 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${racingLine.efficiency}%` }}
                    />
                  </div>
                  <div className="text-2xl font-bold">{racingLine.efficiency}%</div>
                </div>
              </div>
              <div className="space-y-2">
                {racingLine.recommendations.map((rec: string, i: number) => (
                  <div key={i} className="text-sm text-blue-300">• {rec}</div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Critical Moments */}
      {criticalMoments.length > 0 && (
        <div className="bg-background-tertiary border border-border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-red-400">Critical Moments</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {criticalMoments.slice(0, 10).map((moment, i) => (
              <div
                key={i}
                className={`bg-black/50 p-3 rounded border-l-4 ${
                  moment.severity === 3 ? 'border-red-500' :
                  moment.severity === 2 ? 'border-yellow-500' : 'border-orange-500'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-white">{moment.type.replace('_', ' ').toUpperCase()}</div>
                    <div className="text-sm text-text-secondary">{moment.description}</div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(moment.time).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

