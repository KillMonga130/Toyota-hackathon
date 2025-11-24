import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { useRaceStore } from '../store/raceStore';
import { TelemetryDataPoint } from '../types';

interface RawTelemetryRow {
  expire_at: string;
  lap: string;
  meta_event: string;
  meta_session: string;
  meta_source: string;
  meta_time: string;
  original_vehicle_id: string;
  outing: string;
  telemetry_name: string;
  telemetry_value: string;
  timestamp: string;
  vehicle_id: string;
  vehicle_number: string;
}

/**
 * Reads a small slice of the uploaded file so we can inspect headers quickly
 * without loading the entire 3GB blob into memory.
 */
async function getFilePreview(
  file: File,
  options: { bytes?: number; maxRows?: number } = {}
): Promise<{ headers: string[]; rows: RawTelemetryRow[] }> {
  const { bytes = 512 * 1024, maxRows = 500 } = options;
  const slice = file.slice(0, bytes);
  const text = await slice.text();

  return new Promise<{ headers: string[]; rows: RawTelemetryRow[] }>((resolve, reject) => {
    Papa.parse<RawTelemetryRow>(text, {
      header: true,
      skipEmptyLines: true,
      preview: maxRows,
      complete: (results) => {
        resolve({
          headers: results.meta.fields || [],
          rows: (results.data || []).filter(Boolean),
        });
      },
      error: (error) => reject(error),
    });
  });
}

/**
 * Converts GPS coordinates (latitude, longitude) to Cartesian coordinates (X, Z)
 * Uses a simple local approximation assuming small distances
 * 
 * @param lat Latitude in degrees
 * @param lon Longitude in degrees
 * @param referenceLat Reference latitude for accurate longitude scaling
 * @param referenceLon Reference longitude (for normalization)
 * @returns Object with x (east-west) and z (north-south) in meters
 */
function gpsToCartesian(
  lat: number,
  lon: number,
  referenceLat: number,
  referenceLon: number
): { x: number; z: number } {
  // Convert reference latitude to radians for accurate longitude scaling
  const refLatRad = (referenceLat * Math.PI) / 180;
  
  // Calculate differences from reference point
  const dLat = lat - referenceLat;
  const dLon = lon - referenceLon;
  
  // Convert to meters
  // 1 degree latitude ≈ 111,000 meters
  // 1 degree longitude ≈ 111,000 * cos(latitude) meters
  const z = dLat * 111000; // North-south (latitude)
  const x = dLon * 111000 * Math.cos(refLatRad); // East-west (longitude)
  
  return { x, z };
}

/**
 * Custom hook to load and parse telemetry CSV files
 * 
 * @returns Object with loading state, error, and load functions
 */
export function useTelemetryLoader() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setTelemetryData } = useRaceStore();

  /**
   * Validate CSV to ensure it's a telemetry file
   * ULTRA SIMPLIFIED: If it has telemetry_name and telemetry_value columns, it's a telemetry file
   * Don't check for GPS data - let the parser handle that and fail gracefully if missing
   */
  const validateTelemetryData = (headers: string[], rows: any[]): boolean => {
    if (rows.length === 0) {
      return false;
    }

    // Convert headers to lowercase strings for comparison
    const headerStrings = headers.map(h => String(h || '').toLowerCase().trim()).filter(h => h.length > 0);
    
    // SIMPLE CHECK: If it has telemetry_name and telemetry_value columns, it's a telemetry file
    const hasTelemetryName = headerStrings.some((h) => h.includes('telemetry_name'));
    const hasTelemetryValue = headerStrings.some((h) => h.includes('telemetry_value'));
    
    if (hasTelemetryName && hasTelemetryValue) {
      console.log('✅ Validation passed: Found telemetry_name and telemetry_value columns');
      return true; // It's a telemetry file, let it through
    }
    
    // Fallback: Check if VBOX_Lat_Min exists in headers (wide format)
    const hasVBOXHeader = headerStrings.some((header) => header.includes('vbox_lat_min'));
    
    if (hasVBOXHeader) {
      console.log('✅ Validation passed: Found VBOX_Lat_Min in headers');
      return true;
    }
    
    // Last resort: Check first row for telemetry_name property
    if (rows.length > 0 && rows[0]) {
      const firstRowKeys = Object.keys(rows[0]).map(k => k.toLowerCase());
      if (firstRowKeys.includes('telemetry_name')) {
        console.log('✅ Validation passed: Found telemetry_name in row data');
        return true;
      }
    }
    
    console.log('❌ Validation failed. Headers:', headerStrings);
    return false;
  };

  /**
   * Parse CSV file and load into store
   * Uses File object directly to avoid loading entire file into memory
   */
  const parseCSVFile = useCallback(
    (file: File) => {
      setIsLoading(true);
      setError(null);

      (async () => {
        // Validate filename
        if (!file.name.toLowerCase().includes('telemetry')) {
          setError("Invalid File. Please look for a file ending in '_telemetry_data.csv'");
          setIsLoading(false);
          return;
        }

        try {
          const preview = await getFilePreview(file);

          if (!validateTelemetryData(preview.headers, preview.rows)) {
            setError("Missing GPS data. Are you sure this is the Telemetry file and not the Results file?");
            setIsLoading(false);
            return;
          }

          const MAX_ROWS = 50000;
          const collectedRows: RawTelemetryRow[] = [];
          let headers: string[] = preview.headers.slice();

          Papa.parse<RawTelemetryRow>(file, {
            header: true,
            skipEmptyLines: true,
            worker: true,
            chunkSize: 1024 * 1024,
            chunk: (results, parser) => {
              if (!headers.length && results.meta.fields) {
                headers = results.meta.fields;
              }

              for (const row of results.data) {
                collectedRows.push(row);
                if (collectedRows.length >= MAX_ROWS) {
                  parser.abort();
                  break;
                }
              }
            },
            complete: () => {
              try {
                if (collectedRows.length === 0) {
                  throw new Error('CSV file is empty');
                }

                const rows = collectedRows;

                const groupedData = new Map<string, Partial<RawTelemetryRow>>();

                rows.forEach((row) => {
                  const key = `${row.timestamp}_${row.vehicle_id}`;
                  
                  if (!groupedData.has(key)) {
                    groupedData.set(key, {
                      timestamp: row.timestamp,
                      vehicle_id: row.vehicle_id,
                      vehicle_number: row.vehicle_number,
                      lap: row.lap,
                    });
                  }

                  const dataPoint = groupedData.get(key)!;
                  const value = parseFloat(row.telemetry_value);

                  switch (row.telemetry_name) {
                    case 'VBOX_Lat_Min':
                      (dataPoint as any).latitude = value;
                      break;
                    case 'VBOX_Long_Minutes':
                      (dataPoint as any).longitude = value;
                      break;
                    case 'Speed':
                      (dataPoint as any).speed = value;
                      break;
                    case 'gear':
                      (dataPoint as any).gear = value;
                      break;
                    case 'nmot':
                      (dataPoint as any).rpm = value;
                      break;
                    case 'ath':
                      (dataPoint as any).throttle = value;
                      break;
                    case 'aps':
                      (dataPoint as any).accelerator = value;
                      break;
                    case 'pbrake_f':
                      (dataPoint as any).brakeFront = value;
                      break;
                    case 'pbrake_r':
                      (dataPoint as any).brakeRear = value;
                      break;
                    case 'accx_can':
                      (dataPoint as any).accelForward = value;
                      break;
                    case 'accy_can':
                      (dataPoint as any).accelLateral = value;
                      break;
                    case 'Steering_Angle':
                      (dataPoint as any).steeringAngle = value;
                      break;
                    case 'Laptrigger_lapdist_dls':
                      (dataPoint as any).lapDistance = value;
                      break;
                  }
                });

                const dataPoints: Array<Partial<TelemetryDataPoint> & { latitude: number; longitude: number }> = [];

                groupedData.forEach((row) => {
                  const lat = (row as any).latitude;
                  const lon = (row as any).longitude;

                  if (lat !== undefined && lon !== undefined && !isNaN(lat) && !isNaN(lon)) {
                    dataPoints.push({
                      timestamp: row.timestamp || '',
                      vehicle_id: row.vehicle_id || '',
                      vehicle_number: parseInt(row.vehicle_number || '0', 10),
                      lap: parseInt(row.lap || '0', 10),
                      latitude: lat,
                      longitude: lon,
                      x: 0,
                      z: 0,
                      y: 0,
                      speed: (row as any).speed,
                      gear: (row as any).gear,
                      rpm: (row as any).rpm,
                      throttle: (row as any).throttle,
                      accelerator: (row as any).accelerator,
                      brakeFront: (row as any).brakeFront,
                      brakeRear: (row as any).brakeRear,
                      accelForward: (row as any).accelForward,
                      accelLateral: (row as any).accelLateral,
                      steeringAngle: (row as any).steeringAngle,
                      lapDistance: (row as any).lapDistance,
                    });
                  }
                });

                if (dataPoints.length === 0) {
                  throw new Error('No valid GPS data points found in CSV');
                }

                const firstPoint = dataPoints[0];
                const referenceLat = firstPoint.latitude;
                const referenceLon = firstPoint.longitude;

                const normalizedData: TelemetryDataPoint[] = dataPoints.map((point) => {
                  const cartesian = gpsToCartesian(
                    point.latitude,
                    point.longitude,
                    referenceLat,
                    referenceLon
                  );

                  return {
                    ...point,
                    x: cartesian.x,
                    z: cartesian.z,
                  } as TelemetryDataPoint;
                });

                setTelemetryData(normalizedData);
                setIsLoading(false);
              } catch (parseError) {
                const errorMessage =
                  parseError instanceof Error
                    ? parseError.message
                    : 'Failed to parse telemetry data';
                setError(errorMessage);
                setIsLoading(false);
              }
            },
            error: (error) => {
              setError(`CSV parsing error: ${error.message}`);
              setIsLoading(false);
            },
          });
        } catch (previewError) {
          const errorMessage =
            previewError instanceof Error
              ? previewError.message
              : 'Unable to read telemetry file';
          setError(errorMessage);
          setIsLoading(false);
        }
      })();
    },
    [setTelemetryData]
  );

  /**
   * Parse CSV text content (for fetch-based loading from public directory)
   * Note: This loads entire file into memory - only use for small files
   */
  const parseCSVText = useCallback(
    (csvText: string, filename?: string) => {
      setIsLoading(true);
      setError(null);

      // Validate filename if provided
      if (filename && !filename.toLowerCase().includes('telemetry')) {
        setError("Invalid File. Please look for a file ending in '_telemetry_data.csv'");
        setIsLoading(false);
        return;
      }

      // Parse CSV with PapaParse - first pass to check headers
      Papa.parse<RawTelemetryRow>(csvText, {
        header: true,
        skipEmptyLines: true,
        preview: 1, // Only read first row to check headers
        complete: (previewResults) => {
          // Check if headers (or first rows) look like telemetry data
          const headers = previewResults.meta.fields || [];
          const previewRows = previewResults.data || [];
          if (!validateTelemetryData(headers, previewRows)) {
            setError("Missing GPS data. Are you sure this is the Telemetry file and not the Results file?");
            setIsLoading(false);
            return;
          }

          // Headers are valid, now parse the full file
          Papa.parse<RawTelemetryRow>(csvText, {
            header: true,
            skipEmptyLines: true,
            preview: 50000, // Stop after 50,000 rows
            complete: (results) => {
              try {
                const rows = results.data;

                if (rows.length === 0) {
                  throw new Error('CSV file is empty');
                }

                // Group rows by timestamp and vehicle_id to transform from long to wide format
                const groupedData = new Map<string, Partial<RawTelemetryRow>>();

                rows.forEach((row) => {
                  const key = `${row.timestamp}_${row.vehicle_id}`;
                  
                  if (!groupedData.has(key)) {
                    groupedData.set(key, {
                      timestamp: row.timestamp,
                      vehicle_id: row.vehicle_id,
                      vehicle_number: row.vehicle_number,
                      lap: row.lap,
                    });
                  }

                  const dataPoint = groupedData.get(key)!;
                  const value = parseFloat(row.telemetry_value);

                  // Map telemetry values to their properties
                  switch (row.telemetry_name) {
                    case 'VBOX_Lat_Min':
                      (dataPoint as any).latitude = value;
                      break;
                    case 'VBOX_Long_Minutes':
                      (dataPoint as any).longitude = value;
                      break;
                    case 'Speed':
                      (dataPoint as any).speed = value;
                      break;
                    case 'gear':
                      (dataPoint as any).gear = value;
                      break;
                    case 'nmot':
                      (dataPoint as any).rpm = value;
                      break;
                    case 'ath':
                      (dataPoint as any).throttle = value;
                      break;
                    case 'aps':
                      (dataPoint as any).accelerator = value;
                      break;
                    case 'pbrake_f':
                      (dataPoint as any).brakeFront = value;
                      break;
                    case 'pbrake_r':
                      (dataPoint as any).brakeRear = value;
                      break;
                    case 'accx_can':
                      (dataPoint as any).accelForward = value;
                      break;
                    case 'accy_can':
                      (dataPoint as any).accelLateral = value;
                      break;
                    case 'Steering_Angle':
                      (dataPoint as any).steeringAngle = value;
                      break;
                    case 'Laptrigger_lapdist_dls':
                      (dataPoint as any).lapDistance = value;
                      break;
                  }
                });

                // Convert to TelemetryDataPoint array and filter out incomplete GPS data
                const dataPoints: Array<Partial<TelemetryDataPoint> & { latitude: number; longitude: number }> = [];

                groupedData.forEach((row) => {
                  const lat = (row as any).latitude;
                  const lon = (row as any).longitude;

                  if (lat !== undefined && lon !== undefined && !isNaN(lat) && !isNaN(lon)) {
                    dataPoints.push({
                      timestamp: row.timestamp || '',
                      vehicle_id: row.vehicle_id || '',
                      vehicle_number: parseInt(row.vehicle_number || '0', 10),
                      lap: parseInt(row.lap || '0', 10),
                      latitude: lat,
                      longitude: lon,
                      x: 0,
                      z: 0,
                      y: 0,
                      speed: (row as any).speed,
                      gear: (row as any).gear,
                      rpm: (row as any).rpm,
                      throttle: (row as any).throttle,
                      accelerator: (row as any).accelerator,
                      brakeFront: (row as any).brakeFront,
                      brakeRear: (row as any).brakeRear,
                      accelForward: (row as any).accelForward,
                      accelLateral: (row as any).accelLateral,
                      steeringAngle: (row as any).steeringAngle,
                      lapDistance: (row as any).lapDistance,
                    });
                  }
                });

                if (dataPoints.length === 0) {
                  throw new Error('No valid GPS data points found in CSV');
                }

                // Find the first GPS point for normalization
                const firstPoint = dataPoints[0];
                const referenceLat = firstPoint.latitude;
                const referenceLon = firstPoint.longitude;

                // Convert GPS to Cartesian and normalize
                const normalizedData: TelemetryDataPoint[] = dataPoints.map((point) => {
                  const cartesian = gpsToCartesian(
                    point.latitude,
                    point.longitude,
                    referenceLat,
                    referenceLon
                  );

                  return {
                    ...point,
                    x: cartesian.x,
                    z: cartesian.z,
                  } as TelemetryDataPoint;
                });

                // Store in raceStore
                setTelemetryData(normalizedData);
                setIsLoading(false);
              } catch (parseError) {
                const errorMessage =
                  parseError instanceof Error
                    ? parseError.message
                    : 'Failed to parse telemetry data';
                setError(errorMessage);
                setIsLoading(false);
              }
            },
            error: (error) => {
              setError(`CSV parsing error: ${error.message}`);
              setIsLoading(false);
            },
          });
        },
        error: (previewError) => {
          setError(`CSV preview error: ${previewError.message}`);
          setIsLoading(false);
        },
      });
    },
    [setTelemetryData]
  );

  /**
   * Load telemetry from File object
   * Passes File directly to PapaParse for efficient streaming
   * PapaParse automatically streams when given a File object
   */
  const loadTelemetry = useCallback(
    (file: File) => {
      parseCSVFile(file);
    },
    [parseCSVFile]
  );

  return {
    isLoading,
    error,
    loadTelemetry,
  };
}

