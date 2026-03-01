// ═══════════════════════════════════════════════════
// ONBOARDING SCREEN — Multi-step setup wizard
// Fast setup without overwhelm
// ═══════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable, StyleSheet, Dimensions,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInRight, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassPanel } from '../components/GlassPanel';
import { ActionButton } from '../components/UIKit';
import { COLORS, SPACING, FONTS, RADIUS } from '../constants/theme';
import { useShadowStore } from '../store/useShadowStore';

const { width: SW } = Dimensions.get('window');

const GOALS = ['Focus', 'Chores', 'Study', 'Job Hunt', 'Life Admin', 'Health'];
const GOAL_ICONS = ['🎯', '🏠', '📚', '💼', '📋', '💪'];

const CHALLENGES = ['Task Start', 'Distraction', 'Overwhelm', 'Inconsistency', 'Time Blindness'];
const CHALLENGE_ICONS = ['❄️', '👁️', '⚡', '🔄', '⏰'];

const REMINDER_STYLES = [
  { key: 'gentle',  label: 'Gentle Guide',      desc: 'Soft nudges and encouragement', icon: '🌙' },
  { key: 'direct',  label: 'Direct Commander',   desc: 'Clear, no-nonsense briefings',  icon: '⚔️' },
  { key: 'intense', label: 'Shadow Monarch',     desc: 'Intense, high-pressure commands', icon: '💀' },
];

export default function OnboardingScreen() {
  const { updateUser, setHasOnboarded } = useShadowStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [challenges, setChallenges] = useState<string[]>([]);
  const [reminder, setReminder] = useState('direct');

  const toggleGoal = (g: string) =>
    setGoals((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);
  const toggleChallenge = (c: string) =>
    setChallenges((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);

  const handleComplete = () => {
    updateUser({
      characterName: name || 'Hunter',
      reminderStyle: reminder as any,
    });
    setHasOnboarded(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const nextStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep((s) => s + 1);
  };

  const renderStep = () => {
    switch (step) {
      // Step 0: Welcome + Name
      case 0:
        return (
          <Animated.View entering={FadeIn.duration(500)} style={styles.stepContent}>
            {/* E-Rank Badge */}
            <View style={styles.syncIcon}>
              <Text style={{ fontSize: 48 }}>⚡</Text>
            </View>

            <View style={styles.rankBadge}>
              <Text style={[FONTS.label, { color: COLORS.gold }]}>E-RANK</Text>
            </View>

            <Text style={[FONTS.display, { color: COLORS.text, textAlign: 'center', marginTop: 16 }]}>
              SYNCHRONIZATION{'\n'}COMPLETE
            </Text>
            <Text style={[FONTS.body, { color: COLORS.textSecondary, textAlign: 'center', marginTop: 8 }]}>
              You have been chosen, Hunter.
            </Text>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter your Hunter name..."
              placeholderTextColor={COLORS.textDim}
              style={styles.nameInput}
            />
          </Animated.View>
        );

      // Step 1: Goals
      case 1:
        return (
          <Animated.View entering={SlideInRight.duration(300)} style={styles.stepContent}>
            <Text style={[FONTS.displaySmall, { color: COLORS.text, textAlign: 'center' }]}>
              SELECT YOUR MISSIONS
            </Text>
            <Text style={[FONTS.bodySmall, { color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 }]}>
              What gates do you need to clear?
            </Text>

            <View style={styles.grid}>
              {GOALS.map((g, i) => {
                const active = goals.includes(g);
                return (
                  <Animated.View key={g} entering={FadeInDown.delay(i * 50).duration(250)} style={styles.gridHalf}>
                    <GlassPanel
                      onPress={() => toggleGoal(g)}
                      style={[active && { borderColor: `${COLORS.cyan}55` }]}
                      padding={16}
                    >
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{ fontSize: 28 }}>{GOAL_ICONS[i]}</Text>
                        <Text style={[FONTS.body, {
                          color: active ? COLORS.cyan : COLORS.text,
                          marginTop: 6, fontWeight: '600',
                        }]}>
                          {g}
                        </Text>
                      </View>
                    </GlassPanel>
                  </Animated.View>
                );
              })}
            </View>
          </Animated.View>
        );

      // Step 2: Challenges
      case 2:
        return (
          <Animated.View entering={SlideInRight.duration(300)} style={styles.stepContent}>
            <Text style={[FONTS.displaySmall, { color: COLORS.text, textAlign: 'center' }]}>
              YOUR SHADOW WEAKNESSES
            </Text>
            <Text style={[FONTS.bodySmall, { color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 }]}>
              What debuffs plague you most?
            </Text>

            <View style={{ gap: 10, marginTop: 20 }}>
              {CHALLENGES.map((c, i) => {
                const active = challenges.includes(c);
                return (
                  <Animated.View key={c} entering={FadeInDown.delay(i * 50).duration(250)}>
                    <GlassPanel
                      onPress={() => toggleChallenge(c)}
                      style={[active && { borderColor: `${COLORS.red}55` }]}
                      padding={14}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                        <Text style={{ fontSize: 22 }}>{CHALLENGE_ICONS[i]}</Text>
                        <Text style={[FONTS.body, {
                          color: active ? COLORS.red : COLORS.text, fontWeight: '600',
                        }]}>
                          {c}
                        </Text>
                      </View>
                    </GlassPanel>
                  </Animated.View>
                );
              })}
            </View>
          </Animated.View>
        );

      // Step 3: Reminder Style
      case 3:
        return (
          <Animated.View entering={SlideInRight.duration(300)} style={styles.stepContent}>
            <Text style={[FONTS.displaySmall, { color: COLORS.text, textAlign: 'center' }]}>
              NOTIFICATION PROTOCOL
            </Text>
            <Text style={[FONTS.bodySmall, { color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 }]}>
              How should the System address you?
            </Text>

            <View style={{ gap: 12, marginTop: 20 }}>
              {REMINDER_STYLES.map((r, i) => {
                const active = reminder === r.key;
                return (
                  <Animated.View key={r.key} entering={FadeInDown.delay(i * 80).duration(300)}>
                    <GlassPanel
                      onPress={() => setReminder(r.key)}
                      style={[active && { borderColor: `${COLORS.purple}55` }]}
                      padding={18}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                        <Text style={{ fontSize: 30 }}>{r.icon}</Text>
                        <View>
                          <Text style={[FONTS.bodyLarge, {
                            color: active ? COLORS.purple : COLORS.text, fontWeight: '700',
                          }]}>
                            {r.label}
                          </Text>
                          <Text style={[FONTS.bodySmall, { color: COLORS.textSecondary, fontSize: 12 }]}>
                            {r.desc}
                          </Text>
                        </View>
                      </View>
                    </GlassPanel>
                  </Animated.View>
                );
              })}
            </View>
          </Animated.View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.screen}>
      {/* Progress dots */}
      <View style={styles.dots}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                width: i === step ? 24 : 8,
                backgroundColor: i <= step ? COLORS.cyan : COLORS.textDim,
              },
            ]}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        {renderStep()}
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.footer}>
        <ActionButton
          onPress={step < 3 ? nextStep : handleComplete}
          color={step === 3 ? COLORS.red : COLORS.cyan}
          fullWidth
          icon={step === 3 ? '⚡' : '→'}
          size="lg"
        >
          {step === 3 ? 'ENTER THE SYSTEM' : 'CONTINUE'}
        </ActionButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  dots: {
    flexDirection: 'row', justifyContent: 'center', gap: 8,
    paddingTop: 60, paddingBottom: 8,
  },
  dot: { height: 8, borderRadius: 4 },
  stepContent: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: SPACING.xxxl,
  },
  syncIcon: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: `${COLORS.cyan}22`, borderWidth: 2, borderColor: `${COLORS.cyan}33`,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.cyan, shadowOpacity: 0.3, shadowRadius: 20,
  },
  rankBadge: {
    marginTop: 16, paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1,
    borderColor: `${COLORS.gold}55`, backgroundColor: `${COLORS.gold}15`,
  },
  nameInput: {
    width: 260, padding: 14, borderRadius: 14, marginTop: 24,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.glassBorder,
    color: COLORS.text, fontSize: 16, textAlign: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 20 },
  gridHalf: { width: '47%' },
  footer: { paddingHorizontal: SPACING.xxxl, paddingBottom: 40 },
});
