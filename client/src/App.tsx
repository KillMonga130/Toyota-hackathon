import { useRaceStore } from './store/raceStore';
import Dashboard from './components/Dashboard';
import TrackView from './components/TrackView';

function App() {
  const { telemetryData } = useRaceStore();
  const hasData = telemetryData.length > 0;

  // Show upload prompt if no data loaded
  if (!hasData) {
    return (
      <div className="w-full h-screen bg-black relative">
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-white text-2xl font-mono text-center">
            Please upload a Telemetry CSV file
          </div>
        </div>
        <Dashboard /> {/* The UI Overlay with file upload */}
        <TrackView /> {/* The 3D Scene (empty until data loaded) */}
      </div>
    );
  }

  // Loaded state: Render game view
  return (
    <div className="w-full h-screen bg-black relative">
      <Dashboard /> {/* The UI Overlay */}
      <TrackView /> {/* The 3D Scene */}
    </div>
  );
}

export default App;

