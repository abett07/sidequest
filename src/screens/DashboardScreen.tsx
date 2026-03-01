// ═══════════════════════════════════════════════════
// DASHBOARD SCREEN — One-screen command center
// Adapts based on user state (overwhelm mode)
// ═══════════════════════════════════════════════════

import React, { useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Dimensions,
} from 'react-native';
import Animated, {
  FadeIn, FadeInDown, FadeInRight, SlideInRight,
  useAnimatedStyle, useSharedValue, withRepeat, withTiming,
  withSequence, Easing, cancelAnimation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { GlassPanel } from '../components/GlassPanel';
import {
  XPBar, StatOrb, ActionButton, RankBadge, DifficultyIndicator,
  SectionHeader,
} from '../components/UIKit';
import { OfflineBanner, ScreenEmpty } from '../components/ErrorBoundary';
import { COLORS, SPACING, FONTS, RADIUS, CATEGORY_META, RANK_THRESHOLDS } from '../constants/theme';
import {
  useShadowStore, useActiveQuests, useActiveBuffs, useActiveDebuffs,
  useIsOverwhelmed, useXPProgress, useSystemRules,
} from '../store/useShadowStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DashboardScreen() {
  const nav = useNavigation<any>();
  const user = useShadowStore((s) => s.user);
  const stats = useShadowStore((s) => s.stats);
  const currentState = useShadowStore((s) => s.currentState);
  const streak = useShadowStore((s) => s.streak);
  const combo = useShadowStore((s) => s.combo);
  const todayXP = useShadowStore((s) => s.todayXP);
  const activeQuests = useActiveQuests();
  const buffs = useActiveBuffs();
  const debuffs = useActiveDebuffs();
  const isOverwhelmed = useIsOverwhelmed();
  const xpProgress = useXPProgress();
  const systemRules = useSystemRules();
  const syncError = useShadowStore((s) => s.syncError);

  // #6 FIX: Use systemRules to limit visible quests and pick main quest
  const visibleQuests = activeQuests.slice(0, systemRules.maxVisibleTasks);
  const mainQuest = systemRules.sortMode === 'easy_first'
    ? visibleQuests.find((q) => q.difficultyScore <= 2) || visibleQuests[0]
    : visibleQuests.find((q) => q.priority === 'high' || q.priority === 'critical') || visibleQuests[0];
  const todayBattles = visibleQuests.slice(0, 4);
  const rankColor = RANK_THRESHOLDS[user.rank]?.color || COLORS.text;

  // Glow animation for main quest
  const glowOpacity = useSharedValue(0.3);
  React.useEffect(() => {
    // #10 FIX: Skip animation if systemRules says suppress
    if (systemRules.suppressAnimations) return;
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true
    );
    // #10 FIX: Cancel infinite animation on unmount
    return () => cancelAnimation(glowOpacity);
  }, [systemRules.suppressAnimations]);

  const mainQuestGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowOpacity.value,
    borderColor: `rgba(255,23,68,${glowOpacity.value})`,
  }));

  // ── Overwhelmed Mode: Simplified UI ──
  if (isOverwhelmed) {
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.overwhelmedContainer}>
          <Animated.View entering={FadeIn.duration(600)}>
            <Text style={[FONTS.label, { color: COLORS.red, textAlign: 'center' }]}>
              OVERWHELM DETECTED
            </Text>
            <Text style={[FONTS.display, { color: COLORS.text, textAlign: 'center', marginTop: 12 }]}>
              Breathe.
            </Text>
            <Text style={[FONTS.body, { color: COLORS.textSecondary, textAlign: 'center', marginTop: 8 }]}>
              You only need to do one thing.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).duration(600)}>
            <GlassPanel style={{ marginTop: 30 }}>
              <Text style={[FONTS.label, { color: COLORS.cyan }]}>NEXT ACTION</Text>
              <Text style={[FONTS.bodyLarge, { color: COLORS.text, marginTop: 8 }]}>
                {mainQuest?.title || 'Take a 2-minute breath'}
              </Text>
            </GlassPanel>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(600).duration(600)} style={{ marginTop: 20 }}>
            <ActionButton
              onPress={() => nav.navigate('RescueMode')}
              color={COLORS.red}
              fullWidth
              icon="🆘"
              size="lg"
            >
              RESCUE MODE
            </ActionButton>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  // ── Normal Dashboard ──
  return (
    <View style={styles.screen}>
      {/* #8 FIX: Offline banner */}
      <OfflineBanner visible={!!syncError} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Profile Header ── */}
        <Animated.View entering={FadeIn.duration(400)}>
          <GlassPanel style={styles.profileCard}>
            <View style={styles.profileRow}>
              {/* Avatar */}
              <View style={[styles.avatar, { borderColor: `${rankColor}55` }]}>
                <LinearGradient
                  colors={[`${COLORS.cyan}33`, `${COLORS.purple}33`]}
                  style={styles.avatarGradient}
                >
                  <Text style={{ fontSize: 30 }}>🗡️</Text>
                </LinearGradient>
              </View>

              {/* Info */}
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={[FONTS.displaySmall, { color: COLORS.text, fontSize: 18 }]}>
                    {user.characterName}
                  </Text>
                  <Text style={[FONTS.label, { color: COLORS.gold }]}>Lv.{user.level}</Text>
                </View>

                <View style={styles.rankRow}>
                  <RankBadge rank={user.rank} color={rankColor} size="sm" />
                  <Text style={[FONTS.bodySmall, { color: COLORS.textSecondary }]}>
                    {Math.round(xpProgress.percentage)}%
                  </Text>
                </View>

                <XPBar
                  current={xpProgress.current}
                  max={xpProgress.total}
                  showLabel={false}
                  height={6}
                />
              </View>
            </View>
          </GlassPanel>
        </Animated.View>

        {/* ── State Orbs ── */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.orbRow}>
          <StatOrb label="Energy" value={currentState.energy * 20} color={COLORS.cyan} icon="⚡" />
          <StatOrb label="Focus" value={currentState.focus * 20} color={COLORS.gold} icon="🎯" />
          <View style={styles.orbContainer}>
            <View style={[styles.buffOrb, {
              borderColor: buffs.length > 0 ? `${COLORS.green}66` : `${COLORS.textDim}44`,
            }]}>
              <Text style={{ fontSize: 20 }}>
                {buffs.length > 0 ? buffs[0].icon : '💤'}
              </Text>
            </View>
            <Text style={[FONTS.labelSmall, {
              color: buffs.length > 0 ? COLORS.green : COLORS.textDim, marginTop: 4,
            }]}>
              {buffs.length > 0 ? buffs[0].name : 'No Buff'}
            </Text>
            <Text style={[styles.orbLabel]}>Status</Text>
          </View>
        </Animated.View>

        {/* ── Main Quest Card ── */}
        {mainQuest && (
          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <Animated.View style={[styles.mainQuestWrapper, mainQuestGlowStyle]}>
              <GlassPanel
                onPress={() => nav.navigate('QuestDetail', { questId: mainQuest.id })}
                glowColor={COLORS.red}
                glow
              >
                <View style={styles.mainQuestHeader}>
                  <Text style={[FONTS.label, { color: COLORS.red }]}>MAIN QUEST</Text>
                  {mainQuest.questType === 'boss' && (
                    <Text style={[FONTS.labelSmall, { color: COLORS.gold }]}>👹 BOSS</Text>
                  )}
                </View>

                <Text style={[FONTS.displaySmall, { color: COLORS.text, marginTop: 8, fontSize: 20 }]}>
                  {mainQuest.title}
                </Text>

                <View style={styles.mainQuestMeta}>
                  <Text style={[FONTS.bodySmall, { color: COLORS.textSecondary }]}>
                    ⏱ {mainQuest.estimatedMinutes} min
                  </Text>
                  <Text style={[FONTS.bodySmall, { color: COLORS.gold }]}>
                    🏆 {mainQuest.xpReward} XP
                  </Text>
                  <DifficultyIndicator level={mainQuest.difficultyScore} />
                </View>

                <ActionButton
                  onPress={() => nav.navigate('FocusMode', { questId: mainQuest.id })}
                  color={COLORS.red}
                  fullWidth
                  icon="⚔️"
                  size="lg"
                  style={{ marginTop: 16 }}
                >
                  BEGIN ASSAULT
                </ActionButton>
              </GlassPanel>
            </Animated.View>
          </Animated.View>
        )}

        {/* ── Quick Actions ── */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.quickActions}>
          {[
            { icon: '🧠', label: 'Brain\nDump', screen: 'BrainDump' },
            { icon: '🆘', label: 'Rescue\nMode', screen: 'RescueMode' },
            { icon: '📖', label: 'Battle\nLog', screen: 'BattleLog' },
            { icon: '📊', label: 'Intel\nReport', screen: 'Insights' },
          ].map((action, i) => (
            <Animated.View key={action.label} entering={FadeInRight.delay(300 + i * 80).duration(300)}>
              <Pressable
                onPress={() => nav.navigate(action.screen)}
                style={styles.quickActionBtn}
              >
                <Text style={{ fontSize: 24 }}>{action.icon}</Text>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </Pressable>
            </Animated.View>
          ))}
        </Animated.View>

        {/* ── Today's Battles ── */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)}>
          <SectionHeader title="TODAY'S BATTLES" action="View All" onAction={() => nav.navigate('MainTabs', { screen: 'Quests' })} />

          {todayBattles.map((quest, index) => (
            <Animated.View key={quest.id} entering={SlideInRight.delay(450 + index * 60).duration(300)}>
              <GlassPanel
                onPress={() => nav.navigate('QuestDetail', { questId: quest.id })}
                style={styles.battleCard}
                borderLeft={CATEGORY_META[quest.category]?.color || COLORS.cyan}
              >
                <View style={styles.battleRow}>
                  <View style={styles.battleInfo}>
                    <Text style={{ fontSize: 18 }}>
                      {quest.questType === 'boss' ? '👹' : CATEGORY_META[quest.category]?.icon || '⚔️'}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[FONTS.bodyLarge, { color: COLORS.text }]}>{quest.title}</Text>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                        <DifficultyIndicator level={quest.difficultyScore} />
                        <Text style={[FONTS.bodySmall, { color: COLORS.textSecondary, fontSize: 12 }]}>
                          {quest.estimatedMinutes}min
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[FONTS.label, { color: COLORS.gold, fontSize: 14 }]}>
                      {quest.xpReward}
                    </Text>
                    <Text style={[FONTS.bodySmall, { color: COLORS.textSecondary, fontSize: 11 }]}>XP</Text>
                  </View>
                </View>
              </GlassPanel>
            </Animated.View>
          ))}
        </Animated.View>

        {/* ── Streak Widget ── */}
        <Animated.View entering={FadeInDown.delay(600).duration(400)}>
          <GlassPanel style={styles.streakCard}>
            <View style={styles.streakRow}>
              <View>
                <Text style={[FONTS.bodySmall, { color: COLORS.textSecondary }]}>Current Streak</Text>
                <Text style={[FONTS.numberLarge, { color: COLORS.gold, fontSize: 36 }]}>{streak}</Text>
                <Text style={[FONTS.bodySmall, { color: COLORS.textSecondary }]}>Days</Text>
              </View>
              <Text style={{ fontSize: 48 }}>🔥</Text>
            </View>
            {combo > 0 && (
              <View style={styles.comboRow}>
                <Text style={[FONTS.labelSmall, { color: COLORS.orange }]}>
                  COMBO x{combo} · +{Math.min(combo * 5, 30)}% XP
                </Text>
              </View>
            )}
          </GlassPanel>
        </Animated.View>

        {/* ── Active Debuffs ── */}
        {debuffs.length > 0 && (
          <Animated.View entering={FadeInDown.delay(700).duration(400)}>
            <SectionHeader title="ACTIVE DEBUFFS" />
            <View style={styles.debuffRow}>
              {debuffs.map((d) => (
                <View key={d.id} style={[styles.debuffChip, { borderColor: `${d.color}44` }]}>
                  <Text style={{ fontSize: 16 }}>{d.icon}</Text>
                  <Text style={[FONTS.bodySmall, { color: d.color, fontSize: 12 }]}>{d.name}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Bottom spacer for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    padding: SPACING.xl,
    paddingTop: 60,
  },
  overwhelmedContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.xxxl,
  },
  profileCard: {
    marginBottom: SPACING.lg,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    overflow: 'hidden',
  },
  avatarGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  orbRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.lg,
  },
  orbContainer: {
    alignItems: 'center',
    gap: 2,
  },
  buffOrb: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,230,118,0.08)',
  },
  orbLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  mainQuestWrapper: {
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.xl,
    shadowColor: COLORS.red,
    shadowRadius: 16,
    elevation: 8,
  },
  mainQuestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mainQuestMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  quickActionBtn: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    alignItems: 'center',
    gap: 6,
  },
  quickActionLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    color: COLORS.text,
    lineHeight: 14,
  },
  battleCard: {
    marginBottom: SPACING.sm,
    padding: SPACING.lg,
  },
  battleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  battleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  streakCard: {
    marginTop: SPACING.sm,
  },
  streakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  comboRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.glassBorder,
  },
  debuffRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  debuffChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
});
