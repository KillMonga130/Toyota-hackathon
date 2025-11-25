import { TelemetryDataPoint } from '../types';

/**
 * Generates demo telemetry data for a simple oval track
 * This allows users to explore the app without uploading a file
 */
export function generateDemoData(): TelemetryDataPoint[] {
  const data: TelemetryDataPoint[] = [];
  const totalFrames = 2000; // ~33 seconds at 60 FPS
  
  // Create a simple oval track (400m x 200m)
  const trackLength = 1200; // meters (circumference of oval)
  const centerX = 0;
  const centerZ = 0;
  const radiusX = 200; // meters
  const radiusZ = 100; // meters
  
  for (let i = 0; i < totalFrames; i++) {
    const progress = i / totalFrames; // 0 to 1
    const angle = progress * Math.PI * 2; // Full circle
    
    // Calculate position on oval
    const x = centerX + radiusX * Math.cos(angle);
    const z = centerZ + radiusZ * Math.sin(angle);
    
    // Simulate speed variation (slower in turns, faster on straights)
    const isTurn = Math.abs(Math.cos(angle)) < 0.5 || Math.abs(Math.sin(angle)) < 0.5;
    const baseSpeed = isTurn ? 80 : 150; // km/h
    const speed = baseSpeed + Math.sin(progress * Math.PI * 4) * 20; // Add variation
    
    // Simulate throttle and brake
    const throttle = isTurn ? 30 : 85;
    const brake = isTurn && progress % 0.25 > 0.1 ? 50 : 0;
    
    // Simulate steering (more angle in turns)
    const steeringAngle = isTurn ? Math.sin(angle) * 30 : 0;
    
    // Simulate G-forces
    const accelForward = isTurn ? -0.3 : 0.5; // Braking in turns, accelerating on straights
    const accelLateral = isTurn ? Math.abs(Math.sin(angle)) * 0.8 : 0.1;
    
    // Simulate gear (higher on straights)
    const gear = isTurn ? 3 : 4;
    
    data.push({
      timestamp: `2025-01-01T00:00:${(i * 0.016).toFixed(3)}Z`,
      vehicle_id: 'GR86-DEMO-001',
      vehicle_number: 1,
      lap: Math.floor(progress) + 1,
      x,
      z,
      y: 0,
      latitude: 33.5 + (x / 111000), // Approximate conversion
      longitude: -86.6 + (z / 111000),
      speed,
      gear,
      rpm: 5000 + Math.random() * 2000,
      throttle,
      accelerator: throttle,
      brakeFront: brake,
      brakeRear: brake * 0.7,
      accelForward,
      accelLateral,
      steeringAngle,
      lapDistance: (progress * trackLength) % trackLength,
    });
  }
  
  // Normalize to start at (0,0,0)
  if (data.length > 0) {
    const firstPoint = data[0];
    const offsetX = firstPoint.x;
    const offsetZ = firstPoint.z;
    
    return data.map(point => ({
      ...point,
      x: point.x - offsetX,
      z: point.z - offsetZ,
    }));
  }
  
  return data;
}

