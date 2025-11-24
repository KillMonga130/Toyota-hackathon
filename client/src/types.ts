export interface RacePosition {
  vehicle_id: string;
  position: number;
  lap: number;
  lapTime: number;
  gapToLeader: number;
  gapToAhead: number;
  sector1Time?: number;
  sector2Time?: number;
  sector3Time?: number;
}

export interface TelemetryDataPoint {
  // Timestamp and vehicle info
  timestamp: string;
  vehicle_id: string;
  vehicle_number: number;
  lap: number;
  
  // GPS coordinates (normalized to start at 0,0,0)
  x: number; // Cartesian X (east-west)
  z: number; // Cartesian Z (north-south)
  y: number; // Elevation (if available, otherwise 0)
  
  // Original GPS coordinates (before normalization)
  latitude: number;
  longitude: number;
  
  // Speed & Drivetrain
  speed?: number; // km/h
  gear?: number;
  rpm?: number; // nmot
  
  // Throttle & Braking
  throttle?: number; // ath (0-100)
  accelerator?: number; // aps (0-100)
  brakeFront?: number; // pbrake_f (bar)
  brakeRear?: number; // pbrake_r (bar)
  
  // Acceleration & Steering
  accelForward?: number; // accx_can (G's)
  accelLateral?: number; // accy_can (G's)
  steeringAngle?: number; // degrees
  
  // Distance
  lapDistance?: number; // Laptrigger_lapdist_dls (meters)
}

