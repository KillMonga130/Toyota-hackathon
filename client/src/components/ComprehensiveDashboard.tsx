import { useState, useEffect } from 'react';
import { useRaceStore } from '../store/raceStore';
import axios from 'axios';
import PositionTable from './PositionTable';
import StrategyPanel from './StrategyPanel';
import TireDegradationChart from './TireDegradationChart';
import LapTimeChart from './LapTimeChart';
import WeatherPanel from './WeatherPanel';
import DriverPerformance from './DriverPerformance';
import AdvancedAnalytics from './AdvancedAnalytics';
import MultiCarComparison from './MultiCarComparison';
import RaceReplay from './RaceReplay';
import Track3DView from './Track3DView';
import { AnimatedCard } from './AnimatedStats';

interface DashboardMetrics {
  totalVehicles: number;
  totalLaps: number;
  raceDuration: number;
  averageLapTime: number;
  fastestLap: number;
  slowestLap: number;
  totalDistance: number;
}

export default function ComprehensiveDashboard() {
  const { selectedTrack, selectedRace } = useRaceStore();
  const [loading, setLoading] = useState(true);
  const [strategy, setStrategy] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [currentLap, setCurrentLap] = useState(10);
  const [totalLaps] = useState(30);
  const [viewMode, setViewMode] = useState<'analytics' | '3d' | 'advanced' | 'comparison' | 'replay' | 'comprehensive'>('comprehensive');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5); // seconds

  useEffect(() => {
    if (!selectedTrack || !selectedRace) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const raceResponse = await axios.get('/api/race/' + selectedTrack + '/' + selectedRace);
        const vehicleIds = [...new Set(raceResponse.data.telemetry.map((t: any) => t.vehicle_id))];
        const vehicleId = vehicleIds[0] || '';

        // Load comprehensive strategy
        const strategyResponse = await axios.post('/api/strategy/race-strategy', {
          track: selectedTrack,
          race: selectedRace,
          vehicleId,
          currentLap,
          totalLaps
        });

        setStrategy(strategyResponse.data);
        setPositions(strategyResponse.data.positions || []);

        // Calculate metrics
        const telemetry = raceResponse.data.telemetry || [];
        const lapTimes = raceResponse.data.lapTimes || [];
        
        const vehicles = new Set(telemetry.map((t: any) => t.vehicle_id));
        const laps = new Set(lapTimes.map((l: any) => l.lap));
        
        const lapTimeValues: number[] = [];
        for (let i = 1; i < lapTimes.length; i++) {
          const prevTime = new Date(lapTimes[i - 1].meta_time).getTime();
          const currTime = new Date(lapTimes[i].meta_time).getTime();
          const diff = (currTime - prevTime) / 1000;
          if (diff > 0 && diff < 600) {
            lapTimeValues.push(diff);
          }
        }

        const firstTime = telemetry.length > 0 ? new Date(telemetry[0].meta_time).getTime() : 0;
        const lastTime = telemetry.length > 0 ? new Date(telemetry[telemetry.length - 1].meta_time).getTime() : 0;

        setMetrics({
          totalVehicles: vehicles.size,
          totalLaps: laps.size,
          raceDuration: (lastTime - firstTime) / 1000,
          averageLapTime: lapTimeValues.length > 0
            ? lapTimeValues.reduce((a, b) => a + b, 0) / lapTimeValues.length
            : 0,
          fastestLap: lapTimeValues.length > 0 ? Math.min(...lapTimeValues) : 0,
          slowestLap: lapTimeValues.length > 0 ? Math.max(...lapTimeValues) : 0,
          totalDistance: 0 // Would need to calculate from GPS
        });

        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };

    loadData();

    // Auto-refresh if enabled
    let interval: ReturnType<typeof setInterval> | null = null;
    if (autoRefresh) {
      interval = setInterval(loadData, refreshInterval * 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedTrack, selectedRace, currentLap, totalLaps, autoRefresh, refreshInterval]);

  if (loading && !strategy) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center text-text-secondary">Loading comprehensive race data...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      {/* Metrics Overview */}
      {metrics && (
        <AnimatedCard delay={0}>
          <div className="bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/50 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-primary">Race Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <div className="bg-black/50 p-4 rounded">
                <div className="text-xs text-text-secondary mb-1">Vehicles</div>
                <div className="text-2xl font-bold">{metrics.totalVehicles}</div>
              </div>
              <div className="bg-black/50 p-4 rounded">
                <div className="text-xs text-text-secondary mb-1">Total Laps</div>
                <div className="text-2xl font-bold">{metrics.totalLaps}</div>
              </div>
              <div className="bg-black/50 p-4 rounded">
                <div className="text-xs text-text-secondary mb-1">Duration</div>
                <div className="text-lg font-bold">
                  {Math.floor(metrics.raceDuration / 60)}:{(metrics.raceDuration % 60).toFixed(0).padStart(2, '0')}
                </div>
              </div>
              <div className="bg-black/50 p-4 rounded">
                <div className="text-xs text-text-secondary mb-1">Avg Lap</div>
                <div className="text-lg font-bold">
                  {Math.floor(metrics.averageLapTime / 60)}:{(metrics.averageLapTime % 60).toFixed(1).padStart(4, '0')}
                </div>
              </div>
              <div className="bg-black/50 p-4 rounded">
                <div className="text-xs text-text-secondary mb-1">Fastest</div>
                <div className="text-lg font-bold text-green-400">
                  {Math.floor(metrics.fastestLap / 60)}:{(metrics.fastestLap % 60).toFixed(3).padStart(6, '0')}
                </div>
              </div>
              <div className="bg-black/50 p-4 rounded">
                <div className="text-xs text-text-secondary mb-1">Slowest</div>
                <div className="text-lg font-bold text-red-400">
                  {Math.floor(metrics.slowestLap / 60)}:{(metrics.slowestLap % 60).toFixed(3).padStart(6, '0')}
                </div>
              </div>
              <div className="bg-black/50 p-4 rounded">
                <div className="text-xs text-text-secondary mb-1">Current Lap</div>
                <div className="text-2xl font-bold">{currentLap}/{totalLaps}</div>
              </div>
            </div>
          </div>
        </AnimatedCard>
      )}

      {/* Control Panel */}
      <AnimatedCard delay={100}>
        <div className="bg-background-tertiary border border-border rounded-lg p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex gap-2 flex-wrap">
              {(['analytics', '3d', 'advanced', 'comparison', 'replay', 'comprehensive'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-2 rounded text-sm font-semibold transition-colors capitalize ${
                    viewMode === mode
                      ? 'bg-primary text-white'
                      : 'bg-background-tertiary text-text-secondary hover:bg-background-tertiary'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4 ml-auto">
              <label className="text-sm text-text-secondary">Lap:</label>
              <input
                type="number"
                value={currentLap}
                onChange={(e) => setCurrentLap(parseInt(e.target.value) || 1)}
                min="1"
                max={totalLaps}
                className="bg-black border border-border rounded px-3 py-1 text-white w-20"
              />
              <span className="text-sm text-text-secondary">/ {totalLaps}</span>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                <span className="text-text-secondary">Auto-refresh</span>
              </label>
              {autoRefresh && (
                <input
                  type="number"
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(parseInt(e.target.value) || 5)}
                  min="1"
                  max="60"
                  className="bg-black border border-border rounded px-2 py-1 text-white w-16 text-sm"
                />
              )}
            </div>
          </div>
        </div>
      </AnimatedCard>

      {/* Main Content Based on View Mode */}
      {viewMode === 'comprehensive' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <AnimatedCard delay={200}>
              <PositionTable positions={positions} />
            </AnimatedCard>
            <AnimatedCard delay={300}>
              <AdvancedAnalytics />
            </AnimatedCard>
            <AnimatedCard delay={400}>
              <MultiCarComparison />
            </AnimatedCard>
          </div>
          <div className="space-y-6">
            <AnimatedCard delay={200}>
              <StrategyPanel strategy={strategy} currentLap={currentLap} />
            </AnimatedCard>
            <AnimatedCard delay={300}>
              <WeatherPanel weather={strategy?.weatherImpact} />
            </AnimatedCard>
            <AnimatedCard delay={400}>
              <DriverPerformance track={selectedTrack} race={selectedRace} />
            </AnimatedCard>
            <AnimatedCard delay={500}>
              <TireDegradationChart degradation={strategy?.tireDegradation} />
            </AnimatedCard>
          </div>
        </div>
      ) : viewMode === '3d' ? (
        <AnimatedCard delay={200}>
          <div className="h-[calc(100vh-200px)] bg-black rounded-lg overflow-hidden border border-border">
            <Track3DView />
          </div>
        </AnimatedCard>
      ) : viewMode === 'advanced' ? (
        <AnimatedCard delay={200}>
          <AdvancedAnalytics />
        </AnimatedCard>
      ) : viewMode === 'comparison' ? (
        <AnimatedCard delay={200}>
          <MultiCarComparison />
        </AnimatedCard>
      ) : viewMode === 'replay' ? (
        <div className="space-y-6">
          <AnimatedCard delay={200}>
            <RaceReplay />
          </AnimatedCard>
          <AnimatedCard delay={300}>
            <div className="h-[600px] bg-black rounded-lg overflow-hidden border border-border">
              <Track3DView />
            </div>
          </AnimatedCard>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <StrategyPanel strategy={strategy} currentLap={currentLap} />
            <WeatherPanel weather={strategy?.weatherImpact} />
          </div>
          <div className="lg:col-span-1 space-y-6">
            <PositionTable positions={positions} />
            <DriverPerformance track={selectedTrack} race={selectedRace} />
          </div>
          <div className="lg:col-span-1 space-y-6">
            <TireDegradationChart degradation={strategy?.tireDegradation} />
            <LapTimeChart track={selectedTrack} race={selectedRace} />
          </div>
        </div>
      )}
    </div>
  );
}

