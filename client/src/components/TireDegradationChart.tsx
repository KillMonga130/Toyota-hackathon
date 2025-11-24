import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TireDegradationChartProps {
  degradation: any;
}

export default function TireDegradationChart({ degradation }: TireDegradationChartProps) {
  if (!degradation) {
    return (
      <div className="bg-background-tertiary border border-border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Tire Degradation</h2>
        <div className="text-text-secondary text-sm">No data available</div>
      </div>
    );
  }

  // Simulate degradation over laps
  const data = Array.from({ length: 30 }, (_, i) => ({
    lap: i + 1,
    degradation: Math.min((i + 1) * (degradation.degradation / degradation.lap), 100)
  }));

  return (
    <div className="bg-background-tertiary border border-border rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Tire Degradation</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="lap" stroke="#9ca3af" />
          <YAxis stroke="#9ca3af" domain={[0, 100]} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #374151' }}
            labelStyle={{ color: '#fff' }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="degradation"
            stroke="#ef4444"
            strokeWidth={2}
            name="Degradation %"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

