import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { RotateCcw } from 'lucide-react-native';

interface RadialBoostGaugeProps {
  boostPsi: number;
  peakBoostPsi: number;
  throttlePct: number;
  onResetPeak?: () => void;
}

export const RadialBoostGauge: React.FC<RadialBoostGaugeProps> = ({
  boostPsi,
  peakBoostPsi,
  throttlePct,
  onResetPeak
}) => {
  // Gauge range: -14.7 PSI (-30 inHg) to +25.0 PSI boost
  const minVal = -14.7;
  const maxVal = 25.0;
  const totalRange = maxVal - minVal;

  // Arc angles: 240 degree sweep from -210 deg (bottom left) to 30 deg (bottom right)
  const startAngle = 150; // In standard polar coords
  const sweepAngle = 240;

  // Normalize current boost to [0, 1]
  const clampedBoost = Math.max(minVal, Math.min(maxVal, boostPsi));
  const normalizedVal = (clampedBoost - minVal) / totalRange;
  const currentAngleDeg = startAngle + normalizedVal * sweepAngle;

  // Center & Radius
  const cx = 110;
  const cy = 110;
  const r = 85;

  // Polar to Cartesian conversion helper
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians)
    };
  };

  const describeArc = (x: number, y: number, radius: number, startA: number, endA: number) => {
    const start = polarToCartesian(x, y, radius, endA);
    const end = polarToCartesian(x, y, radius, startA);
    const largeArcFlag = endA - startA <= 180 ? '0' : '1';
    return ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(' ');
  };

  const backgroundArc = describeArc(cx, cy, r, 150, 390);
  const activeArc = describeArc(cx, cy, r, 150, Math.max(151, currentAngleDeg));

  // Needle tip
  const needleTip = polarToCartesian(cx, cy, r - 8, currentAngleDeg);
  const needleBaseLeft = polarToCartesian(cx, cy, 14, currentAngleDeg + 90);
  const needleBaseRight = polarToCartesian(cx, cy, 14, currentAngleDeg - 90);

  // Peak angle marker
  const peakNorm = (Math.max(0, Math.min(maxVal, peakBoostPsi)) - minVal) / totalRange;
  const peakAngle = 150 + peakNorm * sweepAngle;
  const peakMarkerStart = polarToCartesian(cx, cy, r - 12, peakAngle);
  const peakMarkerEnd = polarToCartesian(cx, cy, r + 6, peakAngle);

  // Dynamic color
  const isHighBoost = boostPsi > 18.0;
  const needleColor = isHighBoost ? '#E40521' : boostPsi >= 0 ? '#38BDF8' : '#0EA5E9';

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>K20C1 MANIFOLD PRESSURE</Text>
        <TouchableOpacity style={styles.peakBadge} onPress={onResetPeak}>
          <Text style={styles.peakLabel}>PEAK</Text>
          <Text style={styles.peakValue}>+{peakBoostPsi.toFixed(1)} PSI</Text>
          <RotateCcw size={10} color="#94A3B8" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>

      <View style={styles.gaugeWrapper}>
        <Svg width={220} height={200} viewBox="0 0 220 200">
          <Defs>
            <LinearGradient id="boostGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#0EA5E9" />
              <Stop offset="50%" stopColor="#38BDF8" />
              <Stop offset="80%" stopColor="#F59E0B" />
              <Stop offset="100%" stopColor="#E40521" />
            </LinearGradient>
          </Defs>

          {/* Background Arc */}
          <Path d={backgroundArc} fill="none" stroke="#1E293B" strokeWidth={10} strokeLinecap="round" />

          {/* Active Boost Arc */}
          <Path
            d={activeArc}
            fill="none"
            stroke="url(#boostGradient)"
            strokeWidth={10}
            strokeLinecap="round"
          />

          {/* Major Tick Marks: -10, 0, 10, 20, 25 */}
          {[-14.7, 0, 10, 20, 25].map((val) => {
            const angle = 150 + ((val - minVal) / totalRange) * sweepAngle;
            const p1 = polarToCartesian(cx, cy, r - 14, angle);
            const p2 = polarToCartesian(cx, cy, r - 2, angle);
            const labelPos = polarToCartesian(cx, cy, r - 24, angle);
            const label = val === -14.7 ? 'VAC' : `${val}`;
            return (
              <React.Fragment key={val}>
                <Line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={val >= 20 ? '#E40521' : '#64748B'}
                  strokeWidth={2}
                />
                <SvgText
                  x={labelPos.x}
                  y={labelPos.y + 3}
                  fontSize={8}
                  fill="#94A3B8"
                  textAnchor="middle"
                  fontFamily="monospace"
                  fontWeight="600"
                >
                  {label}
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* Peak Boost Hold Marker */}
          {peakBoostPsi > 0 && (
            <Line
              x1={peakMarkerStart.x}
              y1={peakMarkerStart.y}
              x2={peakMarkerEnd.x}
              y2={peakMarkerEnd.y}
              stroke="#E40521"
              strokeWidth={3}
            />
          )}

          {/* Needle Triangle */}
          <Path
            d={`M ${needleTip.x} ${needleTip.y} L ${needleBaseLeft.x} ${needleBaseLeft.y} L ${needleBaseRight.x} ${needleBaseRight.y} Z`}
            fill={needleColor}
          />
          <Circle cx={cx} cy={cy} r={6} fill="#090C10" stroke={needleColor} strokeWidth={2.5} />
        </Svg>

        {/* Center Digital Readout */}
        <View style={styles.digitalReadout}>
          <Text style={[styles.mainPsiValue, isHighBoost && styles.highBoostValue]}>
            {boostPsi >= 0 ? `+${boostPsi.toFixed(1)}` : boostPsi.toFixed(1)}
          </Text>
          <Text style={styles.mainPsiUnit}>PSI {boostPsi < 0 ? '(VACUUM)' : '(BOOST)'}</Text>
        </View>
      </View>

      {/* Throttle Position Sub-Bar */}
      <View style={styles.tpsContainer}>
        <View style={styles.tpsHeader}>
          <Text style={styles.tpsLabel}>THROTTLE POSITION (TPS)</Text>
          <Text style={styles.tpsValue}>{Math.round(throttlePct)}%</Text>
        </View>
        <View style={styles.tpsTrack}>
          <View
            style={[
              styles.tpsFill,
              { width: `${Math.min(100, Math.max(0, throttlePct))}%` },
              throttlePct > 80 && { backgroundColor: '#E40521' }
            ]}
          />
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
  peakValue: {
    color: '#F8FAFC',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  gaugeWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center'
  },
  digitalReadout: {
    position: 'absolute',
    bottom: 22,
    alignItems: 'center'
  },
  mainPsiValue: {
    color: '#F8FAFC',
    fontSize: 26,
    fontFamily: 'monospace',
    fontWeight: '800'
  },
  highBoostValue: {
    color: '#E40521'
  },
  mainPsiUnit: {
    color: '#94A3B8',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '600'
  },
  tpsContainer: {
    width: '100%',
    marginTop: 6
  },
  tpsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3
  },
  tpsLabel: {
    color: '#64748B',
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  tpsValue: {
    color: '#38BDF8',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  tpsTrack: {
    height: 6,
    backgroundColor: '#18181B',
    borderRadius: 3,
    overflow: 'hidden'
  },
  tpsFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3
  }
});
