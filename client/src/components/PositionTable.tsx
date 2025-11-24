import { RacePosition } from '../types';

interface PositionTableProps {
  positions: RacePosition[];
}

export default function PositionTable({ positions }: PositionTableProps) {
  const formatTime = (seconds: number) => {
    if (!seconds || seconds === 0) return '--';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, '0')}`;
  };

  return (
    <div className="bg-background-tertiary border border-border rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Race Positions</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3">Pos</th>
              <th className="text-left py-2 px-3">Vehicle</th>
              <th className="text-left py-2 px-3">Lap</th>
              <th className="text-right py-2 px-3">Best Lap</th>
              <th className="text-right py-2 px-3">Gap</th>
            </tr>
          </thead>
          <tbody>
            {positions.slice(0, 10).map((pos, index) => (
              <tr
                key={pos.vehicle_id}
                className={`border-b border-border ${
                  index === 0 ? 'bg-green-900/20' : ''
                }`}
              >
                <td className="py-2 px-3 font-semibold">{pos.position}</td>
                <td className="py-2 px-3 font-mono text-xs">{pos.vehicle_id}</td>
                <td className="py-2 px-3">{pos.lap}</td>
                <td className="py-2 px-3 text-right">{formatTime(pos.lapTime)}</td>
                <td className="py-2 px-3 text-right text-text-secondary">
                  {index === 0 ? '--' : `+${formatTime(pos.gapToLeader)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

