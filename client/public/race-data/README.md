# Race Data Directory

Place your telemetry CSV files here.

The app will load files from this directory using the path specified in `App.tsx`.

Example: If you have a file named `race.csv` in this directory, it will be accessible at `/race-data/race.csv`.

## File Format

The CSV files should contain telemetry data with the following columns:
- `VBOX_Lat_Min` - GPS Latitude
- `VBOX_Long_Minutes` - GPS Longitude
- `Speed` - Vehicle speed (km/h)
- `gear` - Current gear
- `telemetry_name` - Name of the telemetry parameter
- `telemetry_value` - Value of the telemetry parameter
- `timestamp` - Timestamp
- `vehicle_id` - Vehicle identifier

See `useTelemetryLoader.ts` for the complete expected format.

