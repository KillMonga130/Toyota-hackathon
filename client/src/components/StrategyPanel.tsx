import { AnimatedCard } from './AnimatedStats';

interface StrategyPanelProps {
  strategy: any;
  currentLap: number;
}

export default function StrategyPanel({ strategy, currentLap }: StrategyPanelProps) {
  if (!strategy) return null;

  const pitStop = strategy.pitStop;
  const tireDeg = strategy.tireDegradation;
  const fuel = strategy.fuel;

  return (
    <AnimatedCard>
      <div className="bg-background-tertiary border border-border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Race Strategy</h2>

      {/* Pit Stop Recommendation */}
      {pitStop && (
        <div className="mb-6 p-4 bg-black/50 rounded border border-border">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-primary">Pit Stop Strategy</h3>
            <span className="text-xs bg-yellow-900 text-yellow-200 px-2 py-1 rounded">
              {Math.round(pitStop.confidence * 100)}% confidence
            </span>
          </div>
          <p className="text-sm text-text-secondary mb-2">
            Recommended: <span className="font-bold">Lap {pitStop.recommendedLap}</span>
          </p>
          <p className="text-xs text-text-secondary">{pitStop.reason}</p>
          <div className="mt-3 flex gap-4 text-xs">
            <div>
              <span className="text-text-secondary">Time Loss:</span>{' '}
              <span className="text-red-400">-{pitStop.estimatedTimeLoss}s</span>
            </div>
            <div>
              <span className="text-text-secondary">Estimated Gain:</span>{' '}
              <span className="text-green-400">+{pitStop.estimatedGain}s</span>
            </div>
          </div>
        </div>
      )}

      {/* Tire Degradation */}
      {tireDeg && (
        <div className="mb-4 p-4 bg-black/50 rounded border border-border">
          <h3 className="font-semibold mb-2">Tire Status</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-secondary">Degradation</span>
                <span className={tireDeg.degradation > 70 ? 'text-red-400' : 'text-green-400'}>
                  {tireDeg.degradation.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-background-tertiary rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    tireDeg.degradation > 70 ? 'bg-red-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(tireDeg.degradation, 100)}%` }}
                />
              </div>
            </div>
          </div>
          {tireDeg.predictedLapsRemaining > 0 && (
            <p className="text-xs text-text-secondary mt-2">
              ~{tireDeg.predictedLapsRemaining} laps remaining
            </p>
          )}
        </div>
      )}

      {/* Fuel Status */}
      {fuel && (
        <div className="p-4 bg-black/50 rounded border border-border">
          <h3 className="font-semibold mb-2">Fuel Status</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-secondary">Fuel Level</span>
                <span className={fuel.needsRefuel ? 'text-red-400' : 'text-green-400'}>
                  {fuel.currentFuel.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-background-tertiary rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    fuel.needsRefuel ? 'bg-red-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${fuel.currentFuel}%` }}
                />
              </div>
            </div>
          </div>
          {fuel.needsRefuel && (
            <p className="text-xs text-red-400 mt-2">
              ⚠️ Pit required within {fuel.estimatedLapsRemaining} laps
            </p>
          )}
        </div>
      )}

      {/* Recommendations */}
      {strategy.recommendations && strategy.recommendations.length > 0 && (
        <div className="mt-6 p-4 bg-blue-900/20 rounded border border-blue-700">
          <h3 className="font-semibold mb-2 text-blue-300">Recommendations</h3>
          <ul className="text-sm space-y-1">
            {strategy.recommendations.map((rec: string, i: number) => (
              <li key={i} className="text-text-secondary">• {rec}</li>
            ))}
          </ul>
        </div>
      )}
      </div>
    </AnimatedCard>
  );
}

