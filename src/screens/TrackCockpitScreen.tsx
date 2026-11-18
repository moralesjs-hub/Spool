import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTelemetryStore } from '../core/store/useTelemetryStore';
import { SequentialShiftStrip } from '../components/gauges/SequentialShiftStrip';
import { RadialBoostGauge } from '../components/gauges/RadialBoostGauge';
import { GForceFrictionCircle } from '../components/gauges/GForceFrictionCircle';
import { AegeanBlueFK8Twin } from '../components/three/AegeanBlueFK8Twin';
import { Timer, Flag, Flame, ShieldAlert, RotateCcw, Play, Square, Award } from 'lucide-react-native';

export const TrackCockpitScreen: React.FC = () => {
  const currentFrame = useTelemetryStore((s) => s.currentFrame);
  const peakBoost = useTelemetryStore((s) => s.peakBoost);
  const resetPeakBoost = useTelemetryStore((s) => s.resetPeakBoost);
  const peakG = useTelemetryStore((s) => s.peakG);
  const resetPeakG = useTelemetryStore((s) => s.resetPeakG);

  // Lap Timer store state & actions
  const lapTimer = useTelemetryStore((s) => s.lapTimer);
  const recordLap = useTelemetryStore((s) => s.recordLap);
  const resetLapTimer = useTelemetryStore((s) => s.resetLapTimer);

  // Local millisecond tick for live lap clock display
  const [elapsedMs, setElapsedMs] = useState<number>(34820);

  useEffect(() => {
    if (!lapTimer.isRunning) return;
    const interval = setInterval(() => {
      setElapsedMs((prev) => prev + 100);
    }, 100);
    return () => clearInterval(interval);
  }, [lapTimer.isRunning]);

  const formatLapTime = (ms: number | null) => {
    if (ms === null || ms <= 0) return '--:--.---';
    const totalSec = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    const millis = ms % 1000;
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${Math.floor(millis / 10).toString().padStart(2, '0')}`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* 1. FULL-WIDTH 15-LED SEQUENTIAL SHIFT STRIP */}
      <SequentialShiftStrip rpm={currentFrame.rpm} maxRpm={7000} />

      {/* 2. THREE-COLUMN +R TRACK LAYOUT */}
      <View style={styles.trackGrid}>
        {/* LEFT COLUMN: K20C1 THERMAL PROTECTION MATRIX */}
        <View style={styles.leftCol}>
          <View style={styles.matrixCard}>
            <View style={styles.matrixHeader}>
              <Flame size={14} color="#E40521" />
              <Text style={styles.matrixTitle}>K20C1 THERMAL MATRIX</Text>
            </View>

            {/* Engine Oil Temp (Warn 245°F, Crit 265°F) */}
            <View style={styles.metricRow}>
              <View style={styles.metricLabelRow}>
                <Text style={styles.thermalLabel}>ENGINE OIL TEMP</Text>
                <Text
                  style={[
                    styles.thermalVal,
                    currentFrame.oilTempF >= 245 && styles.thermalValWarn,
                    currentFrame.oilTempF >= 265 && styles.thermalValCrit
                  ]}
                >
                  {Math.round(currentFrame.oilTempF)}°F
                </Text>
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${Math.min(100, Math.max(0, ((currentFrame.oilTempF - 120) / (280 - 120)) * 100))}%`,
                      backgroundColor:
                        currentFrame.oilTempF >= 265
                          ? '#E40521'
                          : currentFrame.oilTempF >= 245
                          ? '#F59E0B'
                          : '#10B981'
                    }
                  ]}
                />
              </View>
              <Text style={styles.thresholdText}>WARN 245°F | CRIT 265°F</Text>
            </View>

            {/* Coolant Temp (Warn 212°F, Crit 225°F) */}
            <View style={styles.metricRow}>
              <View style={styles.metricLabelRow}>
                <Text style={styles.thermalLabel}>COOLANT TEMP</Text>
                <Text
                  style={[
                    styles.thermalVal,
                    currentFrame.coolantTempF >= 212 && styles.thermalValWarn,
                    currentFrame.coolantTempF >= 225 && styles.thermalValCrit
                  ]}
                >
                  {Math.round(currentFrame.coolantTempF)}°F
                </Text>
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${Math.min(100, Math.max(0, ((currentFrame.coolantTempF - 140) / (250 - 140)) * 100))}%`,
                      backgroundColor:
                        currentFrame.coolantTempF >= 225
                          ? '#E40521'
                          : currentFrame.coolantTempF >= 212
                          ? '#F59E0B'
                          : '#10B981'
                    }
                  ]}
                />
              </View>
              <Text style={styles.thresholdText}>WARN 212°F | CRIT 225°F</Text>
            </View>

            {/* Intake Air Temp (IAT / Intercooler Heat Soak - Warn 130°F) */}
            <View style={styles.metricRow}>
              <View style={styles.metricLabelRow}>
                <Text style={styles.thermalLabel}>INTAKE AIR (IAT)</Text>
                <Text
                  style={[
                    styles.thermalVal,
                    currentFrame.iatF >= 130 && styles.thermalValWarn
                  ]}
                >
                  {currentFrame.iatF}°F
                </Text>
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${Math.min(100, Math.max(0, ((currentFrame.iatF - 60) / (160 - 60)) * 100))}%`,
                      backgroundColor: currentFrame.iatF >= 130 ? '#E40521' : '#38BDF8'
                    }
                  ]}
                />
              </View>
              <Text style={styles.thresholdText}>HEAT SOAK LIMIT 130°F</Text>
            </View>

            {/* Air / Fuel Ratio (AFR) */}
            <View style={styles.metricRow}>
              <View style={styles.metricLabelRow}>
                <Text style={styles.thermalLabel}>AIR/FUEL RATIO (AFR)</Text>
                <Text
                  style={[
                    styles.thermalVal,
                    currentFrame.afr < 12.0 ? styles.thermalValRich : styles.thermalValStoich
                  ]}
                >
                  {currentFrame.afr.toFixed(2)}:1
                </Text>
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${Math.min(100, Math.max(0, ((currentFrame.afr - 10) / (18 - 10)) * 100))}%`,
                      backgroundColor: currentFrame.afr < 12.0 ? '#10B981' : '#F59E0B'
                    }
                  ]}
                />
              </View>
              <Text style={styles.thresholdText}>14.7 STOICH | 11.6 WOT TARGET</Text>
            </View>

            {/* 4-Cylinder Individual Knock Retard Matrix */}
            <View style={styles.knockSection}>
              <Text style={styles.knockHeaderTitle}>INDIVIDUAL KNOCK RETARD (CYL 1-4)</Text>
              <View style={styles.knockGrid}>
                {currentFrame.knockRetard.map((deg, idx) => {
                  const isRetarding = deg > 0;
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.knockCylBox,
                        isRetarding && styles.knockCylBoxActive
                      ]}
                    >
                      <Text style={styles.knockCylTag}>CYL {idx + 1}</Text>
                      <Text
                        style={[
                          styles.knockCylVal,
                          isRetarding && styles.knockCylValActive
                        ]}
                      >
                        {deg > 0 ? `-${deg.toFixed(1)}°` : '0.0°'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        {/* CENTER COLUMN: RACE CLUSTER + 3D DIGITAL TWIN */}
        <View style={styles.centerCol}>
          {/* Top Race Cluster: Giant Gear + Radial Boost Gauge */}
          <View style={styles.clusterTopRow}>
            {/* Giant Central Gear & Speed */}
            <View style={styles.centralGearBox}>
              <Text style={styles.gearTag}>CURRENT GEAR</Text>
              <Text style={styles.gearDisplay}>{currentFrame.gear}</Text>
              <View style={styles.speedSubRow}>
                <Text style={styles.speedSubVal}>{Math.round(currentFrame.speedMph)}</Text>
                <Text style={styles.speedSubUnit}>MPH</Text>
              </View>
              {currentFrame.vtecEngaged && (
                <View style={styles.vtecActiveBadge}>
                  <Text style={styles.vtecActiveText}>VTEC ENGAGED</Text>
                </View>
              )}
            </View>

            {/* Sweeping SVG Radial Boost Gauge */}
            <View style={{ flex: 1 }}>
              <RadialBoostGauge
                boostPsi={currentFrame.boostPsi}
                peakBoostPsi={peakBoost}
                throttlePct={currentFrame.throttlePct}
                onResetPeak={resetPeakBoost}
              />
            </View>
          </View>

          {/* Embedded Interactive 3D Aegean Blue FK8 Digital Twin */}
          <View style={styles.threeWrapper}>
            <AegeanBlueFK8Twin />
          </View>
        </View>

        {/* RIGHT COLUMN: TRACK TIMING & 2D G-METER */}
        <View style={styles.rightCol}>
          {/* Auto-Lap & Sector Delta Timer */}
          <View style={styles.lapTimerCard}>
            <View style={styles.lapTimerHeader}>
              <Timer size={14} color="#10B981" />
              <Text style={styles.lapTimerTitle}>+R CIRCUIT LAP TIMER</Text>
              <View style={styles.lapPill}>
                <Text style={styles.lapPillText}>LAP {lapTimer.lapCount}</Text>
              </View>
            </View>

            {/* Current Running Lap Time */}
            <View style={styles.liveClockRow}>
              <Text style={styles.liveClockText}>{formatLapTime(elapsedMs)}</Text>
            </View>

            {/* Sector Delta Display */}
            <View style={styles.deltaBox}>
              <Text style={styles.deltaLabel}>SECTOR 2 DELTA:</Text>
              <Text
                style={[
                  styles.deltaVal,
                  lapTimer.sectorDelta <= 0 ? styles.deltaGreen : styles.deltaRed
                ]}
              >
                {lapTimer.sectorDelta <= 0 ? `${lapTimer.sectorDelta.toFixed(2)}s` : `+${lapTimer.sectorDelta.toFixed(2)}s`}
              </Text>
            </View>

            {/* Best & Last Lap Recall */}
            <View style={styles.lapRecallGrid}>
              <View style={styles.recallItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Award size={12} color="#F59E0B" />
                  <Text style={styles.recallLabel}>BEST LAP</Text>
                </View>
                <Text style={styles.recallValBest}>{formatLapTime(lapTimer.bestLapTime)}</Text>
              </View>

              <View style={styles.recallItem}>
                <Text style={styles.recallLabel}>LAST LAP</Text>
                <Text style={styles.recallVal}>{formatLapTime(lapTimer.lastLapTime)}</Text>
              </View>
            </View>

            {/* Manual Mark Lap & Reset Buttons */}
            <View style={styles.lapControlsRow}>
              <TouchableOpacity style={styles.markLapBtn} onPress={recordLap}>
                <Flag size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.markLapText}>MARK LAP</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.resetTimerBtn} onPress={resetLapTimer}>
                <RotateCcw size={12} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>

          {/* 2D G-Force Friction Circle */}
          <GForceFrictionCircle
            latG={currentFrame.latG}
            lonG={currentFrame.lonG}
            peakLat={peakG.lat}
            peakLon={peakG.lon}
            onResetPeak={resetPeakG}
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07080A'
  },
  contentContainer: {
    padding: 12,
    gap: 12
  },
  trackGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  leftCol: {
    flex: 1,
    minWidth: 270,
    maxWidth: 340
  },
  centerCol: {
    flex: 2,
    minWidth: 380,
    gap: 12
  },
  rightCol: {
    flex: 1,
    minWidth: 270,
    gap: 12
  },
  matrixCard: {
    backgroundColor: '#090C10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(228, 5, 33, 0.3)',
    padding: 12
  },
  matrixHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10
  },
  matrixTitle: {
    color: '#E40521',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '800',
    letterSpacing: 0.5
  },
  metricRow: {
    marginBottom: 10
  },
  metricLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3
  },
  thermalLabel: {
    color: '#94A3B8',
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  thermalVal: {
    color: '#F8FAFC',
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '800'
  },
  thermalValWarn: {
    color: '#F59E0B'
  },
  thermalValCrit: {
    color: '#E40521'
  },
  thermalValRich: {
    color: '#10B981'
  },
  thermalValStoich: {
    color: '#38BDF8'
  },
  barTrack: {
    height: 6,
    backgroundColor: '#18181B',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 2
  },
  barFill: {
    height: '100%',
    borderRadius: 3
  },
  thresholdText: {
    color: '#64748B',
    fontSize: 8,
    fontFamily: 'monospace'
  },
  knockSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 8,
    marginTop: 4
  },
  knockHeaderTitle: {
    color: '#94A3B8',
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700',
    marginBottom: 6
  },
  knockGrid: {
    flexDirection: 'row',
    gap: 6
  },
  knockCylBox: {
    flex: 1,
    backgroundColor: '#111622',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 6,
    padding: 6,
    alignItems: 'center'
  },
  knockCylBoxActive: {
    borderColor: '#E40521',
    backgroundColor: 'rgba(228, 5, 33, 0.15)'
  },
  knockCylTag: {
    color: '#64748B',
    fontSize: 8,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  knockCylVal: {
    color: '#10B981',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '800',
    marginTop: 2
  },
  knockCylValActive: {
    color: '#E40521'
  },
  clusterTopRow: {
    flexDirection: 'row',
    gap: 12
  },
  centralGearBox: {
    width: 140,
    backgroundColor: '#090C10',
    borderWidth: 1,
    borderColor: 'rgba(228, 5, 33, 0.4)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  gearTag: {
    color: '#64748B',
    fontSize: 8,
    fontFamily: 'monospace',
    fontWeight: '800'
  },
  gearDisplay: {
    color: '#F8FAFC',
    fontSize: 64,
    fontFamily: 'monospace',
    fontWeight: '900',
    lineHeight: 70
  },
  speedSubRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4
  },
  speedSubVal: {
    color: '#E40521',
    fontSize: 20,
    fontFamily: 'monospace',
    fontWeight: '900'
  },
  speedSubUnit: {
    color: '#94A3B8',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  vtecActiveBadge: {
    marginTop: 6,
    backgroundColor: '#E40521',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  vtecActiveText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontFamily: 'monospace',
    fontWeight: '900'
  },
  threeWrapper: {
    width: '100%'
  },
  lapTimerCard: {
    backgroundColor: '#090C10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12
  },
  lapTimerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  lapTimerTitle: {
    color: '#94A3B8',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700',
    letterSpacing: 0.5
  },
  lapPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  lapPillText: {
    color: '#10B981',
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  liveClockRow: {
    alignItems: 'center',
    paddingVertical: 4
  },
  liveClockText: {
    color: '#F8FAFC',
    fontSize: 32,
    fontFamily: 'monospace',
    fontWeight: '900',
    letterSpacing: 1
  },
  deltaBox: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#111622',
    borderRadius: 6,
    paddingVertical: 4,
    marginVertical: 6
  },
  deltaLabel: {
    color: '#64748B',
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  deltaVal: {
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '800'
  },
  deltaGreen: {
    color: '#10B981'
  },
  deltaRed: {
    color: '#E40521'
  },
  lapRecallGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 8,
    marginVertical: 4
  },
  recallItem: {
    alignItems: 'flex-start'
  },
  recallLabel: {
    color: '#64748B',
    fontSize: 8,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  recallValBest: {
    color: '#F59E0B',
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '800'
  },
  recallVal: {
    color: '#F8FAFC',
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  lapControlsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8
  },
  markLapBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E40521',
    borderRadius: 6,
    paddingVertical: 8
  },
  markLapText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '800'
  },
  resetTimerBtn: {
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center'
  }
});
