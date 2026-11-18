import React, { useEffect } from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar, Platform } from 'react-native';
import { useTelemetryStore } from './src/core/store/useTelemetryStore';
import { HeaderBar } from './src/components/HeaderBar';
import { DailyCockpitScreen } from './src/screens/DailyCockpitScreen';
import { TrackCockpitScreen } from './src/screens/TrackCockpitScreen';
import { GarageScreen } from './src/screens/GarageScreen';
import { SimulatorControlDrawer } from './src/components/devtools/SimulatorControlDrawer';

export default function App() {
  const init = useTelemetryStore((s) => s.init);
  const appMode = useTelemetryStore((s) => s.appMode);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#090C10" />
      <View style={styles.appContainer}>
        {/* Sleek Top Navigation Header */}
        <HeaderBar />

        {/* Dynamic Screen Viewport */}
        <View style={styles.screenContainer}>
          {appMode === 'daily' && <DailyCockpitScreen />}
          {appMode === 'track' && <TrackCockpitScreen />}
          {appMode === 'garage' && <GarageScreen />}
        </View>

        {/* Collapsible K20C1 Simulator & Hex CAN Sniffer Drawer */}
        <SimulatorControlDrawer />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#07080A'
  },
  appContainer: {
    flex: 1,
    backgroundColor: '#07080A',
    flexDirection: 'column',
    ...Platform.select({
      web: {
        height: '100%' as const,
        width: '100%' as const,
        overflow: 'hidden' as const
      }
    })
  },
  screenContainer: {
    flex: 1
  }
});
