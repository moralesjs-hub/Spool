import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useTelemetryStore } from '../../core/store/useTelemetryStore';
import { ScenarioPreset } from '../../types/telemetry';
import {
  Sliders,
  ChevronDown,
  ChevronUp,
  Cpu,
  Flame,
  Snowflake,
  Gauge,
  Radio,
  Play,
  Square,
  AlertOctagon,
  Disc
} from 'lucide-react-native';

export const SimulatorControlDrawer: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'scenarios' | 'dyno' | 'sniffer'>('scenarios');

  // Zustand Store hooks
  const setScenario = useTelemetryStore((s) => s.setScenario);
  const setManualOverride = useTelemetryStore((s) => s.setManualOverride);
  const hexFrames = useTelemetryStore((s) => s.hexFrames);
  const currentFrame = useTelemetryStore((s) => s.currentFrame);

  // Manual Dyno state
  const [manualThrottle, setManualThrottle] = useState<number>(25);
  const [manualGear, setManualGear] = useState<number | 'N' | 'R'>(6);
  const [manualBraking, setManualBraking] = useState<boolean>(false);

  const handleScenarioClick = (sc: ScenarioPreset) => {
    setScenario(sc);
  };

  const handleApplyDyno = (throttle: number, gear: number | 'N' | 'R', braking: boolean) => {
    setManualThrottle(throttle);
    setManualGear(gear);
    setManualBraking(braking);
    setManualOverride(throttle, gear, braking);
  };

  return (
    <View style={styles.container}>
      {/* Drawer Toggle Header Bar */}
      <TouchableOpacity style={styles.drawerHeader} onPress={() => setIsExpanded(!isExpanded)}>
        <View style={styles.headerLeft}>
          <Cpu size={14} color="#3B82F6" />
          <Text style={styles.headerTitle}>K20C1 HARDWARE SIMULATOR &amp; OBD-II DECK</Text>
          <View style={styles.frequencyTag}>
            <Text style={styles.frequencyText}>25Hz CAN-BUS</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <Text style={styles.toggleHint}>{isExpanded ? 'COLLAPSE' : 'EXPAND CONTROLS'}</Text>
          {isExpanded ? <ChevronDown size={14} color="#94A3B8" /> : <ChevronUp size={14} color="#94A3B8" />}
        </View>
      </TouchableOpacity>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.drawerBody}>
          {/* Internal Tab Switcher */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'scenarios' && styles.tabItemActive]}
              onPress={() => setActiveTab('scenarios')}
            >
              <Text style={[styles.tabItemText, activeTab === 'scenarios' && styles.tabItemTextActive]}>
                1-CLICK SCENARIO PRESETS
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'dyno' && styles.tabItemActive]}
              onPress={() => setActiveTab('dyno')}
            >
              <Sliders size={12} color={activeTab === 'dyno' ? '#3B82F6' : '#94A3B8'} style={{ marginRight: 4 }} />
              <Text style={[styles.tabItemText, activeTab === 'dyno' && styles.tabItemTextActive]}>
                MANUAL DYNO CONTROLS
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'sniffer' && styles.tabItemActive]}
              onPress={() => setActiveTab('sniffer')}
            >
              <Radio size={12} color={activeTab === 'sniffer' ? '#10B981' : '#94A3B8'} style={{ marginRight: 4 }} />
              <Text style={[styles.tabItemText, activeTab === 'sniffer' && styles.tabItemTextActive]}>
                MODE 01 / 22 HEX SNIFFER ({hexFrames.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* TAB 1: 5 Instant Scenarios */}
          {activeTab === 'scenarios' && (
            <View style={styles.scenariosGrid}>
              {/* 1. Cold Start */}
              <TouchableOpacity
                style={[styles.scenarioCard, styles.coldScenario]}
                onPress={() => handleScenarioClick('cold-start')}
              >
                <View style={styles.scenarioCardTop}>
                  <Snowflake size={14} color="#0284C7" />
                  <Text style={styles.scenarioTitle}>1. Cold Start (118°F Oil)</Text>
                </View>
                <Text style={styles.scenarioDesc}>
                  Idling at 1,150 RPM. Triggers Cold Warmup Guardian card. Cold-rev limit warning at &gt;3,500 RPM.
                </Text>
              </TouchableOpacity>

              {/* 2. Warm Cruise */}
              <TouchableOpacity
                style={[styles.scenarioCard, styles.warmScenario]}
                onPress={() => handleScenarioClick('warm-cruise')}
              >
                <View style={styles.scenarioCardTop}>
                  <Gauge size={14} color="#10B981" />
                  <Text style={styles.scenarioTitle}>2. Warm Cruise (195°F Oil)</Text>
                </View>
                <Text style={styles.scenarioDesc}>
                  68 MPH in 6th gear, -8.4 inHg vacuum, 29.4 MPG. Shows Eco-Boost &amp; MPG Coach.
                </Text>
              </TouchableOpacity>

              {/* 3. +R WOT Pull */}
              <TouchableOpacity
                style={[styles.scenarioCard, styles.wotScenario]}
                onPress={() => handleScenarioClick('wot-pull')}
              >
                <View style={styles.scenarioCardTop}>
                  <Play size={14} color="#E40521" />
                  <Text style={styles.scenarioTitle}>3. +R WOT Pull (23.2 PSI)</Text>
                </View>
                <Text style={styles.scenarioDesc}>
                  Sequential 100% throttle pulls to 6,950 RPM. Triggers 15-LED Shift Strip &amp; exhaust thermal glow.
                </Text>
              </TouchableOpacity>

              {/* 4. Track Heat Soak */}
              <TouchableOpacity
                style={[styles.scenarioCard, styles.heatScenario]}
                onPress={() => handleScenarioClick('heat-soak')}
              >
                <View style={styles.scenarioCardTop}>
                  <Flame size={14} color="#F59E0B" />
                  <Text style={styles.scenarioTitle}>4. Track Heat Soak (262°F)</Text>
                </View>
                <Text style={styles.scenarioDesc}>
                  Lap 5: Oil 262°F, CLT 221°F, 820°F Rotors, 1.5° Knock Retard on Cyl 3. Triggers Thermal Alarm.
                </Text>
              </TouchableOpacity>

              {/* 5. Parked */}
              <TouchableOpacity
                style={[styles.scenarioCard, styles.parkedScenario]}
                onPress={() => handleScenarioClick('parked')}
              >
                <View style={styles.scenarioCardTop}>
                  <Square size={14} color="#94A3B8" />
                  <Text style={styles.scenarioTitle}>5. Parked (0 MPH / 0 RPM)</Text>
                </View>
                <Text style={styles.scenarioDesc}>
                  0 MPH &amp; 0 RPM. Unlocks The Garage screen and automatically finalizes the active trip log!
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* TAB 2: Manual Dyno Controls */}
          {activeTab === 'dyno' && (
            <View style={styles.dynoSection}>
              {/* Throttle Selector Buttons */}
              <View style={styles.dynoControlGroup}>
                <Text style={styles.dynoGroupLabel}>THROTTLE PEDAL: {manualThrottle}%</Text>
                <View style={styles.dynoButtonGroup}>
                  {[0, 15, 30, 50, 75, 100].map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.dynoBtn, manualThrottle === t && styles.dynoBtnActive]}
                      onPress={() => handleApplyDyno(t, manualGear, manualBraking)}
                    >
                      <Text style={[styles.dynoBtnText, manualThrottle === t && styles.dynoBtnTextActive]}>
                        {t}%
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 6-Speed Manual Transmission Shifter */}
              <View style={styles.dynoControlGroup}>
                <Text style={styles.dynoGroupLabel}>K20C1 6-SPEED GEAR SELECTOR: GEAR {manualGear}</Text>
                <View style={styles.dynoButtonGroup}>
                  {(['N', 1, 2, 3, 4, 5, 6, 'R'] as (number | 'N' | 'R')[]).map((g) => (
                    <TouchableOpacity
                      key={String(g)}
                      style={[styles.dynoBtn, manualGear === g && styles.dynoBtnActiveGear]}
                      onPress={() => handleApplyDyno(manualThrottle, g, manualBraking)}
                    >
                      <Text style={[styles.dynoBtnText, manualGear === g && styles.dynoBtnTextActive]}>
                        {g}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Brembo Braking Trigger */}
              <View style={styles.dynoControlGroup}>
                <Text style={styles.dynoGroupLabel}>BREMBO 4-PISTON DECELERATION TRIGGER</Text>
                <TouchableOpacity
                  style={[styles.dynoBrakeBtn, manualBraking && styles.dynoBrakeBtnActive]}
                  onPress={() => handleApplyDyno(0, manualGear, !manualBraking)}
                >
                  <Disc size={14} color={manualBraking ? '#FFFFFF' : '#E40521'} style={{ marginRight: 6 }} />
                  <Text style={[styles.dynoBrakeText, manualBraking && { color: '#FFFFFF' }]}>
                    {manualBraking ? 'HOLDING HEAVY BRAKE (-1.15G DECEL)' : 'APPLY THRESHOLD BRAKE (-1.15G)'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* TAB 3: Mode 01 & Mode 22 Hex Sniffer */}
          {activeTab === 'sniffer' && (
            <View style={styles.snifferSection}>
              <View style={styles.snifferHeaderRow}>
                <Text style={[styles.snifferColHead, { width: 85 }]}>QUEUE / CAN</Text>
                <Text style={[styles.snifferColHead, { width: 55 }]}>DIR</Text>
                <Text style={[styles.snifferColHead, { width: 65 }]}>PID</Text>
                <Text style={[styles.snifferColHead, { flex: 1 }]}>RAW HEX BYTES</Text>
                <Text style={[styles.snifferColHead, { width: 140 }]}>CONVERSION FORMULA</Text>
                <Text style={[styles.snifferColHead, { width: 110, textAlign: 'right' }]}>VALUE</Text>
              </View>

              <ScrollView style={styles.snifferScroll} nestedScrollEnabled>
                {hexFrames.map((f) => {
                  const isFast = f.queue.includes('25Hz');
                  const isRx = f.type === 'RX';
                  return (
                    <View key={f.id} style={styles.snifferRow}>
                      <View style={{ width: 85, flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.queueDot, isFast ? styles.queueFast : styles.queueSlow]} />
                        <Text style={styles.snifferText}>{f.canId}</Text>
                      </View>
                      <Text style={[styles.snifferText, { width: 55, color: isRx ? '#10B981' : '#3B82F6' }]}>
                        {f.type}
                      </Text>
                      <Text style={[styles.snifferText, { width: 65, color: '#FCD34D' }]}>{f.pid}</Text>
                      <Text style={[styles.snifferTextMonospace, { flex: 1 }]}>{f.bytes}</Text>
                      <Text style={[styles.snifferTextSubtle, { width: 140 }]}>{f.formula}</Text>
                      <Text style={[styles.snifferTextBold, { width: 110, textAlign: 'right' }]}>
                        {f.decodedValue}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#090C10',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 999
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0E131F'
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '800',
    letterSpacing: 0.5
  },
  frequencyTag: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  frequencyText: {
    color: '#3B82F6',
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  toggleHint: {
    color: '#94A3B8',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  drawerBody: {
    padding: 12,
    backgroundColor: '#0B0F19',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)'
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 6
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6
  },
  tabItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)'
  },
  tabItemText: {
    color: '#94A3B8',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  tabItemTextActive: {
    color: '#38BDF8'
  },
  scenariosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  scenarioCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: '#111625',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 10
  },
  coldScenario: {
    borderColor: 'rgba(2, 132, 199, 0.4)'
  },
  warmScenario: {
    borderColor: 'rgba(16, 185, 129, 0.4)'
  },
  wotScenario: {
    borderColor: 'rgba(228, 5, 33, 0.4)'
  },
  heatScenario: {
    borderColor: 'rgba(245, 158, 11, 0.4)'
  },
  parkedScenario: {
    borderColor: 'rgba(148, 163, 184, 0.3)'
  },
  scenarioCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4
  },
  scenarioTitle: {
    color: '#F8FAFC',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '800'
  },
  scenarioDesc: {
    color: '#94A3B8',
    fontSize: 9,
    lineHeight: 13
  },
  dynoSection: {
    gap: 10
  },
  dynoControlGroup: {
    gap: 4
  },
  dynoGroupLabel: {
    color: '#64748B',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  dynoButtonGroup: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap'
  },
  dynoBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#161E2E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 6
  },
  dynoBtnActive: {
    backgroundColor: '#0046AD',
    borderColor: '#3B82F6'
  },
  dynoBtnActiveGear: {
    backgroundColor: '#E40521',
    borderColor: '#EF4444'
  },
  dynoBtnText: {
    color: '#94A3B8',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  dynoBtnTextActive: {
    color: '#FFFFFF'
  },
  dynoBrakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(228, 5, 33, 0.1)',
    borderWidth: 1,
    borderColor: '#E40521',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  dynoBrakeBtnActive: {
    backgroundColor: '#E40521'
  },
  dynoBrakeText: {
    color: '#E40521',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '800'
  },
  snifferSection: {
    gap: 6
  },
  snifferHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)'
  },
  snifferColHead: {
    color: '#64748B',
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '800'
  },
  snifferScroll: {
    maxHeight: 140
  },
  snifferRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center'
  },
  queueDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 6
  },
  queueFast: {
    backgroundColor: '#3B82F6'
  },
  queueSlow: {
    backgroundColor: '#F59E0B'
  },
  snifferText: {
    color: '#CBD5E1',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '600'
  },
  snifferTextMonospace: {
    color: '#94A3B8',
    fontSize: 10,
    fontFamily: 'monospace'
  },
  snifferTextSubtle: {
    color: '#64748B',
    fontSize: 9,
    fontFamily: 'monospace'
  },
  snifferTextBold: {
    color: '#38BDF8',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '800'
  }
});
