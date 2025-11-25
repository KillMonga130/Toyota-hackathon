import { create } from 'zustand';
import { TelemetryDataPoint } from '../types';

interface RaceStore {
  // Track and race selection
  tracks: string[];
  selectedTrack: string | null;
  selectedRace: string | null;
  setTracks: (tracks: string[]) => void;
  setSelectedTrack: (track: string | null) => void;
  setSelectedRace: (race: string | null) => void;
  
  // Race replay state
  currentFrameIndex: number;
  isPlaying: boolean;
  setCurrentFrameIndex: (index: number) => void;
  setIsPlaying: (playing: boolean) => void;
  resetReplay: () => void;
  
  // Telemetry data
  telemetryData: TelemetryDataPoint[];
  setTelemetryData: (data: TelemetryDataPoint[]) => void;
  
  // Visualization mode
  visualizationMode: 'speed' | 'input';
  setVisualizationMode: (mode: 'speed' | 'input') => void;
}

export const useRaceStore = create<RaceStore>((set) => ({
  // Track and race selection
  tracks: [],
  selectedTrack: null,
  selectedRace: null,
  setTracks: (tracks) => set({ tracks }),
  setSelectedTrack: (selectedTrack) => set({ selectedTrack }),
  setSelectedRace: (selectedRace) => set({ selectedRace }),
  
  // Race replay state
  currentFrameIndex: 0,
  isPlaying: false,
  setCurrentFrameIndex: (index) => set({ currentFrameIndex: index }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  resetReplay: () => set({ currentFrameIndex: 0, isPlaying: false }),
  
  // Telemetry data
  telemetryData: [],
  setTelemetryData: (data) => set({ telemetryData: data }),
  
  // Visualization mode
  visualizationMode: 'speed' as 'speed' | 'input',
  setVisualizationMode: (mode) => set({ visualizationMode: mode }),
}));

