import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';

interface SequentialShiftStripProps {
  rpm: number;
  maxRpm?: number;
}

export const SequentialShiftStrip: React.FC<SequentialShiftStripProps> = ({
  rpm,
  maxRpm = 7000
}) => {
  const [flashState, setFlashState] = useState<boolean>(false);

  // K20C1 Shift Point is 6,800–7,000 RPM
  const isFlashing = rpm >= 6800;

  useEffect(() => {
    if (!isFlashing) {
      setFlashState(false);
      return;
    }
    const interval = setInterval(() => {
      setFlashState((prev) => !prev);
    }, 65); // High-frequency ~15Hz warning strobe

    return () => clearInterval(interval);
  }, [isFlashing]);

  // 15 LED segments:
  // Wake: 4,800 RPM
  // LEDs 1-5: Green (4,800 - 5,799 RPM)
  // LEDs 6-10: Amber (5,800 - 6,399 RPM)
  // LEDs 11-15: Red (6,400 - 6,799 RPM)
  // Flashing: >= 6,800 RPM (Red / Blue alternating strobe)
  const leds = Array.from({ length: 15 }, (_, i) => {
    const segmentRpm = 4800 + i * ((6800 - 4800) / 15);
    const isLit = rpm >= segmentRpm;

    let color = '#27272a'; // Off state
    let glow = 'none';

    if (isFlashing) {
      // Rapid Red / Blue shift strobe
      color = flashState ? '#E40521' : '#0046AD';
      glow = flashState ? '0 0 12px #E40521' : '0 0 12px #3B82F6';
    } else if (isLit) {
      if (i < 5) {
        color = '#10B981'; // Green
        glow = '0 0 8px #10B981';
      } else if (i < 10) {
        color = '#F59E0B'; // Amber
        glow = '0 0 8px #F59E0B';
      } else {
        color = '#E40521'; // Type R Red
        glow = '0 0 10px #E40521';
      }
    }

    return { id: i, isLit, color, glow };
  });

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.tagText}>K20C1 SEQUENTIAL TACHOMETER</Text>
        <Text style={[styles.rpmText, isFlashing && styles.rpmTextFlashing]}>
          {Math.round(rpm)} <Text style={styles.rpmUnit}>RPM</Text>
        </Text>
        <Text style={styles.limitText}>7,000 REDLINE</Text>
      </View>
      <View style={styles.stripTrack}>
        {leds.map((led) => (
          <View
            key={led.id}
            style={[
              styles.ledSegment,
              {
                backgroundColor: led.color,
                // @ts-ignore Web boxShadow
                boxShadow: led.glow
              }
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#090C10',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6
  },
  tagText: {
    color: '#64748B',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700',
    letterSpacing: 0.5
  },
  rpmText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: '800'
  },
  rpmTextFlashing: {
    color: '#E40521'
  },
  rpmUnit: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500'
  },
  limitText: {
    color: '#E40521',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  stripTrack: {
    flexDirection: 'row',
    height: 12,
    gap: 4,
    width: '100%',
    backgroundColor: '#18181B',
    borderRadius: 4,
    padding: 2
  },
  ledSegment: {
    flex: 1,
    borderRadius: 2
  }
});
