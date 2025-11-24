export interface ProcessedLap {
  lapNumber: number;
  lapTime: number;
  sectors: {
    sector1: number;
    sector2: number;
    sector3: number;
  };
  telemetry: {
    averageSpeed: number;
    maxSpeed: number;
    averageRPM: number;
    throttleUsage: number;
    brakeUsage: number;
  };
  timestamp: number;
}

export interface ProcessedRace {
  vehicleId: string;
  laps: ProcessedLap[];
  bestLap: ProcessedLap | null;
  averageLap: number;
  totalTime: number;
}

export function processLapData(rawData: any[]): ProcessedLap[] {
  const laps: ProcessedLap[] = [];
  const lapGroups = new Map<number, any[]>();

  // Group data by lap
  rawData.forEach(point => {
    const lap = point.lap || 0;
    if (!lapGroups.has(lap)) {
      lapGroups.set(lap, []);
    }
    lapGroups.get(lap)!.push(point);
  });

  // Process each lap
  lapGroups.forEach((lapData, lapNumber) => {
    if (lapData.length < 2) return;

    const speeds = lapData.map(p => p.Speed || 0).filter(s => s > 0);
    const rpms = lapData.map(p => p.nmot || 0).filter(r => r > 0);
    const throttles = lapData.map(p => p.ath || 0);
    const brakes = lapData.map(p => (p.pbrake_f || 0) + (p.pbrake_r || 0));

    const startTime = new Date(lapData[0].meta_time).getTime();
    const endTime = new Date(lapData[lapData.length - 1].meta_time).getTime();
    const lapTime = (endTime - startTime) / 1000;

    // Estimate sectors (divide into thirds)
    const sectorSize = Math.floor(lapData.length / 3);
    const sector1End = sectorSize > 0 ? lapData[sectorSize] : lapData[Math.floor(lapData.length / 3)];
    const sector2End = sectorSize > 0 ? lapData[sectorSize * 2] : lapData[Math.floor(lapData.length * 2 / 3)];

    const sector1Time = sector1End
      ? (new Date(sector1End.meta_time).getTime() - startTime) / 1000
      : lapTime / 3;
    const sector2Time = sector2End
      ? (new Date(sector2End.meta_time).getTime() - new Date(sector1End.meta_time).getTime()) / 1000
      : lapTime / 3;
    const sector3Time = lapTime - sector1Time - sector2Time;

    laps.push({
      lapNumber,
      lapTime: Math.round(lapTime * 1000) / 1000,
      sectors: {
        sector1: Math.round(sector1Time * 1000) / 1000,
        sector2: Math.round(sector2Time * 1000) / 1000,
        sector3: Math.round(sector3Time * 1000) / 1000
      },
      telemetry: {
        averageSpeed: speeds.length > 0
          ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length * 10) / 10
          : 0,
        maxSpeed: speeds.length > 0 ? Math.round(Math.max(...speeds) * 10) / 10 : 0,
        averageRPM: rpms.length > 0
          ? Math.round(rpms.reduce((a, b) => a + b, 0) / rpms.length)
          : 0,
        throttleUsage: throttles.length > 0
          ? Math.round(throttles.reduce((a, b) => a + b, 0) / throttles.length * 10) / 10
          : 0,
        brakeUsage: brakes.length > 0
          ? Math.round(brakes.reduce((a, b) => a + b, 0) / brakes.length * 10) / 10
          : 0
      },
      timestamp: startTime
    });
  });

  return laps.sort((a, b) => a.lapNumber - b.lapNumber);
}

export function processRaceData(rawData: any[], vehicleId: string): ProcessedRace {
  const vehicleData = rawData.filter(d => d.vehicle_id === vehicleId);
  const laps = processLapData(vehicleData);

  const bestLap = laps.length > 0
    ? laps.reduce((best, current) => 
        current.lapTime < best.lapTime ? current : best
      )
    : null;

  const averageLap = laps.length > 0
    ? laps.reduce((sum, lap) => sum + lap.lapTime, 0) / laps.length
    : 0;

  const totalTime = laps.length > 0
    ? laps.reduce((sum, lap) => sum + lap.lapTime, 0)
    : 0;

  return {
    vehicleId,
    laps,
    bestLap,
    averageLap: Math.round(averageLap * 1000) / 1000,
    totalTime: Math.round(totalTime * 1000) / 1000
  };
}

export function calculateLapImprovement(laps: ProcessedLap[]): Map<number, number> {
  const improvements = new Map<number, number>();

  if (laps.length < 2) return improvements;

  const bestLap = Math.min(...laps.map(l => l.lapTime));

  laps.forEach(lap => {
    const improvement = bestLap - lap.lapTime;
    improvements.set(lap.lapNumber, Math.round(improvement * 1000) / 1000);
  });

  return improvements;
}

export function findOptimalLap(laps: ProcessedLap[]): {
  lap: ProcessedLap;
  factors: string[];
} | null {
  if (laps.length === 0) return null;

  // Score each lap based on multiple factors
  const scoredLaps = laps.map(lap => {
    let score = 0;
    const factors: string[] = [];

    // Fastest lap gets high score
    const bestLap = Math.min(...laps.map(l => l.lapTime));
    if (lap.lapTime === bestLap) {
      score += 100;
      factors.push('Fastest lap');
    }

    // Consistent sectors
    const sectorVariance = Math.abs(lap.sectors.sector1 - lap.sectors.sector2) +
                          Math.abs(lap.sectors.sector2 - lap.sectors.sector3);
    if (sectorVariance < 2) {
      score += 20;
      factors.push('Consistent sectors');
    }

    // High average speed
    if (lap.telemetry.averageSpeed > 150) {
      score += 15;
      factors.push('High average speed');
    }

    // Good throttle usage (not too high, not too low)
    if (lap.telemetry.throttleUsage > 60 && lap.telemetry.throttleUsage < 90) {
      score += 10;
      factors.push('Optimal throttle usage');
    }

    return { lap, score, factors };
  });

  const optimal = scoredLaps.reduce((best, current) =>
    current.score > best.score ? current : best
  );

  return {
    lap: optimal.lap,
    factors: optimal.factors
  };
}

export function detectLapAnomalies(laps: ProcessedLap[]): Array<{
  lap: ProcessedLap;
  type: string;
  severity: number;
  description: string;
}> {
  const anomalies: Array<{
    lap: ProcessedLap;
    type: string;
    severity: number;
    description: string;
  }> = [];

  if (laps.length < 3) return anomalies;

  const averageLap = laps.reduce((sum, l) => sum + l.lapTime, 0) / laps.length;
  const stdDev = Math.sqrt(
    laps.reduce((sum, l) => sum + Math.pow(l.lapTime - averageLap, 2), 0) / laps.length
  );

  laps.forEach(lap => {
    // Slow lap
    if (lap.lapTime > averageLap + 2 * stdDev) {
      anomalies.push({
        lap,
        type: 'slow_lap',
        severity: lap.lapTime > averageLap + 3 * stdDev ? 3 : 2,
        description: `Lap ${lap.lapTime.toFixed(3)}s is ${(lap.lapTime - averageLap).toFixed(3)}s slower than average`
      });
    }

    // Inconsistent sectors
    const sectorVariance = Math.abs(lap.sectors.sector1 - lap.sectors.sector2) +
                          Math.abs(lap.sectors.sector2 - lap.sectors.sector3);
    if (sectorVariance > 5) {
      anomalies.push({
        lap,
        type: 'inconsistent_sectors',
        severity: sectorVariance > 10 ? 2 : 1,
        description: `High sector variance: ${sectorVariance.toFixed(2)}s`
      });
    }

    // Low speed
    if (lap.telemetry.averageSpeed < 100) {
      anomalies.push({
        lap,
        type: 'low_speed',
        severity: 1,
        description: `Low average speed: ${lap.telemetry.averageSpeed.toFixed(1)} km/h`
      });
    }
  });

  return anomalies.sort((a, b) => b.severity - a.severity);
}

export function calculateRacePace(laps: ProcessedLap[], window: number = 5): number[] {
  if (laps.length === 0) return [];

  const pace: number[] = [];

  for (let i = 0; i < laps.length; i++) {
    const start = Math.max(0, i - window + 1);
    const end = i + 1;
    const windowLaps = laps.slice(start, end);
    const avgPace = windowLaps.reduce((sum, lap) => sum + lap.lapTime, 0) / windowLaps.length;
    pace.push(Math.round(avgPace * 1000) / 1000);
  }

  return pace;
}

export function compareRaces(race1: ProcessedRace, race2: ProcessedRace): {
  lapTimeDelta: number;
  speedDelta: number;
  consistencyDelta: number;
  improvements: string[];
} {
  const lapTimeDelta = race1.averageLap - race2.averageLap;
  const speedDelta = (race1.laps.reduce((sum, l) => sum + l.telemetry.averageSpeed, 0) / race1.laps.length) -
                    (race2.laps.reduce((sum, l) => sum + l.telemetry.averageSpeed, 0) / race2.laps.length);

  const consistency1 = calculateConsistency(race1.laps);
  const consistency2 = calculateConsistency(race2.laps);
  const consistencyDelta = consistency1 - consistency2;

  const improvements: string[] = [];
  if (lapTimeDelta < 0) improvements.push(`Race 1 is ${Math.abs(lapTimeDelta).toFixed(3)}s faster per lap`);
  if (speedDelta > 0) improvements.push(`Race 1 has ${speedDelta.toFixed(1)} km/h higher average speed`);
  if (consistencyDelta > 0) improvements.push(`Race 1 is ${consistencyDelta.toFixed(1)}% more consistent`);

  return {
    lapTimeDelta: Math.round(lapTimeDelta * 1000) / 1000,
    speedDelta: Math.round(speedDelta * 10) / 10,
    consistencyDelta: Math.round(consistencyDelta * 10) / 10,
    improvements
  };
}

function calculateConsistency(laps: ProcessedLap[]): number {
  if (laps.length < 2) return 0;

  const lapTimes = laps.map(l => l.lapTime);
  const average = lapTimes.reduce((a, b) => a + b, 0) / lapTimes.length;
  const variance = lapTimes.reduce((sum, time) => sum + Math.pow(time - average, 2), 0) / lapTimes.length;
  const stdDev = Math.sqrt(variance);

  return Math.max(0, 100 - (stdDev / average) * 100);
}

