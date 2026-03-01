// ═══════════════════════════════════════════════════
// INSIGHTS + SETTINGS — Phase 3 Rewrite
// Insights: real data from analytics engine
// Settings: interactive Switch/Picker controls
// ═══════════════════════════════════════════════════

import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, Switch, StyleSheet, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { GlassPanel } from '../components/GlassPanel';
import { XPBar } from '../components/UIKit';
import { COLORS, SPACING, FONTS, RADIUS } from '../constants/theme';
import { useShadowStore } from '../store/useShadowStore';
import {
  computeAllInsights, computeWeeklyFocusChart, generateAIAdvice,
} from '../utils/analytics';
import type { UserProfile } from '../types';

// ═══════════════════════════════════════════════════
// INSIGHTS SCREEN
// ═══════════════════════════════════════════════════

export function InsightsScreen() {
  const nav = useNavigation<any>();
  const focusHistory = useShadowStore((s) => s.focusHistory);
  const quests = useShadowStore((s) => s.quests);
  const checkins = useShadowStore((s) => s.checkins);

  const colors = { cyan: COLORS.cyan, red: COLORS.red, green: COLORS.green, gold: COLORS.gold, purple: COLORS.purple };

  const insights = useMemo(
    () => computeAllInsights(focusHistory, quests, checkins, colors),
    [focusHistory.length, quests.length, checkins.length]
  );

  const weekChart = useMemo(
    () => computeWeeklyFocusChart(focusHistory),
    [focusHistory.length]
  );

  const advice = useMemo(
    () => generateAIAdvice(focusHistory, quests, checkins),
    [focusHistory.length, quests.length, checkins.length]
  );

  const maxMinutes = Math.max(...weekChart.map((d) => d.minutes), 1);

  return (
    <View style={st.screen}>
      {/* Header */}
      <View style={st.header}>
        <Pressable onPress={() => nav.goBack()} style={st.backBtn}>
          <Text style={{ color: COLORS.text, fontSize: 16 }}>‹</Text>
        </Pressable>
        <Text style={[FONTS.displaySmall, { color: COLORS.text, fontSize: 16 }]}>INTEL REPORT</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        {/* Insight Cards */}
        {insights.map((ins, i) => (
          <Animated.View key={i} entering={FadeInDown.delay(i * 60).duration(300)}>
            <GlassPanel style={st.insightCard} padding={16}>
              <View style={st.insightRow}>
                <View style={[st.insightIcon, { backgroundColor: `${ins.color}15`, borderColor: `${ins.color}33` }]}>
                  <Text style={{ fontSize: 22 }}>{ins.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[FONTS.bodySmall, { color: COLORS.textSecondary, fontSize: 12 }]}>{ins.label}</Text>
                  <Text style={[FONTS.bodyLarge, { color: ins.color, fontWeight: '700' }]}>{ins.value}</Text>
                  {ins.detail ? (
                    <Text style={[FONTS.bodySmall, { color: COLORS.textDim, fontSize: 11, marginTop: 2 }]}>{ins.detail}</Text>
                  ) : null}
                </View>
              </View>
            </GlassPanel>
          </Animated.View>
        ))}

        {/* AI Advice Cards */}
        {advice.map((a, i) => (
          <Animated.View key={`adv_${i}`} entering={FadeInDown.delay(400 + i * 80).duration(400)}>
            <GlassPanel glow glowColor={COLORS.cyan} style={{ marginBottom: SPACING.sm }}>
              <Text style={[FONTS.label, { color: COLORS.cyan, marginBottom: 8 }]}>
                {a.title.toUpperCase()}
              </Text>
              <Text style={[FONTS.body, { color: COLORS.text, lineHeight: 22 }]}>
                {a.body}
              </Text>
            </GlassPanel>
          </Animated.View>
        ))}

        {/* Weekly Focus Chart */}
        <Animated.View entering={FadeInDown.delay(600).duration(400)}>
          <GlassPanel style={{ marginTop: SPACING.sm }}>
            <Text style={[FONTS.label, { color: COLORS.text, marginBottom: 12 }]}>FOCUS HOURS (WEEK)</Text>
            {weekChart.map((x) => (
              <View key={x.day} style={st.chartRow}>
                <Text style={[FONTS.bodySmall, { color: COLORS.textSecondary, width: 30 }]}>{x.day}</Text>
                <View style={st.chartTrack}>
                  <Animated.View
                    entering={FadeInDown.duration(500)}
                    style={[st.chartBar, { width: `${Math.max((x.minutes / maxMinutes) * 100, 2)}%` }]}
                  />
                </View>
                <Text style={[FONTS.bodySmall, { color: COLORS.textSecondary, width: 40, textAlign: 'right' }]}>
                  {x.minutes}m
                </Text>
              </View>
            ))}
            <Text style={[FONTS.bodySmall, { color: COLORS.textDim, marginTop: 8, fontSize: 11 }]}>
              {focusHistory.length} total sessions tracked
            </Text>
          </GlassPanel>
        </Animated.View>

        {/* Session Stats Summary */}
        <Animated.View entering={FadeInDown.delay(700).duration(400)}>
          <GlassPanel style={{ marginTop: SPACING.sm }}>
            <Text style={[FONTS.label, { color: COLORS.text, marginBottom: 12 }]}>SESSION BREAKDOWN</Text>
            <View style={st.statGrid}>
              <StatBox label="Total Sessions" value={String(focusHistory.length)} color={COLORS.cyan} />
              <StatBox
                label="Completed"
                value={String(focusHistory.filter((s) => s.completed).length)}
                color={COLORS.green}
              />
              <StatBox
                label="Avg Quality"
                value={focusHistory.length > 0
                  ? `${Math.round(focusHistory.reduce((s, f) => s + (f.qualityScore || 0), 0) / focusHistory.length)}/5`
                  : '—'}
                color={COLORS.gold}
              />
              <StatBox
                label="Distractions"
                value={String(focusHistory.reduce((s, f) => s + (f.distractionCount || 0), 0))}
                color={COLORS.red}
              />
            </View>
          </GlassPanel>
        </Animated.View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={st.statBox}>
      <Text style={[FONTS.displaySmall, { color, fontSize: 22 }]}>{value}</Text>
      <Text style={[FONTS.bodySmall, { color: COLORS.textSecondary, fontSize: 10, textAlign: 'center' }]}>{label}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════
// SETTINGS SCREEN — Interactive controls
// ═══════════════════════════════════════════════════

const THEME_OPTIONS = ['hunter', 'system', 'minimal'] as const;
const REMINDER_OPTIONS = ['gentle', 'direct', 'intense'] as const;
const AI_TONE_OPTIONS = ['commander', 'mentor', 'calm', 'hype'] as const;
const PLAY_STYLE_OPTIONS = ['calm', 'balanced', 'intense'] as const;
const TIME_BLIND_OPTIONS = ['low', 'medium', 'high'] as const;

export function SettingsScreen() {
  const nav = useNavigation<any>();
  const user = useShadowStore((s) => s.user);
  const stats = useShadowStore((s) => s.stats);
  const prefs = useShadowStore((s) => s.preferences);
  const updateUser = useShadowStore((s) => s.updateUser);
  const updatePreferences = useShadowStore((s) => s.updatePreferences);
  const signOut = useShadowStore((s) => s.signOut);

  const statBars = [
    { label: 'Focus',      value: stats.focusStat,      color: COLORS.gold },
    { label: 'Discipline', value: stats.disciplineStat,  color: COLORS.cyan },
    { label: 'Energy',     value: stats.energyStat,      color: COLORS.green },
    { label: 'Recovery',   value: stats.recoveryStat,    color: COLORS.purple },
    { label: 'Clarity',    value: stats.clarityStat,     color: COLORS.cyan },
    { label: 'Courage',    value: stats.courageStat,     color: COLORS.red },
  ];

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Your local data will be preserved. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <View style={st.screen}>
      <View style={st.header}>
        <Pressable onPress={() => nav.goBack()} style={st.backBtn}>
          <Text style={{ color: COLORS.text, fontSize: 16 }}>‹</Text>
        </Pressable>
        <Text style={[FONTS.displaySmall, { color: COLORS.text, fontSize: 16 }]}>SETTINGS</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <GlassPanel style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={st.profileAvatar}><Text style={{ fontSize: 36 }}>🗡️</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={[FONTS.displaySmall, { color: COLORS.text, fontSize: 20 }]}>{user.characterName}</Text>
              <Text style={[FONTS.bodySmall, { color: COLORS.gold }]}>{user.rank}-Rank · Lv.{user.level}</Text>
              <Text style={[FONTS.bodySmall, { color: COLORS.textSecondary, fontSize: 12 }]}>
                {user.xpTotal.toLocaleString()} XP · {user.coins} coins · {user.statPoints} stat pts
              </Text>
            </View>
          </View>
        </GlassPanel>

        {/* Core Stats */}
        <Text style={[FONTS.label, { color: COLORS.text, marginBottom: 10 }]}>CORE STATS</Text>
        <GlassPanel style={{ marginBottom: 20 }}>
          {statBars.map((s) => (
            <View key={s.label} style={{ marginBottom: 10 }}>
              <XPBar current={s.value} max={100} color={s.color} height={6} label={s.label} />
            </View>
          ))}
        </GlassPanel>

        {/* Theme */}
        <Text style={[FONTS.label, { color: COLORS.text, marginBottom: 10 }]}>APPEARANCE</Text>
        <OptionPicker
          label="Theme Mode"
          icon="🎨"
          options={THEME_OPTIONS as unknown as string[]}
          value={user.themeMode}
          onChange={(v) => updateUser({ themeMode: v as UserProfile['themeMode'] })}
        />
        <OptionPicker
          label="Play Style"
          icon="⚔️"
          options={PLAY_STYLE_OPTIONS as unknown as string[]}
          value={user.playStyle}
          onChange={(v) => updateUser({ playStyle: v as UserProfile['playStyle'] })}
        />

        {/* Notifications */}
        <Text style={[FONTS.label, { color: COLORS.text, marginTop: 16, marginBottom: 10 }]}>NOTIFICATIONS</Text>
        <OptionPicker
          label="Reminder Style"
          icon="🔔"
          options={REMINDER_OPTIONS as unknown as string[]}
          value={user.reminderStyle}
          onChange={(v) => updateUser({ reminderStyle: v as UserProfile['reminderStyle'] })}
        />
        <OptionPicker
          label="AI Tone"
          icon="🤖"
          options={AI_TONE_OPTIONS as unknown as string[]}
          value={prefs.aiTone}
          onChange={(v) => updatePreferences({ aiTone: v as any })}
        />

        {/* Toggles */}
        <Text style={[FONTS.label, { color: COLORS.text, marginTop: 16, marginBottom: 10 }]}>SYSTEM CONTROLS</Text>
        <SettingToggle
          label="Sound Effects" icon="🔊"
          value={!prefs.muteSounds}
          onChange={(v) => updatePreferences({ muteSounds: !v })}
        />
        <SettingToggle
          label="Haptic Feedback" icon="📳"
          value={!prefs.muteHaptics}
          onChange={(v) => updatePreferences({ muteHaptics: !v })}
        />
        <SettingToggle
          label="Low Stimulation Mode" icon="🌙"
          value={prefs.lowClutterMode}
          onChange={(v) => updatePreferences({ lowClutterMode: v })}
        />
        <SettingToggle
          label="Reduce Motion" icon="♿"
          value={prefs.reduceMotion}
          onChange={(v) => updatePreferences({ reduceMotion: v })}
        />

        {/* ADHD-Specific */}
        <Text style={[FONTS.label, { color: COLORS.text, marginTop: 16, marginBottom: 10 }]}>ADHD-SPECIFIC</Text>
        <OptionPicker
          label="Time Blindness Level"
          icon="⏰"
          options={TIME_BLIND_OPTIONS as unknown as string[]}
          value={prefs.timeBlindnessLevel}
          onChange={(v) => updatePreferences({ timeBlindnessLevel: v as any })}
        />
        <SettingSlider
          label="Overwhelm Sensitivity"
          icon="⚡"
          value={prefs.overwhelmSensitivity}
          onChange={(v) => updatePreferences({ overwhelmSensitivity: v })}
        />
        <SettingSlider
          label="Reward Sensitivity"
          icon="🏆"
          value={prefs.rewardSensitivity}
          onChange={(v) => updatePreferences({ rewardSensitivity: v })}
        />
        <SettingSlider
          label="Reminder Tolerance"
          icon="🔕"
          value={prefs.reminderTolerance}
          onChange={(v) => updatePreferences({ reminderTolerance: v })}
        />

        {/* Sign Out */}
        {/* Body Doubling (Phase 4) */}
        <Text style={[FONTS.label, { color: COLORS.text, marginTop: 16, marginBottom: 10 }]}>BODY DOUBLING</Text>
        <SettingToggle
          label="Enable Companion" icon="👥"
          value={prefs.bodyDoubleEnabled}
          onChange={(v) => updatePreferences({ bodyDoubleEnabled: v })}
        />
        {prefs.bodyDoubleEnabled && (
          <OptionPicker
            label="Companion Personality"
            icon="🎭"
            options={['commander', 'cheerleader', 'stoic', 'gentle']}
            value={prefs.bodyDoublePersonality}
            onChange={(v) => updatePreferences({ bodyDoublePersonality: v as any })}
          />
        )}

        {/* Sign Out */}
        <Pressable onPress={handleSignOut} style={st.signOutBtn}>
          <Text style={[FONTS.body, { color: COLORS.red }]}>Sign Out</Text>
        </Pressable>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

// ─── Reusable Setting Components ───

function SettingToggle({ label, icon, value, onChange }: {
  label: string; icon: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <GlassPanel style={st.settingItem} padding={14}>
      <View style={st.settingRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 18 }}>{icon}</Text>
          <Text style={[FONTS.body, { color: COLORS.text }]}>{label}</Text>
        </View>
        <Switch
          value={value}
          onValueChange={(v) => { Haptics.selectionAsync(); onChange(v); }}
          trackColor={{ false: 'rgba(255,255,255,0.1)', true: `${COLORS.cyan}66` }}
          thumbColor={value ? COLORS.cyan : '#555'}
        />
      </View>
    </GlassPanel>
  );
}

function OptionPicker({ label, icon, options, value, onChange }: {
  label: string; icon: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <GlassPanel style={st.settingItem} padding={14}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
        <Text style={[FONTS.body, { color: COLORS.text }]}>{label}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {options.map((opt) => (
          <Pressable
            key={opt}
            onPress={() => { Haptics.selectionAsync(); onChange(opt); }}
            style={[st.optionChip, value === opt && st.optionChipActive]}
          >
            <Text style={[FONTS.bodySmall, {
              color: value === opt ? COLORS.bg : COLORS.textSecondary,
              fontWeight: value === opt ? '700' : '400',
              textTransform: 'capitalize',
            }]}>
              {opt}
            </Text>
          </Pressable>
        ))}
      </View>
    </GlassPanel>
  );
}

function SettingSlider({ label, icon, value, onChange }: {
  label: string; icon: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <GlassPanel style={st.settingItem} padding={14}>
      <View style={st.settingRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 18 }}>{icon}</Text>
          <Text style={[FONTS.body, { color: COLORS.text }]}>{label}</Text>
        </View>
        <Text style={[FONTS.bodySmall, { color: COLORS.gold, fontWeight: '700' }]}>{value}/5</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            onPress={() => { Haptics.selectionAsync(); onChange(n); }}
            style={[st.sliderDot, n <= value && st.sliderDotActive]}
          >
            <Text style={{ fontSize: 10, color: n <= value ? COLORS.bg : COLORS.textDim }}>{n}</Text>
          </Pressable>
        ))}
      </View>
    </GlassPanel>
  );
}

// ─── Styles ───

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: SPACING.xl, paddingBottom: SPACING.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: RADIUS.md,
    backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  content: { paddingHorizontal: SPACING.xl },
  insightCard: { marginBottom: SPACING.sm },
  insightRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  insightIcon: {
    width: 44, height: 44, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  chartTrack: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3 },
  chartBar: { height: '100%' as any, backgroundColor: COLORS.cyan, borderRadius: 3 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statBox: {
    width: '46%' as any, alignItems: 'center', paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: RADIUS.md,
  },
  profileAvatar: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: `${COLORS.cyan}22`, borderWidth: 2, borderColor: `${COLORS.cyan}44`,
    alignItems: 'center', justifyContent: 'center',
  },
  settingItem: { marginBottom: 8 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  optionChip: {
    flex: 1, paddingVertical: 8, borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center',
    borderWidth: 1, borderColor: 'transparent',
  },
  optionChipActive: {
    backgroundColor: COLORS.cyan, borderColor: COLORS.cyan,
  },
  sliderDot: {
    flex: 1, height: 32, borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center',
  },
  sliderDotActive: { backgroundColor: COLORS.gold },
  signOutBtn: {
    marginTop: 24, paddingVertical: 14, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: `${COLORS.red}44`, alignItems: 'center',
  },
});
