import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { RotateCcw } from 'lucide-react-native';

interface GForceFrictionCircleProps {
  latG: number;
  lonG: number;
  peakLat: number;
  peakLon: number;
  onResetPeak?: () => void;
}

export const GForceFrictionCircle: React.FC<GForceFrictionCircleProps> = ({
  latG,
  lonG,
  peakLat,
  peakLon,
  onResetPeak
}) => {
  const size = 180;
  const center = size / 2;
  const maxG = 1.5;
  const radius = center - 18;

  // Scale G to pixels
  // Note: in automotive telemetry:
  // - Braking = negative lonG (pitches forward -> draw upward on friction circle)
  // - Acceleration = positive lonG (squats backward -> draw downward)
  // - Right turn = positive latG (pushes car right)
  const dotX = center + (latG / maxG) * radius;
  const dotY = center - (lonG / maxG) * radius;

  const currentTotalG = Math.sqrt(latG * latG + lonG * lonG);
  const peakTotalG = Math.sqrt(peakLat * peakLat + peakLon * peakLon);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>2D FRICTION CIRCLE (1.5G)</Text>
        <TouchableOpacity style={styles.peakBadge} onPress={onResetPeak}>
          <Text style={styles.peakLabel}>PEAK</Text>
          <Text style={styles.peakVal}>{peakTotalG.toFixed(2)}G</Text>
          <RotateCcw size={10} color="#94A3B8" style={{ marginLeft: 3 }} />
        </TouchableOpacity>
      </View>

      <View style={styles.svgWrapper}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Concentric Circles: 0.5G, 1.0G, 1.5G */}
          <Circle
            cx={center}
            cy={center}
            r={(0.5 / maxG) * radius}
            fill="none"
            stroke="#1E293B"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <Circle
            cx={center}
            cy={center}
            r={(1.0 / maxG) * radius}
            fill="none"
            stroke="#334155"
            strokeWidth={1}
          />
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#E40521"
            strokeWidth={1.5}
          />

          {/* Crosshairs */}
          <Line x1={center} y1={12} x2={center} y2={size - 12} stroke="#1E293B" strokeWidth={1} />
          <Line x1={12} y1={center} x2={size - 12} y2={center} stroke="#1E293B" strokeWidth={1} />

          {/* Labels */}
          <SvgText x={center} y={10} fontSize={8} fill="#64748B" textAnchor="middle" fontFamily="monospace">
            BRAKE
          </SvgText>
          <SvgText x={center} y={size - 2} fontSize={8} fill="#64748B" textAnchor="middle" fontFamily="monospace">
            ACCEL
          </SvgText>
          <SvgText x={8} y={center + 3} fontSize={8} fill="#64748B" textAnchor="start" fontFamily="monospace">
            L
          </SvgText>
          <SvgText x={size - 8} y={center + 3} fontSize={8} fill="#64748B" textAnchor="end" fontFamily="monospace">
            R
          </SvgText>

          {/* Active G Dot Trail / Vector */}
          <Line
            x1={center}
            y1={center}
            x2={dotX}
            y2={dotY}
            stroke="rgba(228, 5, 33, 0.4)"
            strokeWidth={2}
          />

          {/* Active G Dot */}
          <Circle
            cx={dotX}
            cy={dotY}
            r={5}
            fill="#E40521"
            stroke="#FFFFFF"
            strokeWidth={1.5}
          />
        </Svg>
      </View>

      <View style={styles.footerRow}>
        <View style={styles.metricCol}>
          <Text style={styles.metricLabel}>LATERAL</Text>
          <Text style={styles.metricVal}>
            {latG >= 0 ? `+${latG.toFixed(2)}` : latG.toFixed(2)}G
          </Text>
        </View>
        <View style={styles.metricCol}>
          <Text style={styles.metricLabel}>TOTAL G</Text>
          <Text style={[styles.metricVal, { color: '#E40521' }]}>{currentTotalG.toFixed(2)}G</Text>
        </View>
        <View style={styles.metricCol}>
          <Text style={styles.metricLabel}>LONGITUDINAL</Text>
          <Text style={styles.metricVal}>
            {lonG >= 0 ? `+${lonG.toFixed(2)}` : lonG.toFixed(2)}G
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#090C10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
    alignItems: 'center'
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  title: {
    color: '#64748B',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700',
    letterSpacing: 0.5
  },
  peakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(228, 5, 33, 0.12)',
    borderColor: 'rgba(228, 5, 33, 0.4)',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  peakLabel: {
    color: '#E40521',
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '800',
    marginRight: 4
  },
  peakVal: {
    color: '#F8FAFC',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  svgWrapper: {
    marginVertical: 4
  },
  footerRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 6
  },
  metricCol: {
    alignItems: 'center'
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 8,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  metricVal: {
    color: '#F8FAFC',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '800'
  }
});
