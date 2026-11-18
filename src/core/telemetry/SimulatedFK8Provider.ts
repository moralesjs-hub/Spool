import { FK8TelemetryFrame, HexFrame, ScenarioPreset, DTC } from '../../types/telemetry';
import { ITelemetryProvider } from './ITelemetryProvider';
import { PidDecoder } from './PidDecoder';

export class SimulatedFK8Provider implements ITelemetryProvider {
  private timer: NodeJS.Timeout | null = null;
  private slowTimer: NodeJS.Timeout | null = null;
  private onFrameCallback: ((frame: FK8TelemetryFrame) => void) | null = null;
  private onHexFramesCallback: ((frames: HexFrame[]) => void) | null = null;

  private currentScenario: ScenarioPreset = 'warm-cruise';
  private manualMode: boolean = false;
  private manualThrottle: number = 0;
  private manualGear: number | 'N' | 'R' = 6;
  private manualBraking: boolean = false;

  // Active DTC codes in memory
  private activeDtcs: DTC[] = [];

  // Internal state variables for realistic physics simulation
  private rpm: number = 2400;
  private speedMph: number = 68.0;
  private gear: number | 'N' | 'R' = 6;
  private throttlePct: number = 22;
  private boostPsi: number = -4.1; // inHg equivalent: ~ -8.4 inHg
  private oilTempF: number = 195.0;
  private coolantTempF: number = 195.0;
  private iatF: number = 96.0;
  private brakeRotorTempF: number = 210.0;
  private knockRetard: [number, number, number, number] = [0, 0, 0, 0];
  private knockCount: number = 0;
  private latG: number = 0.02;
  private lonG: number = 0.01;
  private avgMpg: number = 29.4;
  private distanceMilesAccumulator: number = 142.5;

  // WOT Pull simulation step counter
  private wotStep: number = 0;

  constructor() {
    this.applyScenario(this.currentScenario);
  }

  public startStream(
    onFrame: (frame: FK8TelemetryFrame) => void,
    onHexFrames?: (frames: HexFrame[]) => void
  ): void {
    this.onFrameCallback = onFrame;
    this.onHexFramesCallback = onHexFrames || null;

    if (this.timer) clearInterval(this.timer);
    if (this.slowTimer) clearInterval(this.slowTimer);

    // 25Hz Fast Loop (40ms interval)
    this.timer = setInterval(() => {
      this.tickPhysics(0.04);
      const frame = this.buildFrame();
      if (this.onFrameCallback) {
        this.onFrameCallback(frame);
      }
      if (this.onHexFramesCallback) {
        const hex = PidDecoder.generateHexFrames(frame, 'fast');
        this.onHexFramesCallback(hex);
      }
    }, 40);

    // 1Hz Slow Loop (1000ms interval) for Honda Mode 22 enhanced PIDs
    this.slowTimer = setInterval(() => {
      const frame = this.buildFrame();
      if (this.onHexFramesCallback) {
        const hex = PidDecoder.generateHexFrames(frame, 'slow');
        this.onHexFramesCallback(hex);
      }
    }, 1000);
  }

  public stopStream(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.slowTimer) {
      clearInterval(this.slowTimer);
      this.slowTimer = null;
    }
  }

  public setScenario(scenario: ScenarioPreset): void {
    this.manualMode = false;
    this.currentScenario = scenario;
    this.applyScenario(scenario);
  }

  public setManualOverride(throttlePct: number, gear: number | 'N' | 'R', braking: boolean): void {
    this.manualMode = true;
    this.manualThrottle = Math.max(0, Math.min(100, throttlePct));
    this.manualGear = gear;
    this.manualBraking = braking;
  }

  public async scanDtc(): Promise<DTC[]> {
    // Simulate CAN query delay
    await new Promise((resolve) => setTimeout(resolve, 600));
    return [...this.activeDtcs];
  }

  public async clearDtc(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    this.activeDtcs = [];
  }

  public async simulateFault(code: 'P0299' | 'P0300'): Promise<DTC> {
    let fault: DTC;
    if (code === 'P0299') {
      fault = {
        code: 'P0299',
        description: 'Turbocharger Underboost Condition (K20C1 Wastegate / Boost Deviation > 3.5 PSI)',
        ecu: 'PGM-FI (07E8)',
        severity: 'warning',
        timestamp: new Date().toLocaleTimeString()
      };
    } else {
      fault = {
        code: 'P0300',
        description: 'Random / Multiple Cylinder Misfire Detected (High Track Load Knock Threshold Exceeded)',
        ecu: 'PGM-FI (07E8)',
        severity: 'critical',
        timestamp: new Date().toLocaleTimeString()
      };
    }

    if (!this.activeDtcs.some((d) => d.code === fault.code)) {
      this.activeDtcs.push(fault);
    }
    return fault;
  }

  private applyScenario(scenario: ScenarioPreset): void {
    switch (scenario) {
      case 'cold-start':
        this.rpm = 1150;
        this.speedMph = 0;
        this.gear = 'N';
        this.throttlePct = 0;
        this.boostPsi = -9.2;
        this.oilTempF = 118.0;
        this.coolantTempF = 125.0;
        this.iatF = 72.0;
        this.brakeRotorTempF = 95.0;
        this.knockRetard = [0, 0, 0, 0];
        this.latG = 0.0;
        this.lonG = 0.0;
        break;

      case 'warm-cruise':
        this.rpm = 2450;
        this.speedMph = 68.0;
        this.gear = 6;
        this.throttlePct = 24;
        this.boostPsi = -4.1; // ~ -8.4 inHg vacuum
        this.oilTempF = 195.0;
        this.coolantTempF = 195.0;
        this.iatF = 92.0;
        this.brakeRotorTempF = 190.0;
        this.knockRetard = [0, 0, 0, 0];
        this.latG = 0.04;
        this.lonG = 0.0;
        break;

      case 'wot-pull':
        this.rpm = 3800;
        this.speedMph = 42.0;
        this.gear = 2;
        this.throttlePct = 100;
        this.boostPsi = 22.8;
        this.oilTempF = 210.0;
        this.coolantTempF = 202.0;
        this.iatF = 108.0;
        this.brakeRotorTempF = 340.0;
        this.knockRetard = [0, 0, 0, 0];
        this.wotStep = 0;
        break;

      case 'heat-soak':
        this.rpm = 6400;
        this.speedMph = 104.0;
        this.gear = 4;
        this.throttlePct = 92;
        this.boostPsi = 21.4;
        this.oilTempF = 262.0;
        this.coolantTempF = 221.0;
        this.iatF = 144.0;
        this.brakeRotorTempF = 820.0;
        this.knockRetard = [0.0, 0.0, 1.5, 0.0];
        this.knockCount = 3;
        this.latG = 1.18;
        this.lonG = 0.22;
        break;

      case 'parked':
        this.rpm = 0;
        this.speedMph = 0;
        this.gear = 'N';
        this.throttlePct = 0;
        this.boostPsi = 0;
        this.oilTempF = 195.0;
        this.coolantTempF = 195.0;
        this.iatF = 88.0;
        this.brakeRotorTempF = 120.0;
        this.knockRetard = [0, 0, 0, 0];
        this.latG = 0;
        this.lonG = 0;
        break;
    }
  }

  private tickPhysics(dt: number): void {
    if (this.manualMode) {
      this.throttlePct = this.manualThrottle;
      this.gear = this.manualGear;

      if (this.manualBraking) {
        this.lonG = -1.15;
        this.speedMph = Math.max(0, this.speedMph - 45 * dt);
        this.brakeRotorTempF = Math.min(880, this.brakeRotorTempF + 90 * dt);
      } else {
        // Accelerate or coast
        if (this.gear !== 'N' && this.gear !== 'R') {
          const gearNum = Number(this.gear);
          const maxSpeedInGear = gearNum * 26 + 10;
          const targetSpeed = (this.throttlePct / 100) * maxSpeedInGear;
          const accel = (this.throttlePct / 100) * 18;
          if (this.speedMph < targetSpeed) {
            this.speedMph = Math.min(targetSpeed, this.speedMph + accel * dt);
            this.lonG = (accel / 18) * 0.65;
          } else {
            this.speedMph = Math.max(targetSpeed, this.speedMph - 8 * dt);
            this.lonG = -0.15;
          }
          // Compute RPM from speed & gear
          this.rpm = Math.min(7150, Math.max(850, (this.speedMph / maxSpeedInGear) * 6800 + 850));
        } else {
          // Neutral free revving
          this.rpm = 850 + (this.throttlePct / 100) * 6100;
          this.speedMph = Math.max(0, this.speedMph - 5 * dt);
          this.lonG = 0;
        }
      }

      // Boost calculation from throttle and RPM
      if (this.throttlePct > 40 && this.rpm > 2800) {
        const targetBoost = ((this.throttlePct - 40) / 60) * 23.2;
        this.boostPsi += (targetBoost - this.boostPsi) * 0.15;
      } else {
        const targetVac = -9.8 + (this.throttlePct / 40) * 9.8;
        this.boostPsi += (targetVac - this.boostPsi) * 0.2;
      }

      // Cool brake rotor
      if (!this.manualBraking && this.brakeRotorTempF > 150) {
        this.brakeRotorTempF -= (15 + this.speedMph * 0.2) * dt;
      }
      return;
    }

    // Automated scenario physics ticks
    switch (this.currentScenario) {
      case 'cold-start':
        // Idle breathing oscillation
        this.rpm = 1150 + Math.sin(Date.now() / 600) * 35;
        this.oilTempF = Math.min(160, this.oilTempF + 0.05 * dt);
        this.coolantTempF = Math.min(165, this.coolantTempF + 0.1 * dt);
        this.speedMph = 0;
        this.lonG = 0;
        this.latG = 0;
        this.boostPsi = -9.2 + Math.sin(Date.now() / 800) * 0.3;
        break;

      case 'warm-cruise':
        // Subtle highway speed variation (67 - 69 MPH)
        this.speedMph = 68.0 + Math.sin(Date.now() / 2500) * 1.2;
        this.rpm = 2450 + (this.speedMph - 68.0) * 35;
        this.throttlePct = 24 + Math.sin(Date.now() / 2000) * 3;
        this.boostPsi = -4.1 + Math.sin(Date.now() / 1500) * 0.4;
        this.latG = Math.sin(Date.now() / 3500) * 0.06;
        this.lonG = Math.cos(Date.now() / 3000) * 0.03;
        this.distanceMilesAccumulator += (this.speedMph / 3600) * dt;
        break;

      case 'wot-pull':
        this.wotStep += dt;
        // Gear progression: 2nd gear pull (0-2.8s) -> shift 3rd (2.8-5.5s) -> 4th (5.5s+)
        if (this.wotStep < 2.8) {
          this.gear = 2;
          this.throttlePct = 100;
          this.boostPsi = 22.8 + Math.sin(Date.now() / 200) * 0.4;
          this.rpm = 4000 + (this.wotStep / 2.8) * (6950 - 4000);
          this.speedMph = 35 + (this.wotStep / 2.8) * 28;
          this.lonG = 0.62;
        } else if (this.wotStep < 3.1) {
          // Shift point clutch in
          this.gear = 3;
          this.throttlePct = 10;
          this.boostPsi = 4.0;
          this.rpm = 4900;
          this.lonG = -0.1;
        } else if (this.wotStep < 6.0) {
          // 3rd gear pull
          this.gear = 3;
          this.throttlePct = 100;
          this.boostPsi = 23.2 + Math.sin(Date.now() / 200) * 0.2;
          const pullRatio = (this.wotStep - 3.1) / 2.9;
          this.rpm = 4900 + pullRatio * (6920 - 4900);
          this.speedMph = 63 + pullRatio * 32;
          this.lonG = 0.54;
        } else {
          // Reset pull loop
          this.wotStep = 0;
        }
        this.brakeRotorTempF = Math.min(480, this.brakeRotorTempF + 8 * dt);
        this.latG = Math.sin(Date.now() / 800) * 0.08;
        break;

      case 'heat-soak':
        // Dynamic track lap variations (cornering hard + braking + acceleration)
        const cycle = (Date.now() / 1000) % 8;
        if (cycle < 3.5) {
          // Cornering apex
          this.latG = 1.25 + Math.sin(Date.now() / 400) * 0.12;
          this.lonG = 0.05;
          this.speedMph = 78 + Math.sin(Date.now() / 500) * 4;
          this.rpm = 5800 + Math.sin(Date.now() / 300) * 300;
          this.boostPsi = 18.5;
        } else if (cycle < 5.0) {
          // Threshold braking into hairpin
          this.latG = 0.2;
          this.lonG = -1.15;
          this.speedMph = Math.max(38, this.speedMph - 24 * dt);
          this.rpm = 4400;
          this.boostPsi = -7.5;
          this.brakeRotorTempF = Math.min(845, this.brakeRotorTempF + 40 * dt);
        } else {
          // Straight line WOT exit
          this.latG = 0.05;
          this.lonG = 0.58;
          this.speedMph += 18 * dt;
          this.rpm = Math.min(6850, this.rpm + 450 * dt);
          this.boostPsi = 21.8;
        }
        this.oilTempF = 262.0 + Math.sin(Date.now() / 2000) * 1.5;
        this.coolantTempF = 221.0 + Math.sin(Date.now() / 2000) * 1.0;
        this.iatF = 144.0 + Math.sin(Date.now() / 1500) * 1.5;
        this.knockRetard = [0.0, 0.0, 1.5, 0.0];
        break;

      case 'parked':
        this.rpm = 0;
        this.speedMph = 0;
        this.gear = 'N';
        this.throttlePct = 0;
        this.boostPsi = 0;
        this.lonG = 0;
        this.latG = 0;
        if (this.brakeRotorTempF > 110) {
          this.brakeRotorTempF -= 15 * dt;
        }
        break;
    }
  }

  private buildFrame(): FK8TelemetryFrame {
    const isWot = this.throttlePct > 80;
    const isDecel = this.throttlePct < 5 && this.rpm > 1800;

    // K20C1 Air-Fuel Ratio (AFR)
    let calculatedAfr = 14.7;
    if (isDecel) {
      calculatedAfr = 19.8 + Math.random() * 0.4; // Fuel cutoff decel
    } else if (isWot) {
      calculatedAfr = 11.6 + Math.random() * 0.2; // Rich WOT target for turbo cooling
    } else {
      calculatedAfr = 14.7 + (Math.random() - 0.5) * 0.25; // Stoich cruise
    }

    // Instant MPG calculation
    let instantMpg = 29.4;
    if (this.speedMph <= 0 || this.rpm === 0) {
      instantMpg = 0;
    } else if (isDecel) {
      instantMpg = 99.9;
    } else {
      const fuelFlowRate = (this.rpm / 6000) * (Math.max(1, this.boostPsi + 14.7) / 14.7) * (this.throttlePct / 50);
      instantMpg = Math.min(65, Math.max(4.5, (this.speedMph / Math.max(0.1, fuelFlowRate)) * 0.32));
    }

    // Vacuum in inHg when boost < 0
    const manifoldPressureInHg = this.boostPsi < 0 ? this.boostPsi * 2.036 : 0;

    // Eco shift advisor logic: suggest upshift at 2,600 RPM if cruising gently
    let ecoShiftAdvisor: string | null = null;
    if (
      typeof this.gear === 'number' &&
      this.gear >= 1 &&
      this.gear < 6 &&
      this.rpm >= 2500 &&
      this.throttlePct < 40 &&
      this.oilTempF >= 165
    ) {
      ecoShiftAdvisor = `Shift to ${this.gear + 1} (${Math.round(this.rpm)} RPM)`;
    }

    // VTEC on K20C1 engages around 4,800+ RPM under boost
    const vtecEngaged = this.rpm >= 4800 && this.boostPsi > 2.0;
    const shiftLightActive = this.rpm >= 4800;

    // 4-corner TPMS calculation (heating up with brake rotor and track load)
    const baseFrontPsi = 35.0;
    const baseRearPsi = 33.0;
    const heatBonusFront = Math.min(6.5, (this.brakeRotorTempF - 100) * 0.007);
    const heatBonusRear = Math.min(3.5, (this.brakeRotorTempF - 100) * 0.003);

    return {
      timestamp: Date.now(),
      rpm: Math.max(0, this.rpm),
      speedMph: Math.max(0, Math.round(this.speedMph * 10) / 10),
      gear: this.gear,
      boostPsi: Math.round(this.boostPsi * 10) / 10,
      manifoldPressureInHg: Math.round(manifoldPressureInHg * 10) / 10,
      throttlePct: Math.round(this.throttlePct),
      oilTempF: Math.round(this.oilTempF * 10) / 10,
      coolantTempF: Math.round(this.coolantTempF * 10) / 10,
      iatF: Math.round(this.iatF),
      afr: Math.round(calculatedAfr * 100) / 100,
      batteryVoltage: 14.2 + (Math.sin(Date.now() / 4000) * 0.15),
      instantMpg: Math.round(instantMpg * 10) / 10,
      avgMpg: Math.round(this.avgMpg * 10) / 10,
      latG: Math.round(this.latG * 100) / 100,
      lonG: Math.round(this.lonG * 100) / 100,
      brakeRotorTempF: Math.round(this.brakeRotorTempF),
      knockRetard: this.knockRetard,
      knockCount: this.knockCount,
      tpms: {
        fl: { psi: Math.round((baseFrontPsi + heatBonusFront) * 10) / 10, tempF: Math.round(88 + heatBonusFront * 8) },
        fr: { psi: Math.round((baseFrontPsi + heatBonusFront + (this.latG > 0 ? 0.4 : 0)) * 10) / 10, tempF: Math.round(89 + heatBonusFront * 8) },
        rl: { psi: Math.round((baseRearPsi + heatBonusRear) * 10) / 10, tempF: Math.round(82 + heatBonusRear * 6) },
        rr: { psi: Math.round((baseRearPsi + heatBonusRear + (this.latG > 0 ? 0.3 : 0)) * 10) / 10, tempF: Math.round(83 + heatBonusRear * 6) }
      },
      vtecEngaged,
      shiftLightActive,
      ecoShiftAdvisor
    };
  }
}
