// ═══════════════════════════════════════════════════
// QUEST DETAIL SCREEN — Task breakdown + boss fights
// ═══════════════════════════════════════════════════

import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, SlideInRight } from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import { GlassPanel } from '../components/GlassPanel';
import {
  XPBar, ActionButton, DifficultyIndicator, SectionHeader,
} from '../components/UIKit';
import { SafeScreen } from '../components/SafeScreen';
import { COLORS, SPACING, FONTS, RADIUS, CATEGORY_META } from '../constants/theme';
import { useShadowStore, useQuestById, useQuestSteps } from '../store/useShadowStore';

export default function QuestDetailScreen() {
  return (
    <SafeScreen requiredParams={['questId']}>
      <QuestDetailContent />
    </SafeScreen>
  );
}

function QuestDetailContent() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const questId = route.params?.questId;
  const quest = useQuestById(questId);
  const steps = useQuestSteps(questId);
  const toggleStep = useShadowStore((s) => s.toggleQuestStep);

  if (!quest) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[FONTS.body, { color: COLORS.textSecondary }]}>Quest not found</Text>
        <Pressable onPress={() => nav.goBack()} style={{ marginTop: 16 }}>
          <Text style={[FONTS.label, { color: COLORS.cyan }]}>BACK TO QUESTS</Text>
        </Pressable>
      </View>
    );
  }

  const isBoss = quest.questType === 'boss';
  const completedSteps = steps.filter((s) => s.status === 'done').length;
  const totalSteps = steps.length;
  const catMeta = CATEGORY_META[quest.category] || { icon: '⚔️', color: COLORS.cyan, label: quest.category };

  // Boss HP calculation
  const bossHp = isBoss && quest.bossMaxHp
    ? Math.max(0, quest.bossMaxHp - (completedSteps * (quest.bossMaxHp / Math.max(totalSteps, 1))))
    : 0;
  const bossHpPct = quest.bossMaxHp ? (bossHp / quest.bossMaxHp) * 100 : 0;

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()} style={styles.backBtn}>
          <Text style={{ color: COLORS.text, fontSize: 20 }}>✕</Text>
        </Pressable>
        <Text style={[FONTS.label, { color: COLORS.textSecondary }]}>
          {isBoss ? `Phase ${Math.min(completedSteps + 1, totalSteps)}/${totalSteps}` : 'Quest Detail'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Title */}
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={[FONTS.display, { color: COLORS.text, textAlign: 'center', fontSize: 22 }]}>
            {quest.title}
          </Text>
        </Animated.View>

        {/* Boss HP Bar */}
        {isBoss && (
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <GlassPanel style={styles.bossHpCard} glowColor={COLORS.red} glow>
              <Text style={[FONTS.label, { color: COLORS.red, textAlign: 'center' }]}>BOSS HP</Text>
              <View style={styles.bossHpTrack}>
                <Animated.View
                  style={[styles.bossHpFill, { width: `${bossHpPct}%` }]}
                />
                <Text style={styles.bossHpText}>
                  {Math.round(bossHp)} / {quest.bossMaxHp}
                </Text>
              </View>
              <Text style={[FONTS.bodySmall, { color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 }]}>
                {quest.bossName || quest.title}
              </Text>
            </GlassPanel>
          </Animated.View>
        )}

        {/* Meta Row */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={{ fontSize: 14 }}>⏱</Text>
            <Text style={[FONTS.bodySmall, { color: COLORS.textSecondary }]}>{quest.estimatedMinutes} min</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={{ fontSize: 14 }}>🏆</Text>
            <Text style={[FONTS.bodySmall, { color: COLORS.gold }]}>{quest.xpReward} XP</Text>
          </View>
          <View style={styles.metaItem}>
            <DifficultyIndicator level={quest.difficultyScore} />
            <Text style={[FONTS.bodySmall, { color: COLORS.textSecondary }]}>{completedSteps}/{totalSteps}</Text>
          </View>
        </Animated.View>

        {/* Micro-Steps */}
        <View style={{ marginTop: SPACING.lg }}>
          {steps.map((step, index) => {
            const isDone = step.status === 'done';
            return (
              <Animated.View key={step.id} entering={FadeInDown.delay(200 + index * 50).duration(300)}>
                <GlassPanel
                  onPress={() => toggleStep(questId, step.id)}
                  style={isDone ? { ...styles.stepCard, borderColor: `${COLORS.green}33`, opacity: 0.7 } : styles.stepCard}
                  padding={14}
                >
                  <View style={styles.stepRow}>
                    <View style={[
                      styles.checkbox,
                      {
                        borderColor: isDone ? COLORS.green : COLORS.textDim,
                        backgroundColor: isDone ? `${COLORS.green}22` : 'transparent',
                      },
                    ]}>
                      {isDone && <Text style={{ fontSize: 14, color: COLORS.green }}>✓</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          FONTS.body,
                          { color: COLORS.text },
                          isDone && { textDecorationLine: 'line-through', color: COLORS.textSecondary },
                        ]}
                      >
                        {index + 1}. {step.title}
                      </Text>
                      {step.isRequired && !isDone && (
                        <Text style={[FONTS.bodySmall, { color: COLORS.red, fontSize: 10, marginTop: 2 }]}>
                          ⚠ Required
                        </Text>
                      )}
                    </View>
                  </View>
                </GlassPanel>
              </Animated.View>
            );
          })}
        </View>

        {/* Notes */}
        {quest.description && (
          <Animated.View entering={FadeInDown.delay(500).duration(400)}>
            <GlassPanel style={{ marginTop: SPACING.lg }}>
              <Text style={[FONTS.bodyLarge, { color: COLORS.text, marginBottom: 6 }]}>Notes</Text>
              <Text style={[FONTS.bodySmall, { color: COLORS.textSecondary, lineHeight: 22 }]}>
                {quest.description}
              </Text>
            </GlassPanel>
          </Animated.View>
        )}

        {/* Boss Weak Points */}
        {isBoss && quest.bossWeakPoints && quest.bossWeakPoints.length > 0 && (
          <Animated.View entering={FadeInDown.delay(550).duration(400)}>
            <GlassPanel style={{ marginTop: SPACING.md }}>
              <Text style={[FONTS.label, { color: COLORS.gold, marginBottom: 8 }]}>WEAK POINTS</Text>
              {quest.bossWeakPoints.map((wp, i) => (
                <Text key={i} style={[FONTS.bodySmall, { color: COLORS.textSecondary, marginBottom: 4 }]}>
                  🎯 {wp}
                </Text>
              ))}
            </GlassPanel>
          </Animated.View>
        )}

        {/* Action Buttons */}
        <Animated.View entering={FadeInDown.delay(600).duration(400)} style={styles.actionRow}>
          <ActionButton
            onPress={() => nav.goBack()}
            variant="outline"
            color={COLORS.textSecondary}
            icon="☰"
            style={{ flex: 1 }}
          >
            Options
          </ActionButton>
          <ActionButton
            onPress={() => nav.navigate('FocusMode', { questId: quest.id })}
            color={COLORS.cyan}
            icon={isBoss ? '⚔️' : '🏹'}
            style={{ flex: 2 }}
            size="lg"
          >
            {isBoss ? 'ENTER DUNGEON' : 'START FOCUS'}
          </ActionButton>
        </Animated.View>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.md,
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
  content: {
    paddingHorizontal: SPACING.xl,
  },
  bossHpCard: {
    marginTop: SPACING.lg,
  },
  bossHpTrack: {
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginTop: 10,
    justifyContent: 'center',
  },
  bossHpFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.red,
    borderRadius: RADIUS.md,
  },
  bossHpText: {
    ...FONTS.label,
    color: '#fff',
    textAlign: 'center',
    fontSize: 13,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: SPACING.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepCard: {
    marginBottom: SPACING.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: SPACING.xl,
  },
});
