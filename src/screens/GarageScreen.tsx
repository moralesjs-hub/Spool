import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert } from 'react-native';
import { useTelemetryStore } from '../core/store/useTelemetryStore';
import {
  FileText,
  Download,
  Wrench,
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  Trash2,
  Cpu,
  Layers,
  Sparkles,
  Info
} from 'lucide-react-native';

const FK8_TORQUE_SPECS = [
  { item: 'Wheel Lug Nuts (M14x1.5)', spec: '94 lb-ft (127 Nm)', socket: '22mm Thin Wall Socket' },
  { item: 'Engine Oil Drain Bolt', spec: '30 lb-ft (40 Nm)', socket: '17mm Box Wrench + New Crush Washer' },
  { item: 'MTF Fill & Drain Plugs', spec: '33 lb-ft (44 Nm)', socket: '3/8" Drive Ratchet + New Washer' },
  { item: 'Front Brembo Caliper Mounting Bolts', spec: '80 lb-ft (108 Nm)', socket: '19mm Socket (Replace Bolts if Removed)' },
  { item: 'Spark Plugs (NGK ILZKAR8J8SY)', spec: '16 lb-ft (22 Nm)', socket: '14mm Thin Spark Plug Socket (0.028" Gap)' }
];

export const GarageScreen: React.FC = () => {
  const trips = useTelemetryStore((s) => s.trips);
  const maintenanceItems = useTelemetryStore((s) => s.maintenanceItems);
  const resetMaintenance = useTelemetryStore((s) => s.resetMaintenance);
  const exportTripCsv = useTelemetryStore((s) => s.exportTripCsv);

  // DTC Scanner store hooks
  const activeDtcs = useTelemetryStore((s) => s.activeDtcs);
  const isScanningDtc = useTelemetryStore((s) => s.isScanningDtc);
  const scanDtc = useTelemetryStore((s) => s.scanDtc);
  const clearDtc = useTelemetryStore((s) => s.clearDtc);
  const simulateFault = useTelemetryStore((s) => s.simulateFault);

  // CSV Modal preview state
  const [csvPreview, setCsvPreview] = useState<{ id: string; content: string } | null>(null);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const handleExportCsv = async (tripId: string) => {
    setIsExporting(tripId);
    try {
      const csv = await exportTripCsv(tripId);

      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `FK8_Telemetry_${tripId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      setCsvPreview({ id: tripId, content: csv });
    } catch (e) {
      console.error('Export CSV error:', e);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* GARAGE INTRO BANNER */}
      <View style={styles.introCard}>
        <View style={styles.introLeft}>
          <Wrench size={18} color="#10B981" />
          <View>
            <Text style={styles.introTitle}>THE GARAGE: PARKED DIAGNOSTICS &amp; LOGS</Text>
            <Text style={styles.introSub}>
              2019 Honda Civic Type R (FK8) • B-593M • K20C1 2.0L VTEC Turbo
            </Text>
          </View>
        </View>
        <View style={styles.parkedStatusBadge}>
          <Text style={styles.parkedStatusText}>PARKED ECU ACCESS</Text>
        </View>
      </View>

      {/* SECTION 1: SQLITE TRIP & TRACK SESSION LOGBOOK */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.headerTitleRow}>
            <FileText size={15} color="#3B82F6" />
            <Text style={styles.sectionTitle}>SQLITE TRIP &amp; TRACK SESSION LOGBOOK</Text>
          </View>
          <Text style={styles.recordCountText}>{trips.length} RECORDED SESSIONS</Text>
        </View>

        <View style={styles.tripsList}>
          {trips.map((trip) => {
            const isTrack = trip.mode === 'track';
            return (
              <View key={trip.id} style={styles.tripCard}>
                <View style={styles.tripTopRow}>
                  <View style={styles.tripMetaLeft}>
                    <View style={[styles.modeBadge, isTrack ? styles.modeBadgeTrack : styles.modeBadgeDaily]}>
                      <Text style={[styles.modeBadgeText, isTrack ? styles.modeBadgeTextTrack : styles.modeBadgeTextDaily]}>
                        {isTrack ? '+R TRACK' : 'DAILY COMMUTE'}
                      </Text>
                    </View>
                    <Text style={styles.tripDateText}>{trip.startTime} → {trip.endTime || 'Active'}</Text>
                  </View>

                  {/* CSV Export Button */}
                  <TouchableOpacity
                    style={styles.exportBtn}
                    onPress={() => handleExportCsv(trip.id)}
                    disabled={isExporting === trip.id}
                  >
                    <Download size={12} color="#FFFFFF" style={{ marginRight: 5 }} />
                    <Text style={styles.exportBtnText}>
                      {isExporting === trip.id ? 'EXPORTING...' : 'Export CSV (Hondata / MLV)'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Metrics Grid */}
                <View style={styles.tripMetricsGrid}>
                  <View style={styles.tripMetricCol}>
                    <Text style={styles.metricLabel}>DISTANCE</Text>
                    <Text style={styles.metricVal}>{trip.distanceMiles.toFixed(1)} MI</Text>
                  </View>

                  <View style={styles.tripMetricCol}>
                    <Text style={styles.metricLabel}>AVG FUEL</Text>
                    <Text style={styles.metricVal}>{trip.avgMpg.toFixed(1)} MPG</Text>
                  </View>

                  <View style={styles.tripMetricCol}>
                    <Text style={styles.metricLabel}>PEAK BOOST</Text>
                    <Text style={[styles.metricVal, { color: '#E40521' }]}>+{trip.peakBoostPsi.toFixed(1)} PSI</Text>
                  </View>

                  <View style={styles.tripMetricCol}>
                    <Text style={styles.metricLabel}>PEAK RPM</Text>
                    <Text style={styles.metricVal}>{trip.peakRpm} RPM</Text>
                  </View>

                  <View style={styles.tripMetricCol}>
                    <Text style={styles.metricLabel}>MAX OIL TEMP</Text>
                    <Text style={[styles.metricVal, trip.maxOilTempF > 245 && { color: '#F59E0B' }]}>
                      {Math.round(trip.maxOilTempF)}°F
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* CSV Preview Drawer if exported */}
        {csvPreview && (
          <View style={styles.csvPreviewBox}>
            <View style={styles.csvPreviewHeader}>
              <Text style={styles.csvPreviewTitle}>HONDATA / MEGALOGVIEWER CSV EXPORT PREVIEW ({csvPreview.id})</Text>
              <TouchableOpacity onPress={() => setCsvPreview(null)}>
                <Text style={styles.csvCloseText}>CLOSE PREVIEW</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal style={styles.csvScroll}>
              <Text style={styles.csvCodeText}>{csvPreview.content}</Text>
            </ScrollView>
          </View>
        )}
      </View>

      {/* SECTION 2: 1-TAP OBD-II / HONDA MODE 22 DTC SCANNER */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.headerTitleRow}>
            <Cpu size={15} color="#E40521" />
            <Text style={styles.sectionTitle}>1-TAP OBD-II / HONDA MODE 22 DTC SCANNER</Text>
          </View>
          <View style={styles.dtcActionButtons}>
            <TouchableOpacity
              style={styles.dtcSimulateBtn}
              onPress={() => simulateFault('P0299')}
            >
              <AlertTriangle size={11} color="#F59E0B" style={{ marginRight: 4 }} />
              <Text style={styles.dtcSimulateText}>Simulate P0299</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dtcSimulateBtn}
              onPress={() => simulateFault('P0300')}
            >
              <AlertOctagon size={11} color="#E40521" style={{ marginRight: 4 }} />
              <Text style={styles.dtcSimulateText}>Simulate P0300</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dtcScanBtn} onPress={scanDtc} disabled={isScanningDtc}>
              <RefreshCw size={11} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.dtcScanBtnText}>{isScanningDtc ? 'SCANNING...' : 'Scan ECU'}</Text>
            </TouchableOpacity>

            {activeDtcs.length > 0 && (
              <TouchableOpacity style={styles.dtcClearBtn} onPress={clearDtc}>
                <Trash2 size={11} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.dtcClearBtnText}>Clear Codes</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {activeDtcs.length === 0 ? (
          <View style={styles.noDtcBox}>
            <CheckCircle size={18} color="#10B981" />
            <Text style={styles.noDtcTitle}>NO DIAGNOSTIC TROUBLE CODES FOUND</Text>
            <Text style={styles.noDtcSub}>All K20C1 powertrain monitors and CAN-bus modules reporting clean.</Text>
          </View>
        ) : (
          <View style={styles.dtcList}>
            {activeDtcs.map((dtc) => (
              <View key={dtc.code} style={styles.dtcCard}>
                <View style={styles.dtcCardHeader}>
                  <View style={styles.dtcBadge}>
                    <Text style={styles.dtcCodeText}>{dtc.code}</Text>
                  </View>
                  <Text style={styles.dtcEcuText}>ECU: {dtc.ecu}</Text>
                  <Text style={styles.dtcTimeText}>{dtc.timestamp}</Text>
                </View>
                <Text style={styles.dtcDescText}>{dtc.description}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* SECTION 3: FK8 MAINTENANCE MINDER & TRACKSIDE TORQUE SPECS */}
      <View style={styles.maintenanceAndTorqueRow}>
        {/* Maintenance Minder */}
        <View style={[styles.sectionCard, { flex: 1, minWidth: 320 }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.headerTitleRow}>
              <Wrench size={15} color="#10B981" />
              <Text style={styles.sectionTitle}>FK8 MAINTENANCE MINDER</Text>
            </View>
            <Text style={styles.odoText}>VEHICLE ODOMETER: 20,450 MI</Text>
          </View>

          <View style={styles.maintList}>
            {maintenanceItems.map((item) => {
              const pct = Math.max(0, Math.min(100, (item.remainingMiles / item.intervalMiles) * 100));
              const isDue = item.status === 'due-soon' || item.remainingMiles < 1200;

              return (
                <View key={item.id} style={styles.maintCard}>
                  <View style={styles.maintCardHeader}>
                    <View>
                      <Text style={styles.maintName}>{item.name}</Text>
                      <Text style={styles.maintCategory}>{item.category} • Interval {item.intervalMiles.toLocaleString()} mi</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.maintResetBtn}
                      onPress={() => resetMaintenance(item.id)}
                    >
                      <RefreshCw size={10} color="#10B981" style={{ marginRight: 3 }} />
                      <Text style={styles.maintResetText}>Log Service</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.maintBarTrack}>
                    <View
                      style={[
                        styles.maintBarFill,
                        { width: `${pct}%`, backgroundColor: isDue ? '#F59E0B' : '#10B981' }
                      ]}
                    />
                  </View>

                  <View style={styles.maintFooter}>
                    <Text style={styles.maintLastDone}>
                      Last: {item.lastPerformedMiles.toLocaleString()} mi ({item.lastPerformedDate})
                    </Text>
                    <Text style={[styles.maintRemaining, isDue && { color: '#F59E0B' }]}>
                      {item.remainingMiles.toLocaleString()} mi remaining
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Pinned FK8 Trackside Torque Specs */}
        <View style={[styles.sectionCard, { flex: 1, minWidth: 320 }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.headerTitleRow}>
              <Info size={15} color="#3B82F6" />
              <Text style={styles.sectionTitle}>TRACKSIDE TORQUE SPEC REFERENCE</Text>
            </View>
            <Text style={styles.oemSpecTag}>HONDA FACTORY SERVICE MANUAL</Text>
          </View>

          <View style={styles.torqueTable}>
            {FK8_TORQUE_SPECS.map((spec, i) => (
              <View key={i} style={styles.torqueRow}>
                <View style={styles.torqueLeft}>
                  <Text style={styles.torqueItem}>{spec.item}</Text>
                  <Text style={styles.torqueSocket}>{spec.socket}</Text>
                </View>
                <View style={styles.torqueRight}>
                  <Text style={styles.torqueSpec}>{spec.spec}</Text>
                </View>
              </View>
            ))}
          </View>
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
  introCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#090C10',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 12,
    flexWrap: 'wrap',
    gap: 8
  },
  introLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  introTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '800'
  },
  introSub: {
    color: '#94A3B8',
    fontSize: 10,
    fontFamily: 'monospace'
  },
  parkedStatusBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  parkedStatusText: {
    color: '#10B981',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '800'
  },
  sectionCard: {
    backgroundColor: '#090C10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '800',
    letterSpacing: 0.5
  },
  recordCountText: {
    color: '#64748B',
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  tripsList: {
    gap: 8
  },
  tripCard: {
    backgroundColor: '#0E131F',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    padding: 10
  },
  tripTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 6
  },
  tripMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  modeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  modeBadgeTrack: {
    backgroundColor: 'rgba(228, 5, 33, 0.2)',
    borderWidth: 1,
    borderColor: '#E40521'
  },
  modeBadgeDaily: {
    backgroundColor: 'rgba(0, 70, 173, 0.2)',
    borderWidth: 1,
    borderColor: '#0046AD'
  },
  modeBadgeText: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '800'
  },
  modeBadgeTextTrack: {
    color: '#F87171'
  },
  modeBadgeTextDaily: {
    color: '#60A5FA'
  },
  tripDateText: {
    color: '#94A3B8',
    fontSize: 10,
    fontFamily: 'monospace'
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0046AD',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  exportBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  tripMetricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    paddingTop: 6,
    flexWrap: 'wrap',
    gap: 8
  },
  tripMetricCol: {
    alignItems: 'flex-start'
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 8,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  metricVal: {
    color: '#F8FAFC',
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '800',
    marginTop: 1
  },
  csvPreviewBox: {
    marginTop: 10,
    backgroundColor: '#05070A',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: 8,
    padding: 10
  },
  csvPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  csvPreviewTitle: {
    color: '#38BDF8',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '800'
  },
  csvCloseText: {
    color: '#E40521',
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  csvScroll: {
    maxHeight: 120
  },
  csvCodeText: {
    color: '#94A3B8',
    fontSize: 9,
    fontFamily: 'monospace',
    lineHeight: 14
  },
  dtcActionButtons: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap'
  },
  dtcSimulateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  dtcSimulateText: {
    color: '#CBD5E1',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  dtcScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0046AD',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  dtcScanBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '800'
  },
  dtcClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E40521',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  dtcClearBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '800'
  },
  noDtcBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 8,
    paddingVertical: 18,
    gap: 4
  },
  noDtcTitle: {
    color: '#10B981',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '800'
  },
  noDtcSub: {
    color: '#64748B',
    fontSize: 9,
    fontFamily: 'monospace'
  },
  dtcList: {
    gap: 6
  },
  dtcCard: {
    backgroundColor: 'rgba(228, 5, 33, 0.1)',
    borderWidth: 1,
    borderColor: '#E40521',
    borderRadius: 8,
    padding: 10
  },
  dtcCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  dtcBadge: {
    backgroundColor: '#E40521',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  dtcCodeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '900'
  },
  dtcEcuText: {
    color: '#CBD5E1',
    fontSize: 10,
    fontFamily: 'monospace'
  },
  dtcTimeText: {
    color: '#94A3B8',
    fontSize: 9,
    fontFamily: 'monospace',
    marginLeft: 'auto'
  },
  dtcDescText: {
    color: '#F8FAFC',
    fontSize: 10,
    fontFamily: 'monospace',
    lineHeight: 14
  },
  maintenanceAndTorqueRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  odoText: {
    color: '#64748B',
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  maintList: {
    gap: 8
  },
  maintCard: {
    backgroundColor: '#0E131F',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 10
  },
  maintCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6
  },
  maintName: {
    color: '#F8FAFC',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '800'
  },
  maintCategory: {
    color: '#64748B',
    fontSize: 8,
    fontFamily: 'monospace'
  },
  maintResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3
  },
  maintResetText: {
    color: '#10B981',
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  maintBarTrack: {
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4
  },
  maintBarFill: {
    height: '100%',
    borderRadius: 3
  },
  maintFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  maintLastDone: {
    color: '#64748B',
    fontSize: 8,
    fontFamily: 'monospace'
  },
  maintRemaining: {
    color: '#10B981',
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  oemSpecTag: {
    color: '#64748B',
    fontSize: 8,
    fontFamily: 'monospace'
  },
  torqueTable: {
    gap: 6
  },
  torqueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0E131F',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    padding: 8
  },
  torqueLeft: {
    flex: 1
  },
  torqueItem: {
    color: '#F8FAFC',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  torqueSocket: {
    color: '#64748B',
    fontSize: 8,
    fontFamily: 'monospace',
    marginTop: 1
  },
  torqueRight: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  torqueSpec: {
    color: '#38BDF8',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '800'
  }
});
