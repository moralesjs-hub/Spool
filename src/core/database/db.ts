import { Platform } from 'react-native';
import { TripLog, TelemetryPoint, MaintenanceItem } from '../../types/telemetry';

export const INITIAL_MAINTENANCE_ITEMS: MaintenanceItem[] = [
  {
    id: 'oil-change',
    name: 'K20C1 0W-20 Full Synthetic Oil & Filter',
    category: 'Powertrain',
    intervalMiles: 3500,
    lastPerformedMiles: 18200,
    lastPerformedDate: '2026-09-12',
    currentVehicleMiles: 20450,
    remainingMiles: 1250,
    status: 'good'
  },
  {
    id: 'mtf-flush',
    name: 'Honda MTF Manual Transmission Fluid Flush',
    category: 'Drivetrain',
    intervalMiles: 15000,
    lastPerformedMiles: 10000,
    lastPerformedDate: '2026-04-18',
    currentVehicleMiles: 20450,
    remainingMiles: 4550,
    status: 'good'
  },
  {
    id: 'brake-fluid',
    name: 'Brembo DOT 4 High-Temp Brake Fluid Flush',
    category: 'Brakes',
    intervalMiles: 10000,
    lastPerformedMiles: 11500,
    lastPerformedDate: '2026-06-05',
    currentVehicleMiles: 20450,
    remainingMiles: 1050,
    status: 'due-soon'
  },
  {
    id: 'tire-rotation',
    name: '20" Continental / Michelin PS4S Tire Rotation',
    category: 'Wheels & Chassis',
    intervalMiles: 5000,
    lastPerformedMiles: 16000,
    lastPerformedDate: '2026-08-01',
    currentVehicleMiles: 20450,
    remainingMiles: 550,
    status: 'due-soon'
  }
];

export const INITIAL_TRIPS: TripLog[] = [
  {
    id: 'trip-20261110-01',
    startTime: '2026-11-10 08:15',
    endTime: '2026-11-10 08:52',
    mode: 'daily',
    distanceMiles: 24.6,
    avgMpg: 28.9,
    peakBoostPsi: 14.2,
    peakRpm: 5400,
    maxOilTempF: 204.5,
    durationSeconds: 2220
  },
  {
    id: 'trip-20261112-02',
    startTime: '2026-11-12 14:02',
    endTime: '2026-11-12 14:48',
    mode: 'track',
    distanceMiles: 38.2,
    avgMpg: 9.8,
    peakBoostPsi: 23.2,
    peakRpm: 6980,
    maxOilTempF: 258.4,
    durationSeconds: 2760
  }
];

export interface IDatabaseService {
  init(): Promise<void>;
  insertTrip(trip: TripLog): Promise<void>;
  getTrips(): Promise<TripLog[]>;
  insertTelemetryBatch(points: TelemetryPoint[]): Promise<void>;
  getTelemetryPoints(tripId: string): Promise<TelemetryPoint[]>;
  getMaintenanceItems(): Promise<MaintenanceItem[]>;
  updateMaintenanceItem(item: MaintenanceItem): Promise<void>;
  resetMaintenanceItem(id: string, currentMiles: number): Promise<MaintenanceItem>;
}

class WebDatabaseService implements IDatabaseService {
  private readonly TRIPS_KEY = 'fk8_trips_v1';
  private readonly POINTS_KEY = 'fk8_points_v1';
  private readonly MAINT_KEY = 'fk8_maintenance_v1';

  public async init(): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (!window.localStorage.getItem(this.TRIPS_KEY)) {
        window.localStorage.setItem(this.TRIPS_KEY, JSON.stringify(INITIAL_TRIPS));
      }
      if (!window.localStorage.getItem(this.MAINT_KEY)) {
        window.localStorage.setItem(this.MAINT_KEY, JSON.stringify(INITIAL_MAINTENANCE_ITEMS));
      }
      if (!window.localStorage.getItem(this.POINTS_KEY)) {
        window.localStorage.setItem(this.POINTS_KEY, JSON.stringify([]));
      }
    }
  }

  public async insertTrip(trip: TripLog): Promise<void> {
    const trips = await this.getTrips();
    trips.unshift(trip);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(this.TRIPS_KEY, JSON.stringify(trips));
    }
  }

  public async getTrips(): Promise<TripLog[]> {
    if (typeof window !== 'undefined' && window.localStorage) {
      const data = window.localStorage.getItem(this.TRIPS_KEY);
      if (data) {
        try {
          return JSON.parse(data);
        } catch {
          return INITIAL_TRIPS;
        }
      }
    }
    return INITIAL_TRIPS;
  }

  public async insertTelemetryBatch(points: TelemetryPoint[]): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      const existing = await this.getAllTelemetryPoints();
      const updated = existing.concat(points);
      // Keep last 10,000 points in web local storage to prevent quota limits
      const capped = updated.length > 10000 ? updated.slice(updated.length - 10000) : updated;
      window.localStorage.setItem(this.POINTS_KEY, JSON.stringify(capped));
    }
  }

  private async getAllTelemetryPoints(): Promise<TelemetryPoint[]> {
    if (typeof window !== 'undefined' && window.localStorage) {
      const data = window.localStorage.getItem(this.POINTS_KEY);
      if (data) {
        try {
          return JSON.parse(data);
        } catch {
          return [];
        }
      }
    }
    return [];
  }

  public async getTelemetryPoints(tripId: string): Promise<TelemetryPoint[]> {
    const all = await this.getAllTelemetryPoints();
    const filtered = all.filter((p) => p.tripId === tripId);
    if (filtered.length === 0) {
      // Generate synthetic points for sample trips if empty
      return this.generateSyntheticTelemetry(tripId);
    }
    return filtered;
  }

  public async getMaintenanceItems(): Promise<MaintenanceItem[]> {
    if (typeof window !== 'undefined' && window.localStorage) {
      const data = window.localStorage.getItem(this.MAINT_KEY);
      if (data) {
        try {
          return JSON.parse(data);
        } catch {
          return INITIAL_MAINTENANCE_ITEMS;
        }
      }
    }
    return INITIAL_MAINTENANCE_ITEMS;
  }

  public async updateMaintenanceItem(item: MaintenanceItem): Promise<void> {
    const items = await this.getMaintenanceItems();
    const index = items.findIndex((i) => i.id === item.id);
    if (index >= 0) {
      items[index] = item;
    } else {
      items.push(item);
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(this.MAINT_KEY, JSON.stringify(items));
    }
  }

  public async resetMaintenanceItem(id: string, currentMiles: number): Promise<MaintenanceItem> {
    const items = await this.getMaintenanceItems();
    const item = items.find((i) => i.id === id);
    if (!item) {
      throw new Error(`Maintenance item ${id} not found`);
    }
    item.lastPerformedMiles = currentMiles;
    item.lastPerformedDate = new Date().toISOString().split('T')[0];
    item.remainingMiles = item.intervalMiles;
    item.status = 'good';
    await this.updateMaintenanceItem(item);
    return item;
  }

  private generateSyntheticTelemetry(tripId: string): TelemetryPoint[] {
    const points: TelemetryPoint[] = [];
    const now = Date.now();
    for (let i = 0; i < 50; i++) {
      const t = now - (50 - i) * 1000;
      points.push({
        id: i + 1,
        tripId,
        timestamp: t,
        rpm: 2000 + Math.sin(i / 5) * 1500,
        speedMph: 45 + Math.sin(i / 5) * 25,
        gear: 4,
        boostPsi: Math.sin(i / 3) * 12,
        throttlePct: 40 + Math.sin(i / 4) * 35,
        oilTempF: 195 + i * 0.2,
        coolantTempF: 195,
        iatF: 95,
        afr: 14.7,
        knockRetard: 0
      });
    }
    return points;
  }
}

class NativeDatabaseService implements IDatabaseService {
  private db: any = null;
  private fallbackWeb: WebDatabaseService = new WebDatabaseService();

  public async init(): Promise<void> {
    try {
      const SQLite = require('expo-sqlite');
      this.db = await SQLite.openDatabaseAsync('fk8_telemetry.db');
      await this.db.execAsync('PRAGMA journal_mode = WAL;');
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS trips (
          id TEXT PRIMARY KEY,
          startTime TEXT,
          endTime TEXT,
          mode TEXT,
          distanceMiles REAL,
          avgMpg REAL,
          peakBoostPsi REAL,
          peakRpm INTEGER,
          maxOilTempF REAL,
          durationSeconds INTEGER
        );

        CREATE TABLE IF NOT EXISTS telemetry_points (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tripId TEXT,
          timestamp INTEGER,
          rpm REAL,
          speedMph REAL,
          gear TEXT,
          boostPsi REAL,
          throttlePct REAL,
          oilTempF REAL,
          coolantTempF REAL,
          iatF REAL,
          afr REAL,
          knockRetard REAL
        );

        CREATE TABLE IF NOT EXISTS maintenance_items (
          id TEXT PRIMARY KEY,
          name TEXT,
          category TEXT,
          intervalMiles INTEGER,
          lastPerformedMiles INTEGER,
          lastPerformedDate TEXT,
          currentVehicleMiles INTEGER,
          remainingMiles INTEGER,
          status TEXT
        );
      `);

      // Seed maintenance items if empty
      const existingMaint = await this.db.getAllAsync('SELECT COUNT(*) as count FROM maintenance_items;');
      if (existingMaint && existingMaint[0]?.count === 0) {
        for (const item of INITIAL_MAINTENANCE_ITEMS) {
          await this.db.runAsync(
            `INSERT INTO maintenance_items (id, name, category, intervalMiles, lastPerformedMiles, lastPerformedDate, currentVehicleMiles, remainingMiles, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [item.id, item.name, item.category, item.intervalMiles, item.lastPerformedMiles, item.lastPerformedDate, item.currentVehicleMiles, item.remainingMiles, item.status]
          );
        }
      }

      // Seed trips if empty
      const existingTrips = await this.db.getAllAsync('SELECT COUNT(*) as count FROM trips;');
      if (existingTrips && existingTrips[0]?.count === 0) {
        for (const trip of INITIAL_TRIPS) {
          await this.db.runAsync(
            `INSERT INTO trips (id, startTime, endTime, mode, distanceMiles, avgMpg, peakBoostPsi, peakRpm, maxOilTempF, durationSeconds)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [trip.id, trip.startTime, trip.endTime, trip.mode, trip.distanceMiles, trip.avgMpg, trip.peakBoostPsi, trip.peakRpm, trip.maxOilTempF, trip.durationSeconds]
          );
        }
      }
    } catch (e) {
      console.warn('Native SQLite unavailable, falling back to Web storage:', e);
      this.db = null;
      await this.fallbackWeb.init();
    }
  }

  public async insertTrip(trip: TripLog): Promise<void> {
    if (!this.db) return this.fallbackWeb.insertTrip(trip);
    await this.db.runAsync(
      `INSERT INTO trips (id, startTime, endTime, mode, distanceMiles, avgMpg, peakBoostPsi, peakRpm, maxOilTempF, durationSeconds)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [trip.id, trip.startTime, trip.endTime, trip.mode, trip.distanceMiles, trip.avgMpg, trip.peakBoostPsi, trip.peakRpm, trip.maxOilTempF, trip.durationSeconds]
    );
  }

  public async getTrips(): Promise<TripLog[]> {
    if (!this.db) return this.fallbackWeb.getTrips();
    return await this.db.getAllAsync('SELECT * FROM trips ORDER BY startTime DESC;');
  }

  public async insertTelemetryBatch(points: TelemetryPoint[]): Promise<void> {
    if (!this.db) return this.fallbackWeb.insertTelemetryBatch(points);
    if (points.length === 0) return;

    await this.db.withTransactionAsync(async () => {
      for (const p of points) {
        await this.db.runAsync(
          `INSERT INTO telemetry_points (tripId, timestamp, rpm, speedMph, gear, boostPsi, throttlePct, oilTempF, coolantTempF, iatF, afr, knockRetard)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [p.tripId, p.timestamp, p.rpm, p.speedMph, String(p.gear), p.boostPsi, p.throttlePct, p.oilTempF, p.coolantTempF, p.iatF, p.afr, p.knockRetard]
        );
      }
    });
  }

  public async getTelemetryPoints(tripId: string): Promise<TelemetryPoint[]> {
    if (!this.db) return this.fallbackWeb.getTelemetryPoints(tripId);
    return await this.db.getAllAsync('SELECT * FROM telemetry_points WHERE tripId = ? ORDER BY timestamp ASC;', [tripId]);
  }

  public async getMaintenanceItems(): Promise<MaintenanceItem[]> {
    if (!this.db) return this.fallbackWeb.getMaintenanceItems();
    return await this.db.getAllAsync('SELECT * FROM maintenance_items;');
  }

  public async updateMaintenanceItem(item: MaintenanceItem): Promise<void> {
    if (!this.db) return this.fallbackWeb.updateMaintenanceItem(item);
    await this.db.runAsync(
      `UPDATE maintenance_items
       SET lastPerformedMiles = ?, lastPerformedDate = ?, remainingMiles = ?, status = ?
       WHERE id = ?;`,
      [item.lastPerformedMiles, item.lastPerformedDate, item.remainingMiles, item.status, item.id]
    );
  }

  public async resetMaintenanceItem(id: string, currentMiles: number): Promise<MaintenanceItem> {
    if (!this.db) return this.fallbackWeb.resetMaintenanceItem(id, currentMiles);
    const item = (await this.db.getFirstAsync('SELECT * FROM maintenance_items WHERE id = ?;', [id])) as MaintenanceItem;
    if (!item) throw new Error(`Maintenance item ${id} not found`);

    const updated: MaintenanceItem = {
      ...item,
      lastPerformedMiles: currentMiles,
      lastPerformedDate: new Date().toISOString().split('T')[0],
      remainingMiles: item.intervalMiles,
      status: 'good'
    };
    await this.updateMaintenanceItem(updated);
    return updated;
  }
}

export const dbService: IDatabaseService = Platform.OS === 'web' ? new WebDatabaseService() : new NativeDatabaseService();
