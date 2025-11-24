import { format, parseISO } from 'date-fns';

export interface ChartDataPoint {
  x: number | string;
  y: number;
  label?: string;
  color?: string;
}

export interface ChartConfig {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  colors: string[];
  animationDuration: number;
}

export const defaultChartConfig: ChartConfig = {
  width: 800,
  height: 400,
  margin: { top: 20, right: 30, bottom: 40, left: 60 },
  colors: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'],
  animationDuration: 750
};

export function formatLapTime(seconds: number): string {
  if (!seconds || seconds === 0) return '--';
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(3);
  return `${mins}:${secs.padStart(6, '0')}`;
}

export function formatTime(seconds: number): string {
  if (!seconds || seconds === 0) return '0:00.000';
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(3);
  return `${mins}:${secs.padStart(6, '0')}`;
}

export function formatSpeed(kmh: number): string {
  return `${Math.round(kmh)} km/h`;
}

export function formatRPM(rpm: number): string {
  return `${Math.round(rpm)} RPM`;
}

export function calculateTrend(data: number[]): 'increasing' | 'decreasing' | 'stable' {
  if (data.length < 2) return 'stable';
  
  const firstHalf = data.slice(0, Math.floor(data.length / 2));
  const secondHalf = data.slice(Math.floor(data.length / 2));
  
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  const diff = secondAvg - firstAvg;
  const threshold = (firstAvg + secondAvg) / 2 * 0.05; // 5% threshold
  
  if (diff > threshold) return 'increasing';
  if (diff < -threshold) return 'decreasing';
  return 'stable';
}

export function calculateMovingAverage(data: number[], window: number): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - window + 1);
    const end = i + 1;
    const windowData = data.slice(start, end);
    const avg = windowData.reduce((a, b) => a + b, 0) / windowData.length;
    result.push(avg);
  }
  
  return result;
}

export function calculatePercentile(data: number[], percentile: number): number {
  const sorted = [...data].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

export function calculateStatistics(data: number[]): {
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  q1: number;
  q3: number;
} {
  if (data.length === 0) {
    return { min: 0, max: 0, mean: 0, median: 0, stdDev: 0, q1: 0, q3: 0 };
  }

  const sorted = [...data].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const median = calculatePercentile(data, 50);
  const q1 = calculatePercentile(data, 25);
  const q3 = calculatePercentile(data, 75);

  const variance = data.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);

  return {
    min: Math.round(min * 1000) / 1000,
    max: Math.round(max * 1000) / 1000,
    mean: Math.round(mean * 1000) / 1000,
    median: Math.round(median * 1000) / 1000,
    stdDev: Math.round(stdDev * 1000) / 1000,
    q1: Math.round(q1 * 1000) / 1000,
    q3: Math.round(q3 * 1000) / 1000
  };
}

export function generateColorScale(count: number, startColor: string = '#ef4444', endColor: string = '#3b82f6'): string[] {
  const colors: string[] = [];
  
  // Simple linear interpolation (in production, use a proper color library)
  for (let i = 0; i < count; i++) {
    const ratio = i / (count - 1);
    // Simplified - would need proper hex color interpolation
    colors.push(i % 2 === 0 ? startColor : endColor);
  }
  
  return colors;
}

export function formatDate(timestamp: number | string): string {
  try {
    const date = typeof timestamp === 'string' ? parseISO(timestamp) : new Date(timestamp);
    return format(date, 'HH:mm:ss.SSS');
  } catch {
    return '--:--:--';
  }
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(2)}s`;
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins}m ${secs}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${hours}h ${mins}m ${secs}s`;
  }
}

export function interpolateData(data: ChartDataPoint[], targetCount: number): ChartDataPoint[] {
  if (data.length <= targetCount) return data;

  const result: ChartDataPoint[] = [];
  const step = (data.length - 1) / (targetCount - 1);

  for (let i = 0; i < targetCount; i++) {
    const index = i * step;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const fraction = index - lower;

    if (lower === upper) {
      result.push(data[lower]);
    } else {
      const y = data[lower].y + (data[upper].y - data[lower].y) * fraction;
      result.push({
        x: data[lower].x,
        y: Math.round(y * 1000) / 1000,
        label: data[lower].label,
        color: data[lower].color
      });
    }
  }

  return result;
}

export function detectOutliers(data: number[]): number[] {
  if (data.length < 3) return [];

  const stats = calculateStatistics(data);
  const iqr = stats.q3 - stats.q1;
  const lowerBound = stats.q1 - 1.5 * iqr;
  const upperBound = stats.q3 + 1.5 * iqr;

  return data
    .map((value, index) => ({ value, index }))
    .filter(item => item.value < lowerBound || item.value > upperBound)
    .map(item => item.index);
}

export function smoothData(data: number[], smoothingFactor: number = 0.3): number[] {
  if (data.length === 0) return [];
  if (data.length === 1) return data;

  const smoothed: number[] = [data[0]];

  for (let i = 1; i < data.length; i++) {
    const smoothedValue = smoothingFactor * data[i] + (1 - smoothingFactor) * smoothed[i - 1];
    smoothed.push(smoothedValue);
  }

  return smoothed;
}

export function groupByLap(data: any[], lapField: string = 'lap'): Map<number, any[]> {
  const grouped = new Map<number, any[]>();

  data.forEach(item => {
    const lap = item[lapField];
    if (!grouped.has(lap)) {
      grouped.set(lap, []);
    }
    grouped.get(lap)!.push(item);
  });

  return grouped;
}

export function calculateLapDelta(currentLap: number, referenceLap: number): number {
  return Math.round((currentLap - referenceLap) * 1000) / 1000;
}

export function formatDelta(delta: number): string {
  if (delta === 0) return '0.000';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(3)}`;
}

