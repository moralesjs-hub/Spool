import { FK8TelemetryFrame, HexFrame, ScenarioPreset, DTC } from '../../types/telemetry';

export interface ITelemetryProvider {
  startStream(
    onFrame: (frame: FK8TelemetryFrame) => void,
    onHexFrames?: (frames: HexFrame[]) => void
  ): void;
  stopStream(): void;
  setScenario(scenario: ScenarioPreset): void;
  setManualOverride(throttlePct: number, gear: number | 'N' | 'R', braking: boolean): void;
  scanDtc(): Promise<DTC[]>;
  clearDtc(): Promise<void>;
  simulateFault(code: 'P0299' | 'P0300'): Promise<DTC>;
}
