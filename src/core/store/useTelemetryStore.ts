import { create } from 'zustand';
import {
  FK8TelemetryFrame,
  TripLog,
  MaintenanceItem,
  DTC,
  AppMode,
  HexFrame,
  LapTimerState,
  ScenarioPreset
} from '../../types/telemetry';
import { dbService, INITIAL_MAINTENANCE_ITEMS, INITIAL_TRIPS } from '../database/db';
import { writeQueue } from '../database/TelemetryWriteQueue';
import { SimulatedFK8Provider } from '../telemetry/SimulatedFK8Provider';

export const INITIAL_FRAME: FK8TelemetryFrame = {
  timestamp: Date.now(),
  rpm: 2450,
  speedMph: 68.0,
  gear: 6,
  boostPsi: -4.1,
  manifoldPressureInHg: -8.4,
  throttlePct: 24,
  oilTempF: 195.0,
  coolantTempF: 195.0,
  iatF: 92.0,
  afr: 14.7,
  batteryVoltage: 14.2,
  instantMpg: 29.4,
  avgMpg: 29.4,
  latG: 0.04,
  lonG: 0.0,
  brakeRotorTempF: 190.0,
  knockRetard: [0, 0, 0, 0],
  knockCount: 0,
  tpms: {
    fl: { psi: 35.6, tempF: 94 },
    fr: { psi: 35.6, tempF: 94 },
    rl: { psi: 33.3, tempF: 86 },
    rr: { psi: 33.3, tempF: 86 }
  },
  vtecEngaged: false,
  shiftLightActive: false,
  ecoShiftAdvisor: null
};

interface TelemetryStoreState {
  // Live Frame & Records
  currentFrame: FK8TelemetryFrame;
  peakBoost: number;
  peakG: { lat: number; lon: number };

  // Modes & Lockout
  appMode: AppMode;
  motionLocked: boolean;
  devOverrideMotionLock: boolean;

  // Session & Trips
  sessionStatus: 'IDLE' | 'AUTO-LOGGING ACTIVE (RPM > 500)' | 'STOPPED';
  activeTrip: TripLog | null;
  trips: TripLog[];

  // DTC & Maintenance
  activeDtcs: DTC[];
  maintenanceItems: MaintenanceItem[];
  isScanningDtc: boolean;

  // Live Hex CAN Frames
  hexFrames: HexFrame[];

  // Lap Timer State for Track Mode
  lapTimer: LapTimerState;

  // Telemetry Provider Instance
  provider: SimulatedFK8Provider;

  // Actions
  init: () => Promise<void>;
  setAppMode: (mode: AppMode) => void;
  toggleDevOverrideMotionLock: () => void;
  resetPeakBoost: () => void;
  resetPeakG: () => void;
  updateFrame: (frame: FK8TelemetryFrame) => void;
  setHexFrames: (frames: HexFrame[]) => void;
  setScenario: (scenario: ScenarioPreset) => void;
  setManualOverride: (throttlePct: number, gear: number | 'N' | 'R', braking: boolean) => void;

  // Diagnostics & Service Actions
  scanDtc: () => Promise<void>;
  clearDtc: () => Promise<void>;
  simulateFault: (code: 'P0299' | 'P0300') => Promise<void>;
  resetMaintenance: (id: string) => Promise<void>;
  exportTripCsv: (tripId: string) => Promise<string>;

  // Lap Timer Actions
  startLapTimer: () => void;
  stopLapTimer: () => void;
  recordLap: () => void;
  resetLapTimer: () => void;
}

const telemetryProvider = new SimulatedFK8Provider();

export const useTelemetryStore = create<TelemetryStoreState>((set, get) => ({
  currentFrame: INITIAL_FRAME,
  peakBoost: 0,
  peakG: { lat: 0, lon: 0 },

  appMode: 'daily',
  motionLocked: false,
  devOverrideMotionLock: false,

  sessionStatus: 'AUTO-LOGGING ACTIVE (RPM > 500)',
  activeTrip: null,
  trips: INITIAL_TRIPS,

  activeDtcs: [],
  maintenanceItems: INITIAL_MAINTENANCE_ITEMS,
  isScanningDtc: false,

  hexFrames: [],

  lapTimer: {
    currentLapTime: 0,
    bestLapTime: 104520, // 1:44.52 baseline best
    lastLapTime: 105180, // 1:45.18
    sectorDelta: -0.34,
    lapCount: 4,
    isRunning: true
  },

  provider: telemetryProvider,

  init: async () => {
    await dbService.init();
    const storedTrips = await dbService.getTrips();
    const storedMaint = await dbService.getMaintenanceItems();

    set({
      trips: storedTrips.length > 0 ? storedTrips : INITIAL_TRIPS,
      maintenanceItems: storedMaint.length > 0 ? storedMaint : INITIAL_MAINTENANCE_ITEMS
    });

    // Start 25Hz live stream
    telemetryProvider.startStream(
      (frame) => {
        get().updateFrame(frame);
      },
      (hex) => {
        get().setHexFrames(hex);
      }
    );
  },

  setAppMode: (mode: AppMode) => {
    const { motionLocked, devOverrideMotionLock } = get();
    // Safety check: Cannot enter garage if motionLocked and not dev overridden
    if (mode === 'garage' && motionLocked && !devOverrideMotionLock) {
      return;
    }
    set({ appMode: mode });
  },

  toggleDevOverrideMotionLock: () => {
    set((state) => {
      const newOverride = !state.devOverrideMotionLock;
      const isLocked = state.currentFrame.speedMph > 5 && !newOverride;
      return {
        devOverrideMotionLock: newOverride,
        motionLocked: isLocked
      };
    });
  },

  resetPeakBoost: () => {
    set((state) => ({
      peakBoost: Math.max(0, state.currentFrame.boostPsi)
    }));
  },

  resetPeakG: () => {
    set((state) => ({
      peakG: {
        lat: Math.abs(state.currentFrame.latG),
        lon: Math.abs(state.currentFrame.lonG)
      }
    }));
  },

  updateFrame: (frame: FK8TelemetryFrame) => {
    const state = get();

    // 1. Peak Boost tracking
    const newPeakBoost = Math.max(state.peakBoost, frame.boostPsi);

    // 2. Peak G tracking
    const newPeakLat = Math.max(state.peakG.lat, Math.abs(frame.latG));
    const newPeakLon = Math.max(state.peakG.lon, Math.abs(frame.lonG));

    // 3. Motion Lockout (> 5 MPH)
    const isMotionLocked = frame.speedMph > 5 && !state.devOverrideMotionLock;
    let targetAppMode = state.appMode;
    if (isMotionLocked && state.appMode === 'garage') {
      targetAppMode = 'daily'; // Safety kickout to daily cockpit
    }

    // 4. Auto-Wake & Auto-Sleep Session Logger
    let sessionStatus = state.sessionStatus;
    let activeTrip = state.activeTrip;

    if (frame.rpm > 500) {
      if (sessionStatus !== 'AUTO-LOGGING ACTIVE (RPM > 500)') {
        sessionStatus = 'AUTO-LOGGING ACTIVE (RPM > 500)';
      }
      if (!activeTrip) {
        // Auto-create active trip
        activeTrip = {
          id: `trip-${Date.now()}`,
          startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          endTime: '',
          mode: state.appMode === 'track' ? 'track' : 'daily',
          distanceMiles: 0,
          avgMpg: frame.instantMpg > 0 ? frame.instantMpg : 28.5,
          peakBoostPsi: Math.max(0, frame.boostPsi),
          peakRpm: frame.rpm,
          maxOilTempF: frame.oilTempF,
          durationSeconds: 0
        };
      } else {
        // Accumulate trip metrics
        activeTrip.distanceMiles += (frame.speedMph / 3600) * 0.04;
        activeTrip.durationSeconds += 0.04;
        activeTrip.peakBoostPsi = Math.max(activeTrip.peakBoostPsi, frame.boostPsi);
        activeTrip.peakRpm = Math.max(activeTrip.peakRpm, Math.round(frame.rpm));
        activeTrip.maxOilTempF = Math.max(activeTrip.maxOilTempF, frame.oilTempF);
      }

      // Buffer frame into write queue
      if (activeTrip) {
        writeQueue.push(activeTrip.id, frame);
      }
    } else if (frame.rpm === 0 && activeTrip && activeTrip.durationSeconds > 5) {
      // Auto-Sleep: Finalize trip
      sessionStatus = 'STOPPED';
      activeTrip.endTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      activeTrip.distanceMiles = Math.round(activeTrip.distanceMiles * 10) / 10;
      activeTrip.durationSeconds = Math.round(activeTrip.durationSeconds);
      activeTrip.peakBoostPsi = Math.round(activeTrip.peakBoostPsi * 10) / 10;
      activeTrip.maxOilTempF = Math.round(activeTrip.maxOilTempF * 10) / 10;

      // Save to database & flush write queue
      const finalizedTrip = { ...activeTrip };
      writeQueue.flush();
      dbService.insertTrip(finalizedTrip);

      set((s) => ({
        trips: [finalizedTrip, ...s.trips],
        activeTrip: null,
        sessionStatus: 'STOPPED'
      }));
      return;
    }

    set({
      currentFrame: frame,
      peakBoost: newPeakBoost,
      peakG: { lat: newPeakLat, lon: newPeakLon },
      motionLocked: isMotionLocked,
      appMode: targetAppMode,
      sessionStatus,
      activeTrip
    });
  },

  setHexFrames: (frames: HexFrame[]) => {
    set((state) => {
      // Keep last 15 hex frames for smooth sniffer display
      const combined = [...frames, ...state.hexFrames];
      return {
        hexFrames: combined.slice(0, 15)
      };
    });
  },

  setScenario: (scenario: ScenarioPreset) => {
    telemetryProvider.setScenario(scenario);
  },

  setManualOverride: (throttlePct: number, gear: number | 'N' | 'R', braking: boolean) => {
    telemetryProvider.setManualOverride(throttlePct, gear, braking);
  },

  scanDtc: async () => {
    set({ isScanningDtc: true });
    try {
      const dtcs = await telemetryProvider.scanDtc();
      set({ activeDtcs: dtcs });
    } finally {
      set({ isScanningDtc: false });
    }
  },

  clearDtc: async () => {
    await telemetryProvider.clearDtc();
    set({ activeDtcs: [] });
  },

  simulateFault: async (code: 'P0299' | 'P0300') => {
    await telemetryProvider.simulateFault(code);
    const dtcs = await telemetryProvider.scanDtc();
    set({ activeDtcs: dtcs });
  },

  resetMaintenance: async (id: string) => {
    const updated = await dbService.resetMaintenanceItem(id, 20450);
    set((state) => ({
      maintenanceItems: state.maintenanceItems.map((item) => (item.id === id ? updated : item))
    }));
  },

  exportTripCsv: async (tripId: string): Promise<string> => {
    const points = await dbService.getTelemetryPoints(tripId);
    let csv = 'Timestamp,RPM,Speed_MPH,Gear,Boost_PSI,Throttle_Pct,Oil_Temp_F,Coolant_Temp_F,IAT_F,AFR,Knock_Retard\n';

    points.forEach((p) => {
      csv += `${p.timestamp},${Math.round(p.rpm)},${p.speedMph.toFixed(1)},${p.gear},${p.boostPsi.toFixed(1)},${p.throttlePct.toFixed(0)},${p.oilTempF.toFixed(1)},${p.coolantTempF.toFixed(1)},${p.iatF.toFixed(0)},${p.afr.toFixed(2)},${p.knockRetard.toFixed(2)}\n`;
    });

    return csv;
  },

  startLapTimer: () => {
    set((s) => ({ lapTimer: { ...s.lapTimer, isRunning: true } }));
  },

  stopLapTimer: () => {
    set((s) => ({ lapTimer: { ...s.lapTimer, isRunning: false } }));
  },

  recordLap: () => {
    set((s) => {
      const newLapTime = 104000 + Math.floor(Math.random() * 2500) - 1000;
      const isBest = !s.lapTimer.bestLapTime || newLapTime < s.lapTimer.bestLapTime;
      const delta = s.lapTimer.bestLapTime ? (newLapTime - s.lapTimer.bestLapTime) / 1000 : 0;
      return {
        lapTimer: {
          currentLapTime: 0,
          bestLapTime: isBest ? newLapTime : s.lapTimer.bestLapTime,
          lastLapTime: newLapTime,
          sectorDelta: Math.round(delta * 100) / 100,
          lapCount: s.lapTimer.lapCount + 1,
          isRunning: true
        }
      };
    });
  },

  resetLapTimer: () => {
    set((s) => ({
      lapTimer: {
        ...s.lapTimer,
        currentLapTime: 0,
        lapCount: 0,
        sectorDelta: 0
      }
    }));
  }
}));
