export interface FK8TelemetryFrame {
  timestamp: number;
  rpm: number;
  speedMph: number;
  gear: number | 'N' | 'R';
  boostPsi: number;
  manifoldPressureInHg: number;
  throttlePct: number;
  oilTempF: number;
  coolantTempF: number;
  iatF: number;
  afr: number;
  batteryVoltage: number;
  instantMpg: number;
  avgMpg: number;
  latG: number;
  lonG: number;
  brakeRotorTempF: number;
  knockRetard: [number, number, number, number]; // Cyl 1, 2, 3, 4
  knockCount: number;
  tpms: {
    fl: { psi: number; tempF: number };
    fr: { psi: number; tempF: number };
    rl: { psi: number; tempF: number };
    rr: { psi: number; tempF: number };
  };
  vtecEngaged: boolean;
  shiftLightActive: boolean;
  ecoShiftAdvisor: string | null;
}

export interface TripLog {
  id: string;
  startTime: string;
  endTime: string;
  mode: 'daily' | 'track';
  distanceMiles: number;
  avgMpg: number;
  peakBoostPsi: number;
  peakRpm: number;
  maxOilTempF: number;
  durationSeconds: number;
}

export interface TelemetryPoint {
  id?: number;
  tripId: string;
  timestamp: number;
  rpm: number;
  speedMph: number;
  gear: string | number;
  boostPsi: number;
  throttlePct: number;
  oilTempF: number;
  coolantTempF: number;
  iatF: number;
  afr: number;
  knockRetard: number;
}

export interface MaintenanceItem {
  id: string;
  name: string;
  category: string;
  intervalMiles: number;
  lastPerformedMiles: number;
  lastPerformedDate: string;
  currentVehicleMiles: number;
  remainingMiles: number;
  status: 'good' | 'due-soon' | 'overdue';
}

export interface DTC {
  code: string;
  description: string;
  ecu: string;
  severity: 'warning' | 'critical';
  timestamp: string;
}

export type AppMode = 'daily' | 'track' | 'garage';

export type ScenarioPreset = 'cold-start' | 'warm-cruise' | 'wot-pull' | 'heat-soak' | 'parked';

export interface HexFrame {
  id: string;
  timestamp: number;
  canId: string;
  type: 'TX' | 'RX';
  queue: 'Fast (25Hz)' | 'Slow (1Hz)';
  pid: string;
  bytes: string;
  formula: string;
  decodedValue: string;
}

export interface LapTimerState {
  currentLapTime: number; // in milliseconds
  bestLapTime: number | null; // in milliseconds
  lastLapTime: number | null;
  sectorDelta: number; // in seconds (e.g. -0.34s)
  lapCount: number;
  isRunning: boolean;
}
