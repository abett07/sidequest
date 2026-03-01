// ═══════════════════════════════════════════════════
// BOSS FIGHT SCREEN — Phase-by-phase dungeon combat
// ═══════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  FadeIn, FadeInDown, FadeInUp,
  useAnimatedStyle, useSharedValue, withTiming, withRepeat,
  withSequence, withSpring, Easing, cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute } from '@react-navigation/native';
import { GlassPanel } from '../components/GlassPanel';
import { ActionButton, XPBar, DifficultyIndicator } from '../components/UIKit';
import { SafeScreen } from '../components/SafeScreen';
import { COLORS, SPACING, FONTS, RADIUS } from '../constants/theme';
import { useShadowStore, useQuestById, useQuestSteps } from '../store/useShadowStore';

const { width: SW } = Dimensions.get('window');

const ATTACK_PHRASES = [
  'CRITICAL HIT!',
  'PHASE BREAKER!',
  'SHADOW STRIKE!',
  'WEAK POINT EXPOSED!',
  'DEVASTATING BLOW!',
];

export default function BossFightScreen() {
  return (
    <SafeScreen requiredParams={['questId']}>
      <BossFightContent />
    </SafeScreen>
  );
}

function BossFightContent() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const questId = route.params?.questId;
  const quest = useQuestById(questId);
  const steps = useQuestSteps(questId);
  const { toggleQuestStep, completeQuest, addXP } = useShadowStore();

  const [currentPhase, setCurrentPhase] = useState(0);
  const [attackMsg, setAttackMsg] = useState<string | null>(null);
  const [defeated, setDefeated] = useState(false);

  // Animated values
  const hpWidth = useSharedValue(100);
  const shakeX = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const bossGlow = useSharedValue(0.3);

  useEffect(() => {
    bossGlow.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, true
    );
    // #10 FIX: Cancel infinite animation on unmount
    return () => {
      cancelAnimation(bossGlow);
      cancelAnimation(shakeX);
      cancelAnimation(flashOpacity);
      cancelAnimation(hpWidth);
    };
  }, []);

  if (!quest || quest.questType !== 'boss') {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={{ fontSize: 48 }}>🔍</Text>
        <Text style={[FONTS.body, { color: COLORS.textSecondary, marginTop: 12 }]}>Boss not found</Text>
        <Pressable onPress={() => nav.canGoBack() ? nav.goBack() : nav.navigate('MainTabs')} style={{ marginTop: 16 }}>
          <Text style={[FONTS.label, { color: COLORS.cyan }]}>BACK TO QUESTS</Text>
        </Pressable>
      </View>
    );
  }

  const maxHp = quest.bossMaxHp || 500;
  const completedSteps = steps.filter((s) => s.status === 'done').length;
  const totalSteps = Math.max(steps.length, 1);
  const currentHp = Math.max(0, maxHp - Math.round((completedSteps / totalSteps) * maxHp));
  const hpPct = (currentHp / maxHp) * 100;

  // Get next incomplete step
  const nextStep = steps.find((s) => s.status !== 'done');
  const activePhaseSteps = steps.filter((s) => s.status !== 'done');

  const handleAttack = () => {
    if (!nextStep) return;

    // Complete the step
    toggleQuestStep(questId, nextStep.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Attack animation
    const msg = ATTACK_PHRASES[Math.floor(Math.random() * ATTACK_PHRASES.length)];
    setAttackMsg(msg);

    // Shake boss
    shakeX.value = withSequence(
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(6, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );

    // Flash
    flashOpacity.value = withSequence(
      withTiming(0.6, { duration: 100 }),
      withTiming(0, { duration: 400 }),
    );

    // Update HP bar
    const newCompletedCount = completedSteps + 1;
    const newHpPct = Math.max(0, 100 - (newCompletedCount / totalSteps) * 100);
    hpWidth.value = withTiming(newHpPct, { duration: 600 });

    // Clear attack message
    setTimeout(() => setAttackMsg(null), 1500);

    // Check victory
    if (newCompletedCount >= totalSteps) {
      setTimeout(() => {
        setDefeated(true);
        completeQuest(questId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 800);
    }

    setCurrentPhase(newCompletedCount);
  };

  const hpBarStyle = useAnimatedStyle(() => ({
    width: `${hpWidth.value}%`,
  }));

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const bossGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: bossGlow.value,
  }));

  // ── Victory Screen ──
  if (defeated) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Animated.View entering={FadeIn.duration(800)} style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 100 }}>👑</Text>
          <Text style={[FONTS.display, { color: COLORS.gold, marginTop: 16 }]}>BOSS DEFEATED</Text>
          <Text style={[FONTS.bodyLarge, { color: COLORS.text, marginTop: 10 }]}>
            {quest.bossName || quest.title}
          </Text>
          <Text style={[FONTS.body, { color: COLORS.textSecondary, marginTop: 8 }]}>
            +{quest.xpReward * 2} XP · +{quest.coinReward} Coins
          </Text>

          <GlassPanel style={styles.victoryChest} glow glowColor={COLORS.gold}>
            <Text style={{ fontSize: 40, textAlign: 'center' }}>🎁</Text>
            <Text style={[FONTS.label, { color: COLORS.gold, textAlign: 'center', marginTop: 8 }]}>
              REWARD CHEST UNLOCKED
            </Text>
          </GlassPanel>

          <ActionButton
            onPress={() => nav.navigate('MainTabs', { screen: 'Dashboard' })}
            color={COLORS.cyan}
            icon="🏠"
            size="lg"
            style={{ marginTop: 20, width: 220 }}
          >
            RETURN TO BASE
          </ActionButton>
        </Animated.View>
      </View>
    );
  }

  // ── Battle Screen ──
  return (
    <View style={styles.screen}>
      {/* Red flash overlay */}
      <Animated.View style={[styles.flashOverlay, flashStyle]} pointerEvents="none" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()} style={styles.backBtn}>
          <Text style={{ color: COLORS.text, fontSize: 16 }}>✕</Text>
        </Pressable>
        <Text style={[FONTS.label, { color: COLORS.textSecondary }]}>
          PHASE {Math.min(currentPhase + 1, totalSteps)} / {totalSteps}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Boss Area */}
      <Animated.View style={[styles.bossArea, shakeStyle, bossGlowStyle]}>
        <Text style={[FONTS.display, { color: COLORS.red, textAlign: 'center', fontSize: 20 }]}>
          {quest.bossName || quest.title}
        </Text>

        {/* Boss Icon */}
        <View style={styles.bossIcon}>
          <Text style={{ fontSize: 64 }}>👹</Text>
        </View>

        {/* HP Bar */}
        <GlassPanel style={styles.hpCard} glowColor={COLORS.red} glow>
          <Text style={[FONTS.label, { color: COLORS.red, textAlign: 'center', fontSize: 11 }]}>BOSS HP</Text>
          <View style={styles.hpTrack}>
            <Animated.View style={[styles.hpFill, hpBarStyle]} />
            <Text style={styles.hpText}>{currentHp} / {maxHp}</Text>
          </View>
        </GlassPanel>

        {/* Attack Message */}
        {attackMsg && (
          <Animated.Text entering={FadeInUp.duration(300)} style={styles.attackMsg}>
            {attackMsg}
          </Animated.Text>
        )}
      </Animated.View>

      {/* Phase Steps */}
      <View style={styles.phaseArea}>
        <Text style={[FONTS.label, { color: COLORS.textSecondary, marginBottom: 10 }]}>
          BATTLE OBJECTIVES
        </Text>

        {steps.slice(0, 5).map((step, i) => {
          const isDone = step.status === 'done';
          const isNext = step.id === nextStep?.id;
          return (
            <Animated.View key={step.id} entering={FadeInDown.delay(i * 40).duration(200)}>
              <View style={[
                styles.phaseStep,
                isDone && styles.phaseStepDone,
                isNext && styles.phaseStepActive,
              ]}>
                <View style={[styles.phaseCheck, {
                  borderColor: isDone ? COLORS.green : isNext ? COLORS.cyan : COLORS.textDim,
                  backgroundColor: isDone ? `${COLORS.green}22` : 'transparent',
                }]}>
                  {isDone && <Text style={{ fontSize: 12, color: COLORS.green }}>✓</Text>}
                </View>
                <Text style={[FONTS.bodySmall, {
                  color: isDone ? COLORS.textDim : COLORS.text,
                  textDecorationLine: isDone ? 'line-through' : 'none',
                  flex: 1,
                }]}>
                  {step.title}
                </Text>
                {isNext && <Text style={{ fontSize: 12 }}>⬅️</Text>}
              </View>
            </Animated.View>
          );
        })}
      </View>

      {/* Attack Button */}
      <View style={styles.attackArea}>
        <ActionButton
          onPress={handleAttack}
          color={COLORS.red}
          fullWidth
          icon="⚔️"
          size="lg"
          disabled={!nextStep}
        >
          {nextStep ? `ATTACK: ${nextStep.title.slice(0, 25)}` : 'ALL PHASES CLEARED'}
        </ActionButton>

        <ActionButton
          onPress={() => nav.goBack()}
          variant="ghost"
          color={COLORS.textSecondary}
          style={{ marginTop: 8 }}
        >
          Retreat & Resume Later
        </ActionButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  centered: { alignItems: 'center', justifyContent: 'center' },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.red,
    zIndex: 100,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: SPACING.xl, paddingBottom: SPACING.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: RADIUS.md,
    backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  bossArea: {
    alignItems: 'center', paddingHorizontal: SPACING.xl,
    shadowColor: COLORS.red, shadowRadius: 30, elevation: 10,
  },
  bossIcon: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: `${COLORS.red}15`, borderWidth: 2, borderColor: `${COLORS.red}33`,
    alignItems: 'center', justifyContent: 'center', marginVertical: 12,
    shadowColor: COLORS.red, shadowOpacity: 0.4, shadowRadius: 20,
  },
  hpCard: { width: '100%' },
  hpTrack: {
    height: 28, backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.md, overflow: 'hidden', marginTop: 8, justifyContent: 'center',
  },
  hpFill: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    backgroundColor: COLORS.red, borderRadius: RADIUS.md,
  },
  hpText: { ...FONTS.label, color: '#fff', textAlign: 'center', fontSize: 13 },
  attackMsg: {
    ...FONTS.display, color: COLORS.gold, fontSize: 18, marginTop: 12,
    textShadowColor: COLORS.gold, textShadowRadius: 10,
  },
  phaseArea: {
    flex: 1, paddingHorizontal: SPACING.xl, marginTop: SPACING.lg,
  },
  phaseStep: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: RADIUS.md, marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1, borderColor: 'transparent',
  },
  phaseStepDone: { opacity: 0.5 },
  phaseStepActive: {
    borderColor: `${COLORS.cyan}33`, backgroundColor: `${COLORS.cyan}08`,
  },
  phaseCheck: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  attackArea: {
    paddingHorizontal: SPACING.xl, paddingBottom: 40, paddingTop: SPACING.md,
  },
  victoryChest: { marginTop: 24, width: 200 },
});
