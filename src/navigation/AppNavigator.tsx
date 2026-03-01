// ═══════════════════════════════════════════════════
// SHADOW SYSTEM — Navigation
// Stack navigator + Bottom tab navigator
// ═══════════════════════════════════════════════════

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { COLORS, FONTS } from '../constants/theme';
import { useShadowStore } from '../store/useShadowStore';

// Screens
import OnboardingScreen from '../screens/OnboardingScreen';
import DashboardScreen from '../screens/DashboardScreen';
import QuestListScreen from '../screens/QuestListScreen';
import QuestDetailScreen from '../screens/QuestDetailScreen';
import FocusModeScreen from '../screens/FocusModeScreen';
import RescueModeScreen from '../screens/RescueModeScreen';
import { BrainDumpScreen } from '../screens/BrainDumpScreen';
import { SkillTreeScreen } from '../screens/SkillTreeScreen';
import { RewardsScreen } from '../screens/RewardsScreen';
import { InsightsScreen, SettingsScreen } from '../screens/InsightsSettingsScreens';
import BossFightScreen from '../screens/BossFightScreen';
import { CampaignScreen } from '../screens/CampaignScreen';
import { BattleLogScreen } from '../screens/BattleLogScreen';

import type { RootStackParamList, MainTabsParamList } from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabsParamList>();

// ─── Tab Bar Icon Component ───
function TabIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
  return (
    <View style={styles.tabIcon}>
      <Text style={[styles.tabEmoji, focused && styles.tabEmojiActive]}>{icon}</Text>
      <Text style={[styles.tabLabel, { color: focused ? COLORS.cyan : COLORS.textDim }]}>
        {label}
      </Text>
      {focused && <View style={styles.tabDot} />}
    </View>
  );
}

// ─── Bottom Tab Navigator ───
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="⚔️" label="Base" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Quests"
        component={QuestListScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="📜" label="Quests" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Focus"
        component={FocusModeScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="🎯" label="Focus" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Skills"
        component={SkillTreeScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="🌟" label="Skills" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Rewards"
        component={RewardsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="🧪" label="Rewards" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Root Stack Navigator ───
export default function AppNavigator() {
  const hasOnboarded = useShadowStore((s) => s.hasOnboarded);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.bg },
        animation: 'fade',
      }}
    >
      {!hasOnboarded ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen
            name="QuestDetail"
            component={QuestDetailScreen}
            options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
          />
          <Stack.Screen
            name="FocusMode"
            component={FocusModeScreen}
            options={{ animation: 'fade', gestureEnabled: false }}
          />
          <Stack.Screen
            name="RescueMode"
            component={RescueModeScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="BrainDump"
            component={BrainDumpScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="BossFight"
            component={BossFightScreen}
            options={{ animation: 'fade', gestureEnabled: false }}
          />
          <Stack.Screen
            name="CampaignDetail"
            component={CampaignScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Insights"
            component={InsightsScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="BattleLog"
            component={BattleLogScreen}
            options={{ animation: 'slide_from_right' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(5,5,7,0.96)',
    borderTopWidth: 1,
    borderTopColor: COLORS.glassBorder,
    height: 85,
    paddingTop: 8,
    paddingBottom: 24,
    position: 'absolute',
    elevation: 0,
  },
  tabIcon: {
    alignItems: 'center',
    gap: 3,
  },
  tabEmoji: {
    fontSize: 20,
    opacity: 0.5,
  },
  tabEmojiActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
  },
  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.cyan,
    shadowColor: COLORS.cyan,
    shadowOpacity: 0.8,
    shadowRadius: 4,
    marginTop: 1,
  },
});
