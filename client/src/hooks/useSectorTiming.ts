import { useEffect } from 'react';
import { useRaceStore } from '../store/raceStore';

/**
 * Calculates sector times and best lap from telemetry data
 */
export function useSectorTiming() {
  const { telemetryData, setSectorTimes, setBestLapTime } = useRaceStore();

  useEffect(() => {
    if (telemetryData.length === 0) {
      setSectorTimes([]);
      setBestLapTime(null);
      return;
    }

    // Group data by lap
    const laps = new Map<number, typeof telemetryData>();
    telemetryData.forEach((point) => {
      const lap = point.lap || 1;
      if (!laps.has(lap)) {
        laps.set(lap, []);
      }
      laps.get(lap)!.push(point);
    });

    // Calculate sector times for each lap
    const allSectorTimes: number[] = [];
    let bestLap: number | null = null;
    let bestLapTime: number | null = null;

    laps.forEach((lapData, lapNum) => {
      if (lapData.length < 3) return; // Need at least 3 points for 3 sectors

      // Divide lap into 3 sectors
      const sectorSize = Math.floor(lapData.length / 3);
      const sector1End = sectorSize;
      const sector2End = sectorSize * 2;
      const sector3End = lapData.length;

      // Calculate sector times (approximate based on frame count)
      // Assuming ~60 FPS, each frame is ~0.016 seconds
      const sector1Time = (sector1End - 0) * 0.016;
      const sector2Time = (sector2End - sector1End) * 0.016;
      const sector3Time = (sector3End - sector2End) * 0.016;

      const totalLapTime = sector1Time + sector2Time + sector3Time;

      allSectorTimes.push(sector1Time, sector2Time, sector3Time);

      // Track best lap
      if (bestLapTime === null || totalLapTime < bestLapTime) {
        bestLapTime = totalLapTime;
        bestLap = lapNum;
      }
    });

    // Set the best lap's sector times
    if (bestLap !== null && bestLapTime !== null) {
      const bestLapData = laps.get(bestLap)!;
      const sectorSize = Math.floor(bestLapData.length / 3);
      const sector1Time = sectorSize * 0.016;
      const sector2Time = sectorSize * 0.016;
      const sector3Time = (bestLapData.length - sectorSize * 2) * 0.016;
      
      setSectorTimes([sector1Time, sector2Time, sector3Time]);
      setBestLapTime(bestLapTime);
    }
  }, [telemetryData, setSectorTimes, setBestLapTime]);
}

