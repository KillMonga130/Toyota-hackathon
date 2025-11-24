import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Environment, Grid } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import Track3D from './3d/Track3D';
import GhostCar from './3d/GhostCar';
import MultiCar3D from './3d/MultiCar3D';
import CameraController from './3d/CameraController';
import TelemetryOverlay from './TelemetryOverlay';
import { useRaceStore } from '../store/raceStore';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Track3DView() {
  const { selectedTrack, selectedRace } = useRaceStore();
  const [telemetryData, setTelemetryData] = useState<any[]>([]);
  const [multiCarData, setMultiCarData] = useState<Map<string, any[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [cameraMode, setCameraMode] = useState<'free' | 'follow' | 'overhead' | 'chase'>('free');
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

  useEffect(() => {
    if (!selectedTrack || !selectedRace) return;

    setLoading(true);
    axios.get('/api/race/' + selectedTrack + '/' + selectedRace)
      .then(response => {
        // Process telemetry data for 3D visualization
        const data = response.data.telemetry || [];
        // Sample data for performance (take every Nth point)
        const sampled = data.filter((_: any, i: number) => i % 10 === 0).slice(0, 5000);
        
        // Group by vehicle
        const vehicles = [...new Set(data.map((t: any) => t.vehicle_id))] as string[];
        const carDataMap = new Map<string, any[]>();
        
        vehicles.forEach((vehicleId) => {
          const vehicleData = data.filter((t: any) => t.vehicle_id === vehicleId);
          const sampled = vehicleData.filter((_: any, i: number) => i % 10 === 0).slice(0, 2000);
          
          const processed = sampled.map((point: any) => {
            const lat = parseFloat(point.VBOX_Lat_Min) || 0;
            const lon = parseFloat(point.VBOX_Long_Minutes) || 0;
            
            // Convert GPS to 3D (simplified)
            const baseLat = sampled[0]?.VBOX_Lat_Min || lat;
            const baseLon = sampled[0]?.VBOX_Long_Minutes || lon;
            const x = (lon - baseLon) * 111000;
            const z = (lat - baseLat) * 111000;
            
            const firstTime = new Date(sampled[0].meta_time).getTime();
            const currentTime = new Date(point.meta_time).getTime();
            
            return {
              position: [x, 0, z] as [number, number, number],
              relativeTime: (currentTime - firstTime) / 1000,
              speed: parseFloat(point.Speed) || 0,
              vehicleId
            };
          });
          
          carDataMap.set(vehicleId, processed);
        });
        
        setMultiCarData(carDataMap);
        if (vehicles.length > 0) {
          setSelectedVehicle(vehicles[0]);
          setTelemetryData(carDataMap.get(vehicles[0]) || []);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading telemetry:', error);
        setLoading(false);
      });
  }, [selectedTrack, selectedRace]);

  if (loading) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <div className="text-white">Loading track data...</div>
      </div>
    );
  }

  if (telemetryData.length === 0) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <div className="text-text-secondary">No telemetry data available</div>
      </div>
    );
  }

  // Animation loop for replay
  useEffect(() => {
    if (!isPlaying || telemetryData.length === 0) return;

    const interval = setInterval(() => {
      setCurrentTime(prev => {
        const maxTime = telemetryData[telemetryData.length - 1]?.relativeTime || 0;
        if (prev >= maxTime) {
          setIsPlaying(false);
          return maxTime;
        }
        return prev + 0.1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, telemetryData]);

  const vehicleColors = new Map<string, string>();
  Array.from(multiCarData.keys()).forEach((id, i) => {
    vehicleColors.set(id, colors[i % colors.length]);
  });

  const currentCarData = multiCarData.get(selectedVehicle) || [];
  const currentFrame = currentCarData.findIndex(d => d.relativeTime >= currentTime) || 0;
  const currentPos = currentCarData[currentFrame]?.position || [0, 0, 0];

  return (
    <div className="w-full h-full relative">
      {/* Controls Overlay */}
      <div className="absolute top-4 left-4 z-10 bg-black/80 rounded-lg p-4 space-y-2">
        <div className="text-sm font-semibold text-white mb-2">Camera Mode</div>
        <div className="flex gap-2">
          {(['free', 'follow', 'overhead', 'chase'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setCameraMode(mode)}
              className={`px-3 py-1 rounded text-xs ${
                cameraMode === mode
                  ? 'bg-primary text-white'
                  : 'bg-background-tertiary text-text-secondary hover:bg-background-tertiary'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
        <div className="text-sm font-semibold text-white mt-4 mb-2">Replay</div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-3 py-1 rounded text-xs bg-background-tertiary text-text-secondary hover:bg-background-tertiary"
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            onClick={() => setCurrentTime(0)}
            className="px-3 py-1 rounded text-xs bg-background-tertiary text-text-secondary hover:bg-background-tertiary"
          >
            ⏮
          </button>
        </div>
        {multiCarData.size > 1 && (
          <>
            <div className="text-sm font-semibold text-white mt-4 mb-2">Vehicles</div>
            <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
              {Array.from(multiCarData.keys()).map(id => (
                <button
                  key={id}
                  onClick={() => setSelectedVehicle(id)}
                  className={`px-2 py-1 rounded text-xs text-left ${
                    selectedVehicle === id
                      ? 'bg-primary text-white'
                      : 'bg-background-tertiary text-text-secondary hover:bg-background-tertiary'
                  }`}
                >
                  {id}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <Canvas camera={{ position: [0, 50, 100], fov: 60 }} gl={{ antialias: true }}>
        <color attach="background" args={['#050505']} />
        <fog attach="fog" args={['#050505', 50, 500]} />

        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 50, 10]} intensity={2} color="#ffffff" />
        <pointLight position={[0, 20, 0]} intensity={1} color="#00ffff" distance={100} />

        <Stars radius={200} depth={100} count={5000} factor={4} saturation={0} fade speed={1} />
        <Environment preset="city" />

        <Grid
          position={[0, -0.2, 0]}
          args={[500, 500]}
          cellSize={5}
          cellThickness={0.5}
          cellColor="#1a1a1a"
          sectionSize={25}
          sectionThickness={1}
          sectionColor="#333"
          fadeDistance={200}
          infiniteGrid
        />

        <Suspense fallback={null}>
          <Track3D data={telemetryData} />
          {multiCarData.size > 1 ? (
            <MultiCar3D 
              carsData={multiCarData} 
              currentTime={currentTime}
              colors={vehicleColors}
            />
          ) : (
            <GhostCar data={telemetryData} currentTime={currentTime} />
          )}
          <CameraController 
            mode={cameraMode}
            targetPosition={currentPos as [number, number, number]}
          />
        </Suspense>

        <OrbitControls makeDefault maxPolarAngle={Math.PI / 2 - 0.1} />

        <EffectComposer enableNormalPass={false}>
          <Bloom luminanceThreshold={0.5} mipmapBlur intensity={1.5} radius={0.5} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}

