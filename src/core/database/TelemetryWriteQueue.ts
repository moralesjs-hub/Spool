import { FK8TelemetryFrame, TelemetryPoint } from '../../types/telemetry';
import { dbService } from './db';

export class TelemetryWriteQueue {
  private static instance: TelemetryWriteQueue | null = null;
  private queue: TelemetryPoint[] = [];
  private flushIntervalTimer: NodeJS.Timeout | null = null;
  private isFlushing: boolean = false;
  private readonly FLUSH_INTERVAL_MS = 2500; // 2.5 seconds batch flush

  private constructor() {
    this.startAutoFlush();
  }

  public static getInstance(): TelemetryWriteQueue {
    if (!TelemetryWriteQueue.instance) {
      TelemetryWriteQueue.instance = new TelemetryWriteQueue();
    }
    return TelemetryWriteQueue.instance;
  }

  public push(tripId: string, frame: FK8TelemetryFrame): void {
    // Only buffer if valid active tripId is provided
    if (!tripId) return;

    this.queue.push({
      tripId,
      timestamp: frame.timestamp,
      rpm: frame.rpm,
      speedMph: frame.speedMph,
      gear: frame.gear,
      boostPsi: frame.boostPsi,
      throttlePct: frame.throttlePct,
      oilTempF: frame.oilTempF,
      coolantTempF: frame.coolantTempF,
      iatF: frame.iatF,
      afr: frame.afr,
      knockRetard: frame.knockRetard[2] // Focus on Cyl 3 as primary track retard reference
    });
  }

  public async flush(): Promise<void> {
    if (this.isFlushing || this.queue.length === 0) return;
    this.isFlushing = true;
    const batch = [...this.queue];
    this.queue = [];

    try {
      await dbService.insertTelemetryBatch(batch);
    } catch (err) {
      console.error('Failed to flush telemetry batch to database:', err);
      // Re-insert unwritten batch to front of queue to prevent data loss
      this.queue = batch.concat(this.queue);
    } finally {
      this.isFlushing = false;
    }
  }

  public startAutoFlush(): void {
    if (this.flushIntervalTimer) return;
    this.flushIntervalTimer = setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL_MS);
  }

  public stopAutoFlush(): void {
    if (this.flushIntervalTimer) {
      clearInterval(this.flushIntervalTimer);
      this.flushIntervalTimer = null;
    }
  }

  public getPendingCount(): number {
    return this.queue.length;
  }
}

export const writeQueue = TelemetryWriteQueue.getInstance();
