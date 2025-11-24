import { useRaceStore } from '../store/raceStore';

export default function RaceSelector() {
  const { tracks, setSelectedTrack, setSelectedRace } = useRaceStore();

  const handleSelectTrack = (track: string) => {
    setSelectedTrack(track);
    // Default to Race 1
    setSelectedRace('Race 1');
  };

  const handleSelectRace = (track: string, race: string) => {
    setSelectedTrack(track);
    setSelectedRace(race);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Select a Race</h2>
        <p className="text-text-secondary">Choose a track to analyze race data and strategy</p>
      </div>

      <div className="space-y-6">
        {tracks.map((track) => (
          <div key={track} className="bg-background-tertiary border border-border rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">{track}</h3>
            <div className="flex gap-4">
              <button
                onClick={() => handleSelectRace(track, 'Race 1')}
                className="flex-1 bg-background hover:bg-background-secondary border border-border rounded-lg p-4 text-left transition-all hover:border-primary"
              >
                <div className="font-semibold text-primary">Race 1</div>
                <div className="text-sm text-text-secondary mt-1">Load Race 1 data</div>
              </button>
              <button
                onClick={() => handleSelectRace(track, 'Race 2')}
                className="flex-1 bg-background hover:bg-background-secondary border border-border rounded-lg p-4 text-left transition-all hover:border-primary"
              >
                <div className="font-semibold text-primary">Race 2</div>
                <div className="text-sm text-text-secondary mt-1">Load Race 2 data</div>
              </button>
            </div>
          </div>
        ))}
      </div>

      {tracks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-text-secondary">No tracks available. Please check data directory.</p>
        </div>
      )}
    </div>
  );
}

