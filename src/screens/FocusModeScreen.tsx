// ═══════════════════════════════════════════════════
// FOCUS MODE SCREEN — Deep one-task execution
// Timer presets, AI companion prompts, distraction log
// ═══════════════════════════════════════════════════

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, Dimensions,
} from 'react-native';
import Animated, {
  FadeIn, FadeInDown, FadeInUp,
  useAnimatedStyle, useSharedValue, withTiming, withRepeat,
  withSequence, Easing, cancelAnimation,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute } from '@react-navigation/native';
import { GlassPanel } from '../components/GlassPanel';
import { ActionButton } from '../components/UIKit';
import { COLORS, SPACING, FONTS, RADIUS } from '../constants/theme';
import { useShadowStore, useQuestById } from '../store/useShadowStore';
import { SESSION_PRESETS, COMPANION_PROMPTS, type SessionType } from '../types';

const { width: SW } = Dimensions.get('window');

// Fallback prompts (used when body double is off)
const DEFAULT_PROMPTS = COMPANION_PROMPTS.commander;

export default function FocusModeScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const questId = route.params?.questId;
  const initialSession = route.params?.sessionType as SessionType | undefined;
  const quest = useQuestById(questId);

  const { startFocusSession, endFocusSession, logDistraction, addXP, activeFocusSession } = useShadowStore();

  const [phase, setPhase] = useState<'select' | 'active' | 'complete'>('select');
  const [sessionType, setSessionType] = useState<SessionType | null>(initialSession || null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [distractions, setDistractions] = useState(0);
  const [promptIdx, setPromptIdx] = useState(0);
  const [bodyDoubleActive, setBodyDoubleActive] = useState(route.params?.bodyDouble ?? false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Body double: read personality from prefs, pick prompt list
  const prefs = useShadowStore((s) => s.preferences);
  const isBodyDouble = bodyDoubleActive || prefs.bodyDoubleEnabled;
  const personality = prefs.bodyDoublePersonality || 'commander';
  const prompts = isBodyDouble ? COMPANION_PROMPTS[personality] : DEFAULT_PROMPTS;
  const companionName = isBodyDouble
    ? ({ commander: 'Shadow Commander', cheerleader: 'Hype Spirit', stoic: 'Silent Guardian', gentle: 'Warm Guide' })[personality]
    : 'System';

  // Start timer
  const startTimer = (type: SessionType) => {
    const minutes = SESSION_PRESETS[type].minutes;
    setSessionType(type);
    setTimeLeft(minutes * 60);
    setTotalTime(minutes * 60);
    setIsRunning(true);
    setPhase('active');
    setDistractions(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    startFocusSession({
      userId: '',
      questId,
      sessionType: type,
      plannedMinutes: minutes,
    });
  };

  // Timer tick
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            setIsRunning(false);
            setPhase('complete');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            endFocusSession(true, 4);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
  }, [isRunning, timeLeft]);

  // Rotate companion prompts (faster when body doubling)
  useEffect(() => {
    if (phase === 'active') {
      const interval = isBodyDouble ? 6000 : 10000; // 6s for body double, 10s otherwise
      const i = setInterval(() => setPromptIdx((p) => (p + 1) % prompts.length), interval);
      return () => clearInterval(i);
    }
  }, [phase, isBodyDouble, prompts.length]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = circumference * (progress / 100);

  const handleDistraction = () => {
    setDistractions((d) => d + 1);
    logDistraction();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // ── PHASE: Select Sprint ──
  if (phase === 'select') {
    return (
      <View style={styles.screen}>
        <View style={styles.selectHeader}>
          <Pressable onPress={() => nav.goBack()} style={styles.backBtn}>
            <Text style={{ color: COLORS.text, fontSize: 16 }}>‹</Text>
          </Pressable>
          <Text style={[FONTS.displaySmall, { color: COLORS.text }]}>FOCUS MODE</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.selectContent}>
          {quest && (
            <Animated.View entering={FadeIn.duration(300)}>
              <Text style={[FONTS.bodyLarge, { color: COLORS.cyan, textAlign: 'center', marginBottom: 24 }]}>
                {quest.title}
              </Text>
            </Animated.View>
          )}

          <Text style={[FONTS.label, { color: COLORS.textSecondary, textAlign: 'center', marginBottom: 16 }]}>
            SELECT SPRINT TYPE
          </Text>

          {(['ignite', 'scout', 'dungeon', 'raid'] as SessionType[]).map((type, i) => {
            const preset = SESSION_PRESETS[type];
            return (
              <Animated.View key={type} entering={FadeInDown.delay(i * 80).duration(300)}>
                <GlassPanel onPress={() => startTimer(type)} style={styles.presetCard} padding={18}>
                  <View style={styles.presetRow}>
                    <Text style={{ fontSize: 30 }}>{preset.icon}</Text>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                      <Text style={[FONTS.bodyLarge, { color: COLORS.text }]}>{preset.label}</Text>
                      <Text style={[FONTS.bodySmall, { color: COLORS.textSecondary }]}>
                        {preset.minutes} min sprint
                      </Text>
                    </View>
                    <Text style={[FONTS.number, { color: preset.color, fontSize: 18 }]}>
                      {preset.minutes}:00
                    </Text>
                  </View>
                </GlassPanel>
              </Animated.View>
            );
          })}
        </View>
      </View>
    );
  }

  // ── PHASE: Complete ──
  if (phase === 'complete') {
    const earnedXP = quest?.xpReward || (totalTime / 60) * 4;
    return (
      <View style={[styles.screen, styles.centered]}>
        <Animated.View entering={FadeIn.duration(600)} style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 80 }}>🏆</Text>
          <Text style={[FONTS.display, { color: COLORS.gold, marginTop: 20 }]}>QUEST CLEARED</Text>
          <Text style={[FONTS.body, { color: COLORS.textSecondary, marginTop: 8 }]}>
            +{Math.round(earnedXP)} XP earned
          </Text>
          <Text style={[FONTS.bodySmall, { color: COLORS.textSecondary, marginTop: 4 }]}>
            Distractions resisted: {distractions}
          </Text>
          <Text style={[FONTS.bodySmall, { color: COLORS.textSecondary }]}>
            Session: {SESSION_PRESETS[sessionType!]?.label}
          </Text>

          <ActionButton
            onPress={() => nav.goBack()}
            color={COLORS.cyan}
            style={{ marginTop: 30, width: 200 }}
            icon="🏠"
          >
            RETURN TO BASE
          </ActionButton>
        </Animated.View>
      </View>
    );
  }

  // ── PHASE: Active Timer ──
  return (
    <View style={[styles.screen, styles.centered]}>
      {/* Back */}
      <Pressable onPress={() => nav.goBack()} style={[styles.backBtn, styles.timerBack]}>
        <Text style={{ color: COLORS.text, fontSize: 16 }}>˅</Text>
      </Pressable>

      {/* Distraction counter */}
      {distractions > 0 && (
        <View style={styles.distractionBadge}>
          <Text style={[FONTS.label, { color: COLORS.red, fontSize: 13 }]}>{distractions}</Text>
        </View>
      )}

      {/* Session label */}
      <Animated.Text
        entering={FadeIn.duration(300)}
        style={[FONTS.body, { color: COLORS.textSecondary, marginBottom: 20 }]}
      >
        {SESSION_PRESETS[sessionType!]?.label} · {quest?.title || 'Free Focus'}
      </Animated.Text>

      {/* Circular Timer */}
      <View style={styles.timerContainer}>
        <Svg width={280} height={280} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle
            cx={140} cy={140} r={radius}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6}
          />
          <Circle
            cx={140} cy={140} r={radius}
            fill="none" stroke={COLORS.cyan} strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - strokeDash}
          />
        </Svg>
        <View style={styles.timerCenter}>
          <Text style={[FONTS.numberLarge, { color: COLORS.text, fontSize: 56 }]}>
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </Text>
        </View>
      </View>

      {/* Companion Prompt */}
      {isBodyDouble && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
          <Text style={{ fontSize: 12 }}>👤</Text>
          <Text style={[FONTS.bodySmall, { color: COLORS.cyan, fontSize: 11 }]}>{companionName}</Text>
        </View>
      )}
      <Animated.Text
        key={promptIdx}
        entering={FadeInUp.duration(400)}
        style={styles.aiPrompt}
      >
        "{prompts[promptIdx % prompts.length]}"
      </Animated.Text>

      {/* Body Double Toggle (during session) */}
      {phase === 'active' && (
        <Pressable
          onPress={() => { setBodyDoubleActive(!bodyDoubleActive); Haptics.selectionAsync(); }}
          style={[styles.bdToggle, isBodyDouble && styles.bdToggleActive]}
        >
          <Text style={{ fontSize: 14 }}>{isBodyDouble ? '👥' : '👤'}</Text>
          <Text style={[FONTS.bodySmall, { color: isBodyDouble ? COLORS.cyan : COLORS.textDim, fontSize: 10 }]}>
            {isBodyDouble ? 'Companion On' : 'Solo Mode'}
          </Text>
        </Pressable>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        <ActionButton
          onPress={() => setIsRunning(!isRunning)}
          variant="outline"
          color={COLORS.cyan}
          style={{ minWidth: 130 }}
        >
          {isRunning ? 'Pause' : 'Resume'}
        </ActionButton>
        <ActionButton
          onPress={() => {
            setIsRunning(false);
            endFocusSession(false, 2);
            nav.goBack();
          }}
          variant="outline"
          color={COLORS.red}
          style={{ minWidth: 130 }}
        >
          Retreat
        </ActionButton>
      </View>

      {/* Distraction button */}
      <Pressable onPress={handleDistraction} style={styles.distractionBtn}>
        <Text style={[FONTS.bodySmall, { color: COLORS.textSecondary }]}>
          👁️ Log Distraction ({distractions})
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  selectContent: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    justifyContent: 'center',
  },
  presetCard: {
    marginBottom: SPACING.md,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerBack: {
    position: 'absolute',
    top: 56,
    left: SPACING.xl,
  },
  distractionBadge: {
    position: 'absolute',
    top: 56,
    right: SPACING.xl,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    backgroundColor: `${COLORS.red}22`,
    borderWidth: 1,
    borderColor: `${COLORS.red}44`,
  },
  timerContainer: {
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiPrompt: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 24,
    maxWidth: 280,
    lineHeight: 22,
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 30,
  },
  distractionBtn: {
    marginTop: 20,
    padding: 10,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  bdToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignSelf: 'center',
  },
  bdToggleActive: {
    backgroundColor: `${COLORS.cyan}15`,
    borderColor: `${COLORS.cyan}33`,
  },
});
