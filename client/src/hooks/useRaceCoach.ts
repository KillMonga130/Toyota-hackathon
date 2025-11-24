import { useEffect, useMemo, useRef, useState } from 'react';
import { useRaceStore } from '../store/raceStore';
import { TelemetryDataPoint } from '../types';

type FeedbackSeverity = 'info' | 'warning' | 'critical';

export interface FeedbackEvent {
  id: string;
  frame: number;
  message: string;
  severity: FeedbackSeverity;
  cornerLabel?: string;
}

export interface ScoreBreakdown {
  braking: number;
  throttle: number;
  smoothness: number;
}

export interface ReportCardSummary {
  grade: string;
  summary: string;
  bestCorner?: string;
  improvement?: string;
  breakdown: ScoreBreakdown;
}

interface GGPoint {
  latG: number;
  longG: number;
  utilization: number;
}

const SCORE_WEIGHTS = {
  braking: 0.35,
  throttle: 0.35,
  smoothness: 0.3,
};

const TRAIL_G_THRESHOLD = 0.5;
const BRAKE_THRESHOLD = 5; // bar
const UPDATE_INTERVAL_MS = 120;

export function useRaceCoach() {
  const { telemetryData, currentFrameIndex, isPlaying } = useRaceStore();
  const [currentScore, setCurrentScore] = useState(0);
  const [breakdown, setBreakdown] = useState<ScoreBreakdown>({
    braking: 0,
    throttle: 0,
    smoothness: 0,
  });
  const [feedbackEvents, setFeedbackEvents] = useState<FeedbackEvent[]>([]);
  const [latestFeedback, setLatestFeedback] = useState<FeedbackEvent | null>(null);
  const [reportCard, setReportCard] = useState<ReportCardSummary | null>(null);
  const [showReportCard, setShowReportCard] = useState(false);
  const lastUpdateRef = useRef(0);
  const lastFeedbackRef = useRef<string | null>(null);
  const wasPlayingRef = useRef(false);

  const ggPoint: GGPoint = useMemo(() => {
    const frame = telemetryData[currentFrameIndex];
    if (!frame) {
      return { latG: 0, longG: 0, utilization: 0 };
    }
    const latG = frame.accelLateral ?? 0;
    const longG = frame.accelForward ?? 0;
    const utilization = Math.min(Math.sqrt(latG * latG + longG * longG) / 1.5, 1);
    return { latG, longG, utilization };
  }, [telemetryData, currentFrameIndex]);

  const cornerInsights = useMemo(() => analyzeCorners(telemetryData), [telemetryData]);

  useEffect(() => {
    if (telemetryData.length === 0) return;
    const now = performance.now();
    if (now - lastUpdateRef.current < UPDATE_INTERVAL_MS) return;
    lastUpdateRef.current = now;

    const segment = getWindow(telemetryData, currentFrameIndex, 180);
    if (segment.length === 0) return;

    const metrics = computeScore(segment, currentFrameIndex);
    setBreakdown(metrics.breakdown);
    setCurrentScore(metrics.overall);

    if (metrics.feedback && metrics.feedback.message !== lastFeedbackRef.current) {
      lastFeedbackRef.current = metrics.feedback.message;
      setLatestFeedback(metrics.feedback);
      setFeedbackEvents((prev) => [metrics.feedback!, ...prev].slice(0, 5));
    }
  }, [telemetryData, currentFrameIndex]);

  useEffect(() => {
    const reachedEnd = telemetryData.length > 0 && currentFrameIndex >= telemetryData.length - 2;
    const stoppedPlaying = wasPlayingRef.current && !isPlaying;
    wasPlayingRef.current = isPlaying;

    if ((stoppedPlaying || reachedEnd) && telemetryData.length > 0) {
      const grade = gradeFromScore(currentScore);
      const bestCorner = cornerInsights.length
        ? `Corner ${cornerInsights.reduce((best, corner) =>
            corner.averageSpeed > best.averageSpeed ? corner : best
          ).id}`
        : undefined;

      const weakest = Object.entries(breakdown).sort((a, b) => a[1] - b[1])[0];
      const improvement = weakest ? improvementMessage(weakest[0] as keyof ScoreBreakdown) : undefined;

      setReportCard({
        grade,
        summary: `Driving score ${currentScore}/100`,
        bestCorner,
        improvement,
        breakdown,
      });
      setShowReportCard(true);
    }
  }, [isPlaying, telemetryData.length, currentFrameIndex, currentScore, breakdown, cornerInsights]);

  const closeReportCard = () => setShowReportCard(false);

  return {
    currentScore,
    breakdown,
    feedbackEvents,
    latestFeedback,
    ggPoint,
    reportCard,
    showReportCard,
    closeReportCard,
  };
}

function getWindow(data: TelemetryDataPoint[], frameIndex: number, size: number) {
  const start = Math.max(0, frameIndex - size);
  return data.slice(start, frameIndex + 1);
}

function computeScore(segment: TelemetryDataPoint[], frameIndex: number) {
  const brakingStats = segment.reduce(
    (acc, point) => {
      const latG = Math.abs(point.accelLateral ?? 0);
      const brake = point.brakeFront ?? 0;
      if (brake > BRAKE_THRESHOLD) {
        acc.totalBraking += 1;
        if (latG > TRAIL_G_THRESHOLD) {
          acc.trailFrames += 1;
        }
      }
      if (latG > TRAIL_G_THRESHOLD) {
        acc.cornerFrames += 1;
      }
      return acc;
    },
    { totalBraking: 0, trailFrames: 0, cornerFrames: 0 }
  );

  const brakingScore = brakingStats.totalBraking
    ? clamp(
        (brakingStats.trailFrames / Math.max(brakingStats.totalBraking, 1)) * 100,
        25,
        100
      )
    : brakingStats.cornerFrames > 0
    ? 55
    : 80;

  const throttleValues = segment.map((p) => p.throttle ?? p.accelerator ?? 0);
  const throttleChanges = throttleValues.slice(1).map((value, idx) => value - throttleValues[idx]);
  const throttleStab = throttleChanges.reduce((acc, val) => acc + Math.abs(val), 0) / Math.max(throttleChanges.length, 1);
  const throttleScore = clamp(100 - throttleStab * 1.5, 20, 100);

  const steeringValues = segment.map((p) => p.steeringAngle ?? 0);
  const steeringVariance = variance(steeringValues);
  const smoothnessScore = clamp(100 - steeringVariance * 0.2, 15, 100);

  const breakdown: ScoreBreakdown = {
    braking: Math.round(brakingScore),
    throttle: Math.round(throttleScore),
    smoothness: Math.round(smoothnessScore),
  };

  const overall = Math.round(
    breakdown.braking * SCORE_WEIGHTS.braking +
      breakdown.throttle * SCORE_WEIGHTS.throttle +
      breakdown.smoothness * SCORE_WEIGHTS.smoothness
  );

  const feedback = createFeedback(breakdown, frameIndex);

  return { breakdown, overall, feedback };
}

function createFeedback(breakdown: ScoreBreakdown, frameIndex: number): FeedbackEvent | undefined {
  if (breakdown.braking < 60) {
    return {
      id: `fb-${frameIndex}-brake`,
      frame: frameIndex,
      severity: 'warning',
      message: 'Try to trail brake deeper into the corner.',
    };
  }

  if (breakdown.throttle < 60) {
    return {
      id: `fb-${frameIndex}-throttle`,
      frame: frameIndex,
      severity: 'warning',
      message: 'Throttle application is spiky. Roll into the power.',
    };
  }

  if (breakdown.smoothness < 55) {
    return {
      id: `fb-${frameIndex}-smooth`,
      frame: frameIndex,
      severity: 'info',
      message: 'Hands are busy. Aim for smoother steering inputs.',
    };
  }

  if (breakdown.braking > 85 && breakdown.throttle > 85 && breakdown.smoothness > 85) {
    return {
      id: `fb-${frameIndex}-praise`,
      frame: frameIndex,
      severity: 'info',
      message: 'Great rhythm through this sector!',
    };
  }

  return undefined;
}

function variance(values: number[]) {
  if (values.length === 0) return 0;
  const mean = values.reduce((acc, v) => acc + v, 0) / values.length;
  const sum = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
  return sum / values.length;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

interface CornerInsight {
  id: number;
  startFrame: number;
  endFrame: number;
  averageSpeed: number;
  trailRatio: number;
  throttleSmoothness: number;
}

function analyzeCorners(data: TelemetryDataPoint[]): CornerInsight[] {
  const corners: CornerInsight[] = [];
  let current: { start: number; frames: TelemetryDataPoint[] } | null = null;
  let cornerId = 1;

  data.forEach((point, idx) => {
    const latG = Math.abs(point.accelLateral ?? 0);
    const isCorner = latG > TRAIL_G_THRESHOLD;

    if (isCorner && !current) {
      current = { start: idx, frames: [point] };
    } else if (isCorner && current) {
      current.frames.push(point);
    } else if (!isCorner && current) {
      corners.push(buildCornerInsight(cornerId++, current, idx - 1));
      current = null;
    }
  });

  if (current) {
    corners.push(buildCornerInsight(cornerId++, current, data.length - 1));
  }

  return corners;
}

function buildCornerInsight(id: number, corner: { start: number; frames: TelemetryDataPoint[] }, endIdx: number): CornerInsight {
  const speeds = corner.frames.map((f) => f.speed ?? 0);
  const avgSpeed = speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;

  const brakeSamples = corner.frames.filter((f) => (f.brakeFront ?? 0) > BRAKE_THRESHOLD).length;
  const trailSamples = corner.frames.filter(
    (f) => (f.brakeFront ?? 0) > BRAKE_THRESHOLD && Math.abs(f.accelLateral ?? 0) > TRAIL_G_THRESHOLD
  ).length;
  const trailRatio = brakeSamples ? trailSamples / brakeSamples : 0;

  const throttleValues = corner.frames.map((f) => f.throttle ?? f.accelerator ?? 0);
  const throttleChanges = throttleValues.slice(1).map((value, idx) => Math.abs(value - throttleValues[idx]));
  const throttleSmoothness = throttleChanges.length
    ? 100 - Math.min((throttleChanges.reduce((a, b) => a + b, 0) / throttleChanges.length) * 1.2, 100)
    : 100;

  return {
    id,
    startFrame: corner.start,
    endFrame: endIdx,
    averageSpeed: avgSpeed,
    trailRatio,
    throttleSmoothness,
  };
}

function gradeFromScore(score: number) {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'A-';
  if (score >= 80) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 65) return 'C+';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function improvementMessage(metric: keyof ScoreBreakdown) {
  switch (metric) {
    case 'braking':
      return 'Work on blending off the brakes as you turn in.';
    case 'throttle':
      return 'Modulate the throttle—roll on instead of stabbing.';
    case 'smoothness':
      return 'Calm the hands. Aim for one clean steering arc per corner.';
    default:
      return undefined;
  }
}

