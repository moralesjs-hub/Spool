import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle, CheckCircle, Fuel, Gauge, ShieldAlert, Thermometer, Zap } from 'lucide-react-native';

interface SmartContextualCardsProps {
  oilTempF: number;
  coolantTempF: number;
  iatF: number;
  batteryVoltage: number;
  rpm: number;
  boostPsi: number;
  instantMpg: number;
  avgMpg: number;
  knockCount: number;
  tripMiles: number;
}

export const SmartContextualCards: React.FC<SmartContextualCardsProps> = ({
  oilTempF,
  coolantTempF,
  iatF,
  batteryVoltage,
  rpm,
  boostPsi,
  instantMpg,
  avgMpg,
  knockCount,
  tripMiles
}) => {
  // 1. Cold Engine Protection Guardian (< 165°F target)
  const isColdEngine = oilTempF < 165;
  const warmupPct = Math.min(100, Math.max(0, ((oilTempF - 70) / (165 - 70)) * 100));
  const isViolatingColdLimits = isColdEngine && (rpm > 3500 || boostPsi > 0);

  // 2. Thermal / Knock Alert (> 245°F oil, > 212°F coolant, > 130°F IAT, or knockCount > 0)
  const isOverheating = oilTempF > 245 || coolantTempF > 212 || iatF > 130 || knockCount > 0;

  // Estimated fuel cost: assuming 93 Octane Premium at $4.25/gallon
  const fuelUsedGallons = tripMiles > 0 && avgMpg > 0 ? tripMiles / avgMpg : 0;
  const tripFuelCost = fuelUsedGallons * 4.25;

  return (
    <View style={styles.container}>
      {/* CARD 1: Contextual Warmup Guardian (<165°F) vs Eco-Boost Coach (>=165°F) */}
      {isColdEngine ? (
        <View style={[styles.card, styles.coldCard, isViolatingColdLimits && styles.coldCardViolation]}>
          <View style={styles.cardHeader}>
            <View style={styles.titleRow}>
              <Thermometer size={14} color="#0284C7" />
              <Text style={styles.cardTitle}>K20C1 WARMUP GUARDIAN</Text>
            </View>
            <View style={styles.tempPill}>
              <Text style={styles.tempPillText}>{Math.round(oilTempF)}°F / 165°F</Text>
            </View>
          </View>

          {/* Warmup Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${warmupPct}%` }]} />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressSub}>WARMUP: {Math.round(warmupPct)}%</Text>
              <Text style={styles.progressSub}>VTEC INHIBITED</Text>
            </View>
          </View>

          {/* Active Cold Limit Warning if driver pushes engine */}
          {isViolatingColdLimits ? (
            <View style={styles.violationBanner}>
              <AlertTriangle size={13} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.violationText}>
                COLD OIL WARNING: LIMIT TO &lt;3,500 RPM &amp; NO BOOST
              </Text>
            </View>
          ) : (
            <Text style={styles.coldAdvisory}>
              Oil viscosity stabilizing. Keep RPM below 3,500 and boost at 0.0 PSI until 165°F.
            </Text>
          )}
        </View>
      ) : (
        <View style={[styles.card, styles.ecoCard]}>
          <View style={styles.cardHeader}>
            <View style={styles.titleRow}>
              <Fuel size={14} color="#10B981" />
              <Text style={styles.cardTitle}>ECO-BOOST &amp; MPG COACH</Text>
            </View>
            <View style={styles.ecoScorePill}>
              <Text style={styles.ecoScoreText}>OPTIMAL TEMP</Text>
            </View>
          </View>

          <View style={styles.ecoMetricsGrid}>
            <View style={styles.ecoMetricItem}>
              <Text style={styles.ecoLabel}>INSTANT MPG</Text>
              <Text style={styles.ecoValue}>{instantMpg.toFixed(1)}</Text>
            </View>
            <View style={styles.ecoMetricItem}>
              <Text style={styles.ecoLabel}>TRIP AVG MPG</Text>
              <Text style={styles.ecoValue}>{avgMpg.toFixed(1)}</Text>
            </View>
            <View style={styles.ecoMetricItem}>
              <Text style={styles.ecoLabel}>EST. FUEL COST</Text>
              <Text style={styles.ecoValue}>${tripFuelCost.toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.vacuumBarContainer}>
            <View style={styles.vacuumBarHeader}>
              <Text style={styles.vacuumLabel}>MANIFOLD VACUUM EFFICIENCY</Text>
              <Text style={styles.vacuumValue}>
                {boostPsi < 0 ? `${(boostPsi * 2.036).toFixed(1)} inHg` : `+${boostPsi.toFixed(1)} PSI`}
              </Text>
            </View>
            <View style={styles.vacuumTrack}>
              <View
                style={[
                  styles.vacuumFill,
                  {
                    width: `${Math.min(100, Math.max(0, ((boostPsi + 14.7) / 20) * 100))}%`,
                    backgroundColor: boostPsi < 0 ? '#10B981' : '#F59E0B'
                  }
                ]}
              />
            </View>
          </View>
        </View>
      )}

      {/* CARD 2: Passive Vitals Pill -> Active Thermal Alert */}
      {isOverheating ? (
        <View style={styles.thermalAlertCard}>
          <View style={styles.alertHeader}>
            <ShieldAlert size={16} color="#FFFFFF" />
            <Text style={styles.alertTitle}>THERMAL / KNOCK ALARM DETECTED</Text>
          </View>
          <View style={styles.alertReadouts}>
            <Text style={styles.alertItem}>
              OIL: <Text style={oilTempF > 245 ? styles.alertValueHot : styles.alertValueNormal}>{Math.round(oilTempF)}°F</Text>
            </Text>
            <Text style={styles.alertItem}>
              CLT: <Text style={coolantTempF > 212 ? styles.alertValueHot : styles.alertValueNormal}>{Math.round(coolantTempF)}°F</Text>
            </Text>
            <Text style={styles.alertItem}>
              IAT: <Text style={iatF > 130 ? styles.alertValueHot : styles.alertValueNormal}>{Math.round(iatF)}°F</Text>
            </Text>
            <Text style={styles.alertItem}>
              KNOCK: <Text style={knockCount > 0 ? styles.alertValueHot : styles.alertValueNormal}>{knockCount}</Text>
            </Text>
          </View>
          <View style={styles.cooldownAdvisor}>
            <Text style={styles.cooldownTitle}>COOLDOWN LAP ADVISOR ACTIVE:</Text>
            <Text style={styles.cooldownBody}>
              Upshift to 6th gear, coast off-boost at 45 MPH. Allow front bumper airflow to purge intercooler heat soak.
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.vitalsCard}>
          <View style={styles.vitalsHeader}>
            <View style={styles.titleRow}>
              <CheckCircle size={14} color="#10B981" />
              <Text style={styles.vitalsTitle}>K20C1 ALL VITALS OK</Text>
            </View>
            <View style={styles.statusPillOk}>
              <Text style={styles.statusPillOkText}>SYSTEM NORMAL</Text>
            </View>
          </View>

          <View style={styles.vitalsGrid}>
            <View style={styles.vitalCol}>
              <Text style={styles.vitalLabel}>COOLANT</Text>
              <Text style={styles.vitalVal}>{Math.round(coolantTempF)}°F</Text>
            </View>
            <View style={styles.vitalCol}>
              <Text style={styles.vitalLabel}>OIL TEMP</Text>
              <Text style={styles.vitalVal}>{Math.round(oilTempF)}°F</Text>
            </View>
            <View style={styles.vitalCol}>
              <Text style={styles.vitalLabel}>INTAKE AIR</Text>
              <Text style={styles.vitalVal}>{Math.round(iatF)}°F</Text>
            </View>
            <View style={styles.vitalCol}>
              <Text style={styles.vitalLabel}>BATTERY</Text>
              <Text style={styles.vitalVal}>{batteryVoltage.toFixed(1)}V</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 8
  },
  card: {
    backgroundColor: '#090C10',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12
  },
  coldCard: {
    borderColor: 'rgba(2, 132, 199, 0.4)',
    backgroundColor: 'rgba(2, 132, 199, 0.05)'
  },
  coldCardViolation: {
    borderColor: '#E40521',
    backgroundColor: 'rgba(228, 5, 33, 0.12)'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  cardTitle: {
    color: '#94A3B8',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700',
    letterSpacing: 0.5
  },
  tempPill: {
    backgroundColor: 'rgba(2, 132, 199, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  tempPillText: {
    color: '#38BDF8',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  progressSection: {
    marginBottom: 6
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#1E293B',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0284C7',
    borderRadius: 4
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  progressSub: {
    color: '#64748B',
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '600'
  },
  violationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E40521',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 4,
    marginTop: 4
  },
  violationText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '800'
  },
  coldAdvisory: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 2
  },
  ecoCard: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
    backgroundColor: 'rgba(16, 185, 129, 0.04)'
  },
  ecoScorePill: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  ecoScoreText: {
    color: '#10B981',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  ecoMetricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  ecoMetricItem: {
    alignItems: 'center'
  },
  ecoLabel: {
    color: '#64748B',
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  ecoValue: {
    color: '#F8FAFC',
    fontSize: 15,
    fontFamily: 'monospace',
    fontWeight: '800'
  },
  vacuumBarContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 6
  },
  vacuumBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3
  },
  vacuumLabel: {
    color: '#64748B',
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '600'
  },
  vacuumValue: {
    color: '#38BDF8',
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  vacuumTrack: {
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden'
  },
  vacuumFill: {
    height: '100%',
    borderRadius: 3
  },
  vitalsCard: {
    backgroundColor: '#090C10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12
  },
  vitalsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  vitalsTitle: {
    color: '#94A3B8',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700',
    letterSpacing: 0.5
  },
  statusPillOk: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  statusPillOkText: {
    color: '#10B981',
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  vitalsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  vitalCol: {
    alignItems: 'center'
  },
  vitalLabel: {
    color: '#64748B',
    fontSize: 8,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  vitalVal: {
    color: '#F8FAFC',
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '800'
  },
  thermalAlertCard: {
    backgroundColor: '#E40521',
    borderRadius: 12,
    padding: 12
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6
  },
  alertTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '800'
  },
  alertReadouts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 6,
    padding: 6,
    marginBottom: 6
  },
  alertItem: {
    color: '#CBD5E1',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  alertValueHot: {
    color: '#FEE2E2',
    fontWeight: '900'
  },
  alertValueNormal: {
    color: '#FFFFFF'
  },
  cooldownAdvisor: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 6,
    padding: 8
  },
  cooldownTitle: {
    color: '#FCD34D',
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '800',
    marginBottom: 2
  },
  cooldownBody: {
    color: '#F8FAFC',
    fontSize: 10,
    lineHeight: 14
  }
});
