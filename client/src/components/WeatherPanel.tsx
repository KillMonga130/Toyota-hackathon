interface WeatherPanelProps {
  weather: any;
}

export default function WeatherPanel({ weather }: WeatherPanelProps) {
  if (!weather) {
    return (
      <div className="bg-background-tertiary border border-border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Weather Conditions</h2>
        <div className="text-text-secondary text-sm">No weather data available</div>
      </div>
    );
  }

  return (
    <div className="bg-background-tertiary border border-border rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Weather Conditions</h2>
      <div className="space-y-3">
        <div className="p-3 bg-black/50 rounded border border-border">
          <div className="text-sm text-text-secondary mb-1">Current Impact</div>
          <div className="text-white font-semibold">{weather.impact}</div>
        </div>
        <div className="p-3 bg-black/50 rounded border border-border">
          <div className="text-sm text-text-secondary mb-1">Recommendation</div>
          <div className="text-blue-300 text-sm">{weather.recommendation}</div>
        </div>
      </div>
    </div>
  );
}

