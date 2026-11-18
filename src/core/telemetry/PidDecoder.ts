import { FK8TelemetryFrame, HexFrame } from '../../types/telemetry';

export interface DecodedPidResult {
  pid: string;
  name: string;
  mode: '01' | '22';
  value: number | string | number[];
  unit: string;
  formula: string;
}

export class PidDecoder {
  /**
   * Encodes a live telemetry frame into SAE Mode 01 and Honda Mode 22 hex frames.
   */
  public static generateHexFrames(frame: FK8TelemetryFrame, queueType: 'fast' | 'slow'): HexFrame[] {
    const frames: HexFrame[] = [];
    const timestamp = frame.timestamp;

    if (queueType === 'fast') {
      // 25Hz Fast Queue: RPM, Speed, Boost/MAP, Throttle, AFR
      // 1. Engine RPM (Mode 01, PID 0C): ((A * 256) + B) / 4
      const rpmRaw = Math.round(frame.rpm * 4);
      const rpmA = (rpmRaw >> 8) & 0xff;
      const rpmB = rpmRaw & 0xff;
      const rpmHex = `${rpmA.toString(16).padStart(2, '0').toUpperCase()} ${rpmB.toString(16).padStart(2, '0').toUpperCase()}`;
      frames.push({
        id: `tx-010c-${timestamp}`,
        timestamp,
        canId: '07E0',
        type: 'TX',
        queue: 'Fast (25Hz)',
        pid: '01 0C',
        bytes: '02 01 0C 00 00 00 00 00',
        formula: 'RPM Request',
        decodedValue: 'Request'
      });
      frames.push({
        id: `rx-010c-${timestamp}`,
        timestamp,
        canId: '07E8',
        type: 'RX',
        queue: 'Fast (25Hz)',
        pid: '41 0C',
        bytes: `04 41 0C ${rpmHex} 00 00 00`,
        formula: '((A*256)+B)/4',
        decodedValue: `${Math.round(frame.rpm)} RPM`
      });

      // 2. Vehicle Speed (Mode 01, PID 0D): A km/h -> mph
      const kmh = Math.round(frame.speedMph / 0.621371);
      const speedByte = Math.min(255, Math.max(0, kmh)).toString(16).padStart(2, '0').toUpperCase();
      frames.push({
        id: `rx-010d-${timestamp}`,
        timestamp,
        canId: '07E8',
        type: 'RX',
        queue: 'Fast (25Hz)',
        pid: '41 0D',
        bytes: `03 41 0D ${speedByte} 00 00 00 00`,
        formula: 'A * 0.621371',
        decodedValue: `${frame.speedMph.toFixed(1)} MPH`
      });

      // 3. Throttle Position % (Mode 01, PID 11): (A * 100) / 255
      const throttleByte = Math.round((frame.throttlePct / 100) * 255).toString(16).padStart(2, '0').toUpperCase();
      frames.push({
        id: `rx-0111-${timestamp}`,
        timestamp,
        canId: '07E8',
        type: 'RX',
        queue: 'Fast (25Hz)',
        pid: '41 11',
        bytes: `03 41 11 ${throttleByte} 00 00 00 00`,
        formula: '(A*100)/255',
        decodedValue: `${frame.throttlePct.toFixed(0)}%`
      });

      // 4. Boost / MAP (Mode 01, PID 0B): kPa -> PSI
      const mapKpa = Math.round((frame.boostPsi / 0.145038) + 101.3);
      const mapByte = Math.min(255, Math.max(0, mapKpa)).toString(16).padStart(2, '0').toUpperCase();
      frames.push({
        id: `rx-010b-${timestamp}`,
        timestamp,
        canId: '07E8',
        type: 'RX',
        queue: 'Fast (25Hz)',
        pid: '41 0B',
        bytes: `03 41 0B ${mapByte} 00 00 00 00`,
        formula: '(A - 101.3) * 0.145',
        decodedValue: `${frame.boostPsi >= 0 ? '+' : ''}${frame.boostPsi.toFixed(1)} PSI`
      });

      // 5. Air Fuel Ratio (Mode 01, PID 34): Lambda / AFR
      const lambdaRatio = frame.afr / 14.7;
      const lambdaRaw = Math.round(lambdaRatio * 32768);
      const afrA = (lambdaRaw >> 8) & 0xff;
      const afrB = lambdaRaw & 0xff;
      frames.push({
        id: `rx-0134-${timestamp}`,
        timestamp,
        canId: '07E8',
        type: 'RX',
        queue: 'Fast (25Hz)',
        pid: '41 34',
        bytes: `04 41 34 ${afrA.toString(16).padStart(2, '0').toUpperCase()} ${afrB.toString(16).padStart(2, '0').toUpperCase()} 00 00`,
        formula: '((A*256)+B)/32768*14.7',
        decodedValue: `${frame.afr.toFixed(2)}:1 AFR`
      });

    } else {
      // 1Hz Slow Queue: Honda Mode 22 Enhanced PIDs
      // 1. K20C1 Oil Temp (Mode 22, PID 1101): (A - 40) C -> F
      const oilTempC = Math.round((frame.oilTempF - 32) / 1.8);
      const oilByte = Math.min(255, Math.max(0, oilTempC + 40)).toString(16).padStart(2, '0').toUpperCase();
      frames.push({
        id: `rx-221101-${timestamp}`,
        timestamp,
        canId: '07E8',
        type: 'RX',
        queue: 'Slow (1Hz)',
        pid: '62 11 01',
        bytes: `04 62 11 01 ${oilByte} 00 00 00`,
        formula: '(A - 40) * 1.8 + 32',
        decodedValue: `${Math.round(frame.oilTempF)}°F`
      });

      // 2. Coolant Temp (Mode 01, PID 05)
      const coolantC = Math.round((frame.coolantTempF - 32) / 1.8);
      const coolantByte = Math.min(255, Math.max(0, coolantC + 40)).toString(16).padStart(2, '0').toUpperCase();
      frames.push({
        id: `rx-0105-${timestamp}`,
        timestamp,
        canId: '07E8',
        type: 'RX',
        queue: 'Slow (1Hz)',
        pid: '41 05',
        bytes: `03 41 05 ${coolantByte} 00 00 00 00`,
        formula: '(A - 40) * 1.8 + 32',
        decodedValue: `${Math.round(frame.coolantTempF)}°F`
      });

      // 3. Intake Air Temp IAT (Mode 01, PID 0F)
      const iatC = Math.round((frame.iatF - 32) / 1.8);
      const iatByte = Math.min(255, Math.max(0, iatC + 40)).toString(16).padStart(2, '0').toUpperCase();
      frames.push({
        id: `rx-010f-${timestamp}`,
        timestamp,
        canId: '07E8',
        type: 'RX',
        queue: 'Slow (1Hz)',
        pid: '41 0F',
        bytes: `03 41 0F ${iatByte} 00 00 00 00`,
        formula: '(A - 40) * 1.8 + 32',
        decodedValue: `${Math.round(frame.iatF)}°F`
      });

      // 4. Knock Retard Cyl 1-4 (Mode 22, PID 1142)
      const k1 = Math.round(frame.knockRetard[0] * 4).toString(16).padStart(2, '0').toUpperCase();
      const k2 = Math.round(frame.knockRetard[1] * 4).toString(16).padStart(2, '0').toUpperCase();
      const k3 = Math.round(frame.knockRetard[2] * 4).toString(16).padStart(2, '0').toUpperCase();
      const k4 = Math.round(frame.knockRetard[3] * 4).toString(16).padStart(2, '0').toUpperCase();
      frames.push({
        id: `rx-221142-${timestamp}`,
        timestamp,
        canId: '07E8',
        type: 'RX',
        queue: 'Slow (1Hz)',
        pid: '62 11 42',
        bytes: `07 62 11 42 ${k1} ${k2} ${k3} ${k4}`,
        formula: '[A, B, C, D] * 0.25°',
        decodedValue: `C1:${frame.knockRetard[0]}° C2:${frame.knockRetard[1]}° C3:${frame.knockRetard[2]}° C4:${frame.knockRetard[3]}°`
      });

      // 5. Brembo Rotor Temp Est (Mode 22, PID 1155)
      const rotorRaw = Math.round((frame.brakeRotorTempF - 32) / 1.8);
      const rA = ((rotorRaw >> 8) & 0xff).toString(16).padStart(2, '0').toUpperCase();
      const rB = (rotorRaw & 0xff).toString(16).padStart(2, '0').toUpperCase();
      frames.push({
        id: `rx-221155-${timestamp}`,
        timestamp,
        canId: '07E8',
        type: 'RX',
        queue: 'Slow (1Hz)',
        pid: '62 11 55',
        bytes: `05 62 11 55 ${rA} ${rB} 00 00`,
        formula: '((A*256)+B)*1.8+32',
        decodedValue: `${Math.round(frame.brakeRotorTempF)}°F`
      });
    }

    return frames;
  }
}
