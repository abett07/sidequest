// ═══════════════════════════════════════════════════
// RESCUE MODE — Emergency help when stuck
// The safest screen emotionally
// ═══════════════════════════════════════════════════

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { GlassPanel } from '../components/GlassPanel';
import { ActionButton } from '../components/UIKit';
import { COLORS, SPACING, FONTS, RADIUS } from '../constants/theme';

const RESCUE_STATES = [
  { key: 'frozen',      label: 'Frozen',       icon: '❄️', desc: "Can't start anything" },
  { key: 'overwhelmed', label: 'Overwhelmed',  icon: '⏰', desc: 'Too many tasks' },
  { key: 'distracted',  label: 'Distracted',   icon: '👁️', desc: "Can't stay on track" },
  { key: 'anxious',     label: 'Anxiety Fog',  icon: '🌫️', desc: 'Paralyzed by worry' },
  { key: 'exhausted',   label: 'Exhausted',    icon: '😮‍💨', desc: 'No energy left' },
];

const RESCUE_ACTIONS: Record<string, { action: string; fallback: string; timer: number; breathing?: string }> = {
  frozen: {
    action: "Open one file. Just one. That's your entire mission right now.",
    fallback: "Can't even do that? Just write one word. Any word. You're moving.",
    timer: 2,
    breathing: "Breathe in 4 seconds. Hold 4. Out 4. You're already stronger.",
  },
  overwhelmed: {
    action: "Pick the smallest task. Ignore everything else for 5 minutes.",
    fallback: "Write down the 3 things weighing on you. Then cross out 2.",
    timer: 5,
    breathing: "Your brain needs to see less. We'll reduce scope. Just focus on one.",
  },
  distracted: {
    action: "Close all tabs except one. Set a 3-minute timer. One thing only.",
    fallback: "Put your phone face-down. Set this timer. 3 minutes of anything counts.",
    timer: 3,
  },
  anxious: {
    action: "Take 3 slow breaths. Then write down one worry. Then one tiny action.",
    fallback: "You don't have to fix everything. Just do the next small thing.",
    timer: 2,
    breathing: "4 seconds in... hold... 4 seconds out. The shadows can't touch you here.",
  },
  exhausted: {
    action: "Rest IS a valid strategy. Set a 10-min recovery timer. Then do one thing.",
    fallback: "Permission granted to rest. Set this timer and close your eyes.",
    timer: 10,
  },
};

export default function RescueModeScreen() {
  const nav = useNavigation<any>();
  const [selected, setSelected] = useState<string | null>(null);
  const [showAction, setShowAction] = useState(false);

  const handleSelect = (key: string) => {
    setSelected(key);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => setShowAction(true), 400);
  };

  const rescue = selected ? RESCUE_ACTIONS[selected] : null;

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(500)} style={styles.headerArea}>
          <View style={styles.protocolBadge}>
            <Text style={[FONTS.labelSmall, { color: COLORS.purple }]}>
              SHADOW RESCUE PROTOCOL ACTIVATED
            </Text>
          </View>

          <Text style={[FONTS.display, { color: COLORS.text, textAlign: 'center', marginTop: 20, fontSize: 26, lineHeight: 36 }]}>
            What shadows are{'\n'}holding you back,{'\n'}Hunter?
          </Text>
        </Animated.View>

        {/* Emotion Grid */}
        <View style={styles.emotionGrid}>
          {RESCUE_STATES.map((state, i) => (
            <Animated.View
              key={state.key}
              entering={FadeInDown.delay(100 + i * 60).duration(300)}
              style={state.key === 'exhausted' ? styles.fullWidthEmotion : styles.halfEmotion}
            >
              <GlassPanel
                onPress={() => handleSelect(state.key)}
                style={{
                  ...styles.emotionCard,
                  ...(selected === state.key ? {
                    borderColor: `${COLORS.purple}55`,
                    backgroundColor: `${COLORS.purple}12`,
                  } : {}),
                }}
                padding={20}
              >
                <Text style={{ fontSize: 36, textAlign: 'center' }}>{state.icon}</Text>
                <Text style={[FONTS.bodyLarge, {
                  color: selected === state.key ? COLORS.purple : COLORS.text,
                  textAlign: 'center',
                  marginTop: 8,
                }]}>
                  {state.label}
                </Text>
                <Text style={[FONTS.bodySmall, {
                  color: COLORS.textSecondary,
                  textAlign: 'center',
                  fontSize: 12,
                  marginTop: 2,
                }]}>
                  {state.desc}
                </Text>
              </GlassPanel>
            </Animated.View>
          ))}
        </View>

        {/* Rescue Action Card */}
        {showAction && rescue && (
          <Animated.View entering={FadeInUp.duration(500)}>
            <GlassPanel glow glowColor={COLORS.cyan} style={styles.actionCard}>
              <Text style={[FONTS.label, { color: COLORS.cyan }]}>SYSTEM DIAGNOSIS</Text>
              <Text style={[FONTS.body, { color: COLORS.text, marginTop: 10, lineHeight: 24 }]}>
                {rescue.action}
              </Text>
              {rescue.breathing && (
                <Text style={[FONTS.bodySmall, {
                  color: COLORS.purple,
                  marginTop: 10,
                  fontStyle: 'italic',
                  lineHeight: 20,
                }]}>
                  {rescue.breathing}
                </Text>
              )}
            </GlassPanel>

            {/* Fallback */}
            <GlassPanel style={styles.fallbackCard} padding={14}>
              <Text style={[FONTS.bodySmall, { color: COLORS.textSecondary }]}>
                Still stuck? → {rescue.fallback}
              </Text>
            </GlassPanel>

            {/* Launch Button */}
            <ActionButton
              onPress={() => nav.navigate('FocusMode', { sessionType: 'rescue' })}
              color={COLORS.red}
              fullWidth
              icon="⚡"
              size="lg"
              style={{ marginTop: SPACING.lg }}
            >
              I CHOOSE TO FIGHT → {rescue.timer}-MIN IGNITE
            </ActionButton>
          </Animated.View>
        )}

        {/* Back link */}
        <Pressable onPress={() => nav.goBack()} style={styles.backLink}>
          <Text style={[FONTS.bodySmall, { color: COLORS.textSecondary }]}>← Return to Base</Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    paddingHorizontal: SPACING.xl,
    paddingTop: 60,
  },
  headerArea: {
    alignItems: 'center',
  },
  protocolBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: RADIUS.round,
    backgroundColor: `${COLORS.purple}15`,
    borderWidth: 1,
    borderColor: `${COLORS.purple}44`,
  },
  emotionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 28,
  },
  halfEmotion: {
    width: '47%',
  },
  fullWidthEmotion: {
    width: '100%',
  },
  emotionCard: {
    alignItems: 'center',
  },
  actionCard: {
    marginTop: 20,
  },
  fallbackCard: {
    marginTop: SPACING.sm,
  },
  backLink: {
    alignItems: 'center',
    marginTop: 20,
    padding: 10,
  },
});
