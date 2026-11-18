import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTelemetryStore } from '../core/store/useTelemetryStore';
import { AegeanBlueFK8Twin } from '../components/three/AegeanBlueFK8Twin';
import { SmartContextualCards } from '../components/gauges/SmartContextualCards';
import { Activity, Gauge, Compass, Disc, ShieldCheck, ArrowUpRight } from 'lucide-react-native';

export const DailyCockpitScreen: React.FC = () => {
  const currentFrame = useTelemetryStore((s) => s.currentFrame);
  const activeTrip = useTelemetryStore((s) => s.activeTrip);
  const setAppMode = useTelemetryStore((s) => s.setAppMode);
  const motionLocked = useTelemetryStore((s) => s.motionLocked);
  const devOverrideMotionLock = useTelemetryStore((s) => s.devOverrideMotionLock);

  const tripMiles = activeTrip ? activeTrip.distanceMiles : 12.4;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* TOP OEM+ METRICS STRIP */}
      <View style={styles.topStrip}>
        {/* Speed Dial / Numeral */}
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>VEHICLE SPEED</Text>
          <View style={styles.metricValueRow}>
            <Text style={styles.speedNumeral}>{Math.round(currentFrame.speedMph)}</Text>
            <Text style={styles.speedUnit}>MPH</Text>
          </View>
        </View>

        {/* Current Gear Box */}
        <View style={styles.gearCard}>
          <Text style={styles.metricLabel}>GEAR</Text>
          <Text style={styles.gearNumeral}>{currentFrame.gear}</Text>
        </View>

        {/* RPM & Eco Shift Advisor */}
        <View style={[styles.metricCard, { flex: 2 }]}>
          <View style={styles.rpmHeader}>
            <Text style={styles.metricLabel}>K20C1 ENGINE SPEED</Text>
            <Text style={styles.rpmValue}>
              {Math.round(currentFrame.rpm)} <Text style={styles.unitSub}>RPM</Text>
            </Text>
          </View>

          {/* Calm RPM progress bar */}
          <View style={styles.rpmTrack}>
            <View
              style={[
                styles.rpmFill,
                { width: `${Math.min(100, Math.max(0, (currentFrame.rpm / 7000) * 100))}%` }
              ]}
            />
          </View>

          {/* Eco Shift Advisor */}
          <View style={styles.advisorRow}>
            {currentFrame.ecoShiftAdvisor ? (
              <Text style={styles.advisorActive}>
                ECO ADVISOR: {currentFrame.ecoShiftAdvisor}
              </Text>
            ) : (
              <Text style={styles.advisorCalm}>OPTIMAL CRUISE GEAR ENGAGED</Text>
            )}
          </View>
        </View>
      </View>

      {/* CENTER GRID LAYOUT */}
      <View style={styles.mainGrid}>
        {/* LEFT COLUMN: Smart Contextual Card (Warmup Guardian vs Eco-Boost Coach) */}
        <View style={styles.leftColumn}>
          <SmartContextualCards
            oilTempF={currentFrame.oilTempF}
            coolantTempF={currentFrame.coolantTempF}
            iatF={currentFrame.iatF}
            batteryVoltage={currentFrame.batteryVoltage}
            rpm={currentFrame.rpm}
            boostPsi={currentFrame.boostPsi}
            instantMpg={currentFrame.instantMpg}
            avgMpg={currentFrame.avgMpg}
            knockCount={currentFrame.knockCount}
            tripMiles={tripMiles}
          />
        </View>

        {/* CENTERPIECE: Interactive 3D Aegean Blue FK8 Digital Twin */}
        <View style={styles.centerColumn}>
          <AegeanBlueFK8Twin />
        </View>

        {/* RIGHT COLUMN: TPMS & Quick Diagnostics Access */}
        <View style={styles.rightColumn}>
          {/* 4-Corner TPMS Card */}
          <View style={styles.tpmsCard}>
            <View style={styles.cardHeader}>
              <Disc size={14} color="#3B82F6" />
              <Text style={styles.cardTitle}>4-CORNER TPMS MONITOR</Text>
            </View>

            <View style={styles.tpmsGrid}>
              {/* Front Left */}
              <View style={styles.tpmsWheelBox}>
                <Text style={styles.tpmsCornerTag}>FL (FRONT LEFT)</Text>
                <Text style={styles.tpmsPsi}>{currentFrame.tpms.fl.psi.toFixed(1)} <Text style={styles.tpmsUnit}>PSI</Text></Text>
                <Text style={styles.tpmsTemp}>{currentFrame.tpms.fl.tempF}°F</Text>
              </View>

              {/* Front Right */}
              <View style={styles.tpmsWheelBox}>
                <Text style={styles.tpmsCornerTag}>FR (FRONT RIGHT)</Text>
                <Text style={styles.tpmsPsi}>{currentFrame.tpms.fr.psi.toFixed(1)} <Text style={styles.tpmsUnit}>PSI</Text></Text>
                <Text style={styles.tpmsTemp}>{currentFrame.tpms.fr.tempF}°F</Text>
              </View>

              {/* Rear Left */}
              <View style={styles.tpmsWheelBox}>
                <Text style={styles.tpmsCornerTag}>RL (REAR LEFT)</Text>
                <Text style={styles.tpmsPsi}>{currentFrame.tpms.rl.psi.toFixed(1)} <Text style={styles.tpmsUnit}>PSI</Text></Text>
                <Text style={styles.tpmsTemp}>{currentFrame.tpms.rl.tempF}°F</Text>
              </View>

              {/* Rear Right */}
              <View style={styles.tpmsWheelBox}>
                <Text style={styles.tpmsCornerTag}>RR (REAR RIGHT)</Text>
                <Text style={styles.tpmsPsi}>{currentFrame.tpms.rr.psi.toFixed(1)} <Text style={styles.tpmsUnit}>PSI</Text></Text>
                <Text style={styles.tpmsTemp}>{currentFrame.tpms.rr.tempF}°F</Text>
              </View>
            </View>

            <View style={styles.tpmsSpecsFooter}>
              <Text style={styles.tpmsTargetText}>OEM COLD TARGET: 35F / 33R PSI</Text>
            </View>
          </View>

          {/* Quick Jump to DTC Scanner */}
          <TouchableOpacity
            style={[styles.dtcJumpButton, motionLocked && !devOverrideMotionLock && styles.dtcJumpButtonDisabled]}
            onPress={() => {
              if (!motionLocked || devOverrideMotionLock) {
                setAppMode('garage');
              }
            }}
          >
            <View style={styles.dtcJumpLeft}>
              <ShieldCheck size={16} color="#10B981" />
              <View>
                <Text style={styles.dtcJumpTitle}>OBD-II DTC DIAGNOSTICS</Text>
                <Text style={styles.dtcJumpSub}>
                  {motionLocked && !devOverrideMotionLock ? 'LOCKED IN MOTION (>5 MPH)' : 'PARKED ECU ACCESS READY'}
                </Text>
              </View>
            </View>
            <ArrowUpRight size={14} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070A0F'
  },
  contentContainer: {
    padding: 12,
    gap: 12
  },
  topStrip: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap'
  },
  metricCard: {
    backgroundColor: '#090C10',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 10,
    minWidth: 130
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700',
    letterSpacing: 0.5
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 2
  },
  speedNumeral: {
    color: '#F8FAFC',
    fontSize: 32,
    fontFamily: 'monospace',
    fontWeight: '900'
  },
  speedUnit: {
    color: '#3B82F6',
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  gearCard: {
    backgroundColor: '#0B101B',
    borderWidth: 1,
    borderColor: 'rgba(0, 70, 173, 0.4)',
    borderRadius: 10,
    padding: 10,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center'
  },
  gearNumeral: {
    color: '#38BDF8',
    fontSize: 34,
    fontFamily: 'monospace',
    fontWeight: '900'
  },
  rpmHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4
  },
  rpmValue: {
    color: '#F8FAFC',
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: '800'
  },
  unitSub: {
    color: '#64748B',
    fontSize: 11
  },
  rpmTrack: {
    height: 8,
    backgroundColor: '#18181B',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 4
  },
  rpmFill: {
    height: '100%',
    backgroundColor: '#0046AD',
    borderRadius: 4
  },
  advisorRow: {
    marginTop: 2
  },
  advisorActive: {
    color: '#F59E0B',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  advisorCalm: {
    color: '#10B981',
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '600'
  },
  mainGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  leftColumn: {
    flex: 1,
    minWidth: 280,
    maxWidth: 360
  },
  centerColumn: {
    flex: 2,
    minWidth: 380
  },
  rightColumn: {
    flex: 1,
    minWidth: 260,
    gap: 10
  },
  tpmsCard: {
    backgroundColor: '#090C10',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8
  },
  cardTitle: {
    color: '#94A3B8',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700',
    letterSpacing: 0.5
  },
  tpmsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  tpmsWheelBox: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#111622',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 6,
    padding: 8
  },
  tpmsCornerTag: {
    color: '#64748B',
    fontSize: 8,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  tpmsPsi: {
    color: '#F8FAFC',
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: '800',
    marginVertical: 2
  },
  tpmsUnit: {
    fontSize: 9,
    color: '#3B82F6'
  },
  tpmsTemp: {
    color: '#94A3B8',
    fontSize: 10,
    fontFamily: 'monospace'
  },
  tpmsSpecsFooter: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 6
  },
  tpmsTargetText: {
    color: '#64748B',
    fontSize: 8,
    fontFamily: 'monospace',
    textAlign: 'center'
  },
  dtcJumpButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0D1424',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 10,
    padding: 12
  },
  dtcJumpButtonDisabled: {
    opacity: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  dtcJumpLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  dtcJumpTitle: {
    color: '#F8FAFC',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '800'
  },
  dtcJumpSub: {
    color: '#94A3B8',
    fontSize: 9,
    fontFamily: 'monospace'
  }
});
