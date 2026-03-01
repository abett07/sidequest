// ═══════════════════════════════════════════════════
// SHADOW SYSTEM — App Entry Point v1.2
//
// FIXES:
//  #1  Auth session hydration on startup
//  #3  scheduleDailyPlan uses named params object
//  #5  AppState callback uses store.getState() (no stale closure)
// ═══════════════════════════════════════════════════

import 'react-native-gesture-handler';
import React, { useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, AppState, type AppStateStatus } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import AppNavigator from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { useShadowStore } from './src/store/useShadowStore';
import { registerPushToken, scheduleDailyPlan } from './src/utils/notifications';
import { COLORS } from './src/constants/theme';

SplashScreen.preventAutoHideAsync();

const ShadowTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: COLORS.cyan,
    background: COLORS.bg,
    card: COLORS.bg,
    text: COLORS.text,
    border: COLORS.glassBorder,
    notification: COLORS.red,
  },
};

export default function App() {
  const [fontsLoaded, setFontsLoaded] = React.useState(false);

  useEffect(() => {
    async function loadResources() {
      try {
        // await Font.loadAsync({ ... });
        setFontsLoaded(true);
      } catch {
        setFontsLoaded(true);
      }
    }
    loadResources();
  }, []);

  // ── Startup: hydrate auth, refresh streak, sync, schedule ──
  useEffect(() => {
    async function startup() {
      // FIX #1: Hydrate auth session before anything else
      await useShadowStore.getState().hydrateSession();

      useShadowStore.getState().refreshStreakOnOpen();
      useShadowStore.getState().syncWithSupabase().catch(() => {});

      const uid = useShadowStore.getState().user.id;
      if (uid) registerPushToken(uid).catch(() => {});

      scheduleNotifications();
    }
    startup();

    // FIX #5: AppState callback reads fresh state via getState()
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, []);

  const onLayoutReady = useCallback(async () => {
    if (fontsLoaded) await SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.root} onLayout={onLayoutReady}>
        <StatusBar style="light" />
        <NavigationContainer theme={ShadowTheme}>
          <AppNavigator />
        </NavigationContainer>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

// FIX #5: Standalone functions read fresh state each call
function handleAppState(state: AppStateStatus) {
  if (state === 'active') {
    useShadowStore.getState().refreshStreakOnOpen();
    useShadowStore.getState().syncWithSupabase().catch(() => {});
    useShadowStore.getState().generateDailyLog(); // Phase 4: auto daily summary
    scheduleNotifications();
  }
}

// FIX #3 + #5: Named params, fresh state
function scheduleNotifications() {
  const { quests, user, streak } = useShadowStore.getState();
  scheduleDailyPlan({
    quests,
    reminderStyle: user.reminderStyle,
    streak,
  }).catch(() => {});
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
});
