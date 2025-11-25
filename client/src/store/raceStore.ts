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
  
  // Camera mode
  cameraMode: 'orbit' | 'chase' | 'cockpit' | 'tv' | 'follow';
  setCameraMode: (mode: 'orbit' | 'chase' | 'cockpit' | 'tv' | 'follow') => void;
  
  // Playback speed
  playbackSpeed: number; // 0.25x, 0.5x, 1x, 2x, 4x
  setPlaybackSpeed: (speed: number) => void;
  
  // Sector times
  sectorTimes: number[];
  setSectorTimes: (times: number[]) => void;
  bestLapTime: number | null;
  setBestLapTime: (time: number | null) => void;
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
  
  // Camera mode
  cameraMode: 'orbit' as 'orbit' | 'chase' | 'cockpit' | 'tv' | 'follow',
  setCameraMode: (mode) => set({ cameraMode: mode }),
  
  // Playback speed
  playbackSpeed: 1,
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  
  // Sector times
  sectorTimes: [],
  setSectorTimes: (times) => set({ sectorTimes: times }),
  bestLapTime: null,
  setBestLapTime: (time) => set({ bestLapTime: time }),
}));

