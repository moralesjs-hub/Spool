import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTelemetryStore } from '../core/store/useTelemetryStore';
import { AppMode } from '../types/telemetry';
import { Lock, Unlock, Zap, Activity, ShieldCheck, Flag, Wrench, Gauge } from 'lucide-react-native';

export const HeaderBar: React.FC = () => {
  const appMode = useTelemetryStore((s) => s.appMode);
  const setAppMode = useTelemetryStore((s) => s.setAppMode);
  const sessionStatus = useTelemetryStore((s) => s.sessionStatus);
  const motionLocked = useTelemetryStore((s) => s.motionLocked);
  const devOverrideMotionLock = useTelemetryStore((s) => s.devOverrideMotionLock);
  const toggleDevOverrideMotionLock = useTelemetryStore((s) => s.toggleDevOverrideMotionLock);
  const currentSpeed = useTelemetryStore((s) => s.currentFrame.speedMph);

  // Keyboard shortcut listener: Shift + Space toggles between 'daily' and 'track' modes
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.code === 'Space') {
        e.preventDefault();
        setAppMode(appMode === 'track' ? 'daily' : 'track');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appMode, setAppMode]);

  const quickToggleMode = () => {
    setAppMode(appMode === 'track' ? 'daily' : 'track');
  };

  return (
    <View style={styles.header}>
      {/* Left: FK8 Badge & Auto-Wake Session Pill */}
      <View style={styles.leftGroup}>
        <View style={styles.brandBadge}>
          <Text style={styles.brandTitle}>FK8 TYPE R</Text>
          <Text style={styles.paintCode}>AEGEAN BLUE [B-593M]</Text>
        </View>

        {/* Auto-Wake Status Pill */}
        <View
          style={[
            styles.sessionPill,
            sessionStatus.includes('ACTIVE') ? styles.sessionPillActive : styles.sessionPillIdle
          ]}
        >
          <View
            style={[
              styles.pulsingDot,
              sessionStatus.includes('ACTIVE') ? styles.pulsingDotActive : styles.pulsingDotIdle
            ]}
          />
          <Text style={styles.sessionPillText}>
            {sessionStatus.includes('ACTIVE') ? 'AUTO-LOGGING (RPM > 500)' : 'PARKED / IDLE'}
          </Text>
        </View>
      </View>

      {/* Center: 3-Screen Switcher Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, appMode === 'daily' && styles.tabButtonActiveDaily]}
          onPress={() => setAppMode('daily')}
        >
          <Gauge size={14} color={appMode === 'daily' ? '#3B82F6' : '#94A3B8'} style={{ marginRight: 6 }} />
          <Text style={[styles.tabText, appMode === 'daily' && styles.tabTextActiveDaily]}>
            DAILY COMMUTE
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, appMode === 'track' && styles.tabButtonActiveTrack]}
          onPress={() => setAppMode('track')}
        >
          <Flag size={14} color={appMode === 'track' ? '#E40521' : '#94A3B8'} style={{ marginRight: 6 }} />
          <Text style={[styles.tabText, appMode === 'track' && styles.tabTextActiveTrack]}>
            +R TRACK MODE
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            appMode === 'garage' && styles.tabButtonActiveGarage,
            motionLocked && styles.tabButtonDisabled
          ]}
          onPress={() => {
            if (!motionLocked || devOverrideMotionLock) {
              setAppMode('garage');
            }
          }}
        >
          <Wrench
            size={14}
            color={motionLocked ? '#64748B' : appMode === 'garage' ? '#10B981' : '#94A3B8'}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.tabText,
              appMode === 'garage' && styles.tabTextActiveGarage,
              motionLocked && styles.tabTextDisabled
            ]}
          >
            THE GARAGE
          </Text>
        </TouchableOpacity>
      </View>

      {/* Right: Quick Toggle Hotkey Pill & Motion Lock Indicator */}
      <View style={styles.rightGroup}>
        {/* Hotkey Quick Toggle Button */}
        <TouchableOpacity style={styles.quickToggleBtn} onPress={quickToggleMode}>
          <Zap size={12} color="#F59E0B" style={{ marginRight: 4 }} />
          <Text style={styles.quickToggleText}>
            {appMode === 'track' ? 'SWITCH DAILY' : 'SWITCH +R'}
          </Text>
          <Text style={styles.hotkeyTag}>[SHIFT+SPACE]</Text>
        </TouchableOpacity>

        {/* Motion Lockout Badge (> 5 MPH) */}
        <TouchableOpacity
          style={[
            styles.motionBadge,
            motionLocked ? styles.motionBadgeLocked : styles.motionBadgeUnlocked
          ]}
          onPress={toggleDevOverrideMotionLock}
        >
          {motionLocked ? (
            <>
              <Lock size={12} color="#E40521" style={{ marginRight: 4 }} />
              <Text style={styles.motionBadgeTextLocked}>
                &gt;5 MPH LOCK ({currentSpeed.toFixed(0)} MPH)
              </Text>
              <Text style={styles.devOverrideTag}>[OVERRIDE]</Text>
            </>
          ) : (
            <>
              <Unlock size={12} color="#10B981" style={{ marginRight: 4 }} />
              <Text style={styles.motionBadgeTextUnlocked}>
                {devOverrideMotionLock ? 'DEV UNLOCKED' : 'PARKED UNLOCKED'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    width: '100%',
    backgroundColor: '#090C10',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  brandBadge: {
    flexDirection: 'column'
  },
  brandTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: '900',
    letterSpacing: 0.5
  },
  paintCode: {
    color: '#3B82F6',
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  sessionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1
  },
  sessionPillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.4)'
  },
  sessionPillIdle: {
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
    borderColor: 'rgba(100, 116, 139, 0.3)'
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6
  },
  pulsingDotActive: {
    backgroundColor: '#10B981'
  },
  pulsingDotIdle: {
    backgroundColor: '#64748B'
  },
  sessionPillText: {
    color: '#CBD5E1',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#111622',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 3,
    gap: 4
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  tabButtonActiveDaily: {
    backgroundColor: 'rgba(0, 70, 173, 0.35)',
    borderWidth: 1,
    borderColor: '#0046AD'
  },
  tabButtonActiveTrack: {
    backgroundColor: 'rgba(228, 5, 33, 0.25)',
    borderWidth: 1,
    borderColor: '#E40521'
  },
  tabButtonActiveGarage: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1,
    borderColor: '#10B981'
  },
  tabButtonDisabled: {
    opacity: 0.45
  },
  tabText: {
    color: '#94A3B8',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  tabTextActiveDaily: {
    color: '#60A5FA'
  },
  tabTextActiveTrack: {
    color: '#F87171'
  },
  tabTextActiveGarage: {
    color: '#34D399'
  },
  tabTextDisabled: {
    color: '#475569'
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  quickToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161E2E',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  quickToggleText: {
    color: '#FCD34D',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  hotkeyTag: {
    color: '#94A3B8',
    fontSize: 8,
    fontFamily: 'monospace',
    marginLeft: 4
  },
  motionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1
  },
  motionBadgeLocked: {
    backgroundColor: 'rgba(228, 5, 33, 0.12)',
    borderColor: 'rgba(228, 5, 33, 0.4)'
  },
  motionBadgeUnlocked: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  motionBadgeTextLocked: {
    color: '#F87171',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  motionBadgeTextUnlocked: {
    color: '#34D399',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  devOverrideTag: {
    color: '#94A3B8',
    fontSize: 8,
    fontFamily: 'monospace',
    marginLeft: 4
  }
});
