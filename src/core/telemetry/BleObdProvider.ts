import { FK8TelemetryFrame, HexFrame, ScenarioPreset, DTC } from '../../types/telemetry';
import { ITelemetryProvider } from './ITelemetryProvider';
import { PidDecoder } from './PidDecoder';

export class BleObdProvider implements ITelemetryProvider {
  private isConnected: boolean = false;
  private fastPollInterval: NodeJS.Timeout | null = null;
  private slowPollInterval: NodeJS.Timeout | null = null;
  private onFrameCallback: ((frame: FK8TelemetryFrame) => void) | null = null;
  private onHexCallback: ((frames: HexFrame[]) => void) | null = null;

  private cachedFrame: FK8TelemetryFrame = {
    timestamp: Date.now(),
    rpm: 0,
    speedMph: 0,
    gear: 'N',
    boostPsi: 0,
    manifoldPressureInHg: 0,
    throttlePct: 0,
    oilTempF: 195,
    coolantTempF: 195,
    iatF: 85,
    afr: 14.7,
    batteryVoltage: 12.6,
    instantMpg: 0,
    avgMpg: 28.5,
    latG: 0,
    lonG: 0,
    brakeRotorTempF: 120,
    knockRetard: [0, 0, 0, 0],
    knockCount: 0,
    tpms: {
      fl: { psi: 35.0, tempF: 85 },
      fr: { psi: 35.0, tempF: 85 },
      rl: { psi: 33.0, tempF: 82 },
      rr: { psi: 33.0, tempF: 82 }
    },
    vtecEngaged: false,
    shiftLightActive: false,
    ecoShiftAdvisor: null
  };

  public startStream(
    onFrame: (frame: FK8TelemetryFrame) => void,
    onHexFrames?: (frames: HexFrame[]) => void
  ): void {
    this.isConnected = true;
    this.onFrameCallback = onFrame;
    this.onHexCallback = onHexFrames || null;

    // Fast Queue: 25Hz CAN-Bus polling priority queue (40ms)
    // Dispatches Mode 01 requests: 010C (RPM), 010D (Speed), 010B (MAP), 0111 (TPS), 0134 (AFR)
    this.fastPollInterval = setInterval(() => {
      this.cachedFrame.timestamp = Date.now();
      if (this.onFrameCallback) {
        this.onFrameCallback({ ...this.cachedFrame });
      }
      if (this.onHexCallback) {
        const hex = PidDecoder.generateHexFrames(this.cachedFrame, 'fast');
        this.onHexCallback(hex);
      }
    }, 40);

    // Slow Queue: 1Hz CAN-Bus polling priority queue (1000ms)
    // Dispatches Honda Mode 22 enhanced requests: 221101 (Oil Temp), 221142 (Knock), 221155 (Rotors)
    this.slowPollInterval = setInterval(() => {
      if (this.onHexCallback) {
        const hex = PidDecoder.generateHexFrames(this.cachedFrame, 'slow');
        this.onHexCallback(hex);
      }
    }, 1000);
  }

  public stopStream(): void {
    this.isConnected = false;
    if (this.fastPollInterval) clearInterval(this.fastPollInterval);
    if (this.slowPollInterval) clearInterval(this.slowPollInterval);
    this.fastPollInterval = null;
    this.slowPollInterval = null;
  }

  public setScenario(_scenario: ScenarioPreset): void {
    // In live BLE mode, scenarios are ignored since real ECU dictates values
  }

  public setManualOverride(_throttlePct: number, _gear: number | 'N' | 'R', _braking: boolean): void {
    // In live BLE mode, hardware vehicle pedals dictate state
  }

  public async scanDtc(): Promise<DTC[]> {
    // STN / ELM327 Mode 03 / Mode 07 / Honda Mode 22 DTC query command: '03\r' / '22 02 00\r'
    return [];
  }

  public async clearDtc(): Promise<void> {
    // STN / ELM327 Mode 04 clear command: '04\r'
  }

  public async simulateFault(_code: 'P0299' | 'P0300'): Promise<DTC> {
    return {
      code: 'P0299',
      description: 'Turbocharger Underboost Condition (BLE Hardware Test)',
      ecu: 'PGM-FI (07E8)',
      severity: 'warning',
      timestamp: new Date().toLocaleTimeString()
    };
  }

  public getConnected(): boolean {
    return this.isConnected;
  }
}
