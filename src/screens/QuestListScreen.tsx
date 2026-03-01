// ═══════════════════════════════════════════════════
// QUEST LIST SCREEN — All active quests with filters
// ═══════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
} from 'react-native';
import Animated, { FadeInDown, SlideInRight, FadeIn } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { GlassPanel } from '../components/GlassPanel';
import {
  TabBar, Chip, ActionButton, DifficultyIndicator, SectionHeader, EmptyState,
} from '../components/UIKit';
import { COLORS, SPACING, FONTS, RADIUS, CATEGORY_META } from '../constants/theme';
import { useShadowStore, useActiveQuests, useBossQuests, useSystemRules } from '../store/useShadowStore';
import { ScreenEmpty } from '../components/ErrorBoundary';
import type { Quest } from '../types';

const TABS = ['Today', 'Upcoming', 'Bosses', 'Recurring', 'Campaigns'];
const FILTERS = ['Low Energy', 'Quick Wins', 'High Priority', 'Urgent'];

export default function QuestListScreen() {
  const nav = useNavigation<any>();
  const allQuests = useShadowStore((s) => s.quests);
  const systemRules = useSystemRules();
  const [activeTab, setActiveTab] = useState('Today');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const toggleFilter = (f: string) => {
    setActiveFilters((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
  };

  const filtered = useMemo(() => {
    let quests = allQuests.filter((q) => q.status === 'active' || q.status === 'in_progress');

    // Tab filters
    switch (activeTab) {
      case 'Bosses':
        quests = quests.filter((q) => q.questType === 'boss');
        break;
      case 'Recurring':
        quests = quests.filter((q) => q.questType === 'recurring');
        break;
      case 'Upcoming':
        quests = quests.filter((q) => q.scheduledFor);
        break;
    }

    // Chip filters
    if (activeFilters.includes('Low Energy')) {
      quests = quests.filter((q) => q.difficultyScore <= 2);
    }
    if (activeFilters.includes('Quick Wins')) {
      quests = quests.filter((q) => q.estimatedMinutes <= 15);
    }
    if (activeFilters.includes('High Priority')) {
      quests = quests.filter((q) => q.priority === 'high' || q.priority === 'critical');
    }
    if (activeFilters.includes('Urgent')) {
      quests = quests.filter((q) => q.priority === 'critical');
    }

    // #6 FIX: Sort based on systemRules.sortMode
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    switch (systemRules.sortMode) {
      case 'easy_first':
        quests.sort((a, b) => a.difficultyScore - b.difficultyScore);
        break;
      case 'urgent_first':
        quests.sort((a, b) => {
          const pa = priorityOrder[a.priority] ?? 2;
          const pb = priorityOrder[b.priority] ?? 2;
          if (pa !== pb) return pa - pb;
          // Then by due date
          if (a.dueAt && b.dueAt) return a.dueAt.localeCompare(b.dueAt);
          if (a.dueAt) return -1;
          return 0;
        });
        break;
      default: // 'priority'
        quests.sort((a, b) => {
          const pa = priorityOrder[a.priority] ?? 2;
          const pb = priorityOrder[b.priority] ?? 2;
          return pa - pb;
        });
    }

    return quests;
  }, [allQuests, activeTab, activeFilters, systemRules.sortMode]);

  const renderQuestCard = (quest: Quest, index: number) => {
    const catMeta = CATEGORY_META[quest.category] || { icon: '⚔️', color: COLORS.cyan, label: quest.category };
    const isBoss = quest.questType === 'boss';

    return (
      <Animated.View
        key={quest.id}
        entering={SlideInRight.delay(index * 50).duration(300)}
      >
        <GlassPanel
          onPress={() => nav.navigate('QuestDetail', { questId: quest.id })}
          borderLeft={catMeta.color}
          style={styles.questCard}
          padding={16}
        >
          <View style={styles.questRow}>
            <View style={styles.questInfo}>
              <View style={styles.questTitleRow}>
                <Text style={{ fontSize: 16 }}>
                  {isBoss ? '👹' : catMeta.icon}
                </Text>
                <Text
                  style={[FONTS.bodyLarge, { color: COLORS.text, flex: 1 }]}
                  numberOfLines={1}
                >
                  {quest.title}
                </Text>
                {isBoss && (
                  <View style={[styles.bossTag, { borderColor: `${COLORS.red}44` }]}>
                    <Text style={[FONTS.labelSmall, { color: COLORS.red, fontSize: 9 }]}>BOSS</Text>
                  </View>
                )}
              </View>

              {/* Meta row */}
              <View style={styles.metaRow}>
                <View style={[styles.categoryChip, { backgroundColor: `${catMeta.color}15`, borderColor: `${catMeta.color}33` }]}>
                  <Text style={{ fontSize: 10, color: catMeta.color, fontWeight: '600' }}>{catMeta.label}</Text>
                </View>
                <Text style={styles.metaText}>⏱ {quest.estimatedMinutes}min</Text>
                <DifficultyIndicator level={quest.difficultyScore} />
              </View>

              {/* Friction bar */}
              <View style={styles.frictionRow}>
                <Text style={styles.frictionLabel}>Friction</Text>
                <View style={styles.frictionTrack}>
                  <View
                    style={[
                      styles.frictionFill,
                      {
                        width: `${quest.frictionScore * 20}%`,
                        backgroundColor: quest.frictionScore > 3 ? COLORS.red : quest.frictionScore > 2 ? COLORS.gold : COLORS.green,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>

            {/* XP */}
            <View style={styles.xpCol}>
              <Text style={[FONTS.number, { color: COLORS.gold, fontSize: 16 }]}>
                {quest.xpReward}
              </Text>
              <Text style={[FONTS.bodySmall, { color: COLORS.textSecondary, fontSize: 11 }]}>XP</Text>
            </View>
          </View>
        </GlassPanel>
      </Animated.View>
    );
  };

  return (
    <View style={styles.screen}>
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <Text style={[FONTS.displaySmall, { color: COLORS.text, textAlign: 'center' }]}>
          QUEST LOG
        </Text>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Tabs */}
        <TabBar tabs={TABS} active={activeTab} onSelect={setActiveTab} />

        {/* Filters */}
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <Chip
              key={f}
              label={f}
              active={activeFilters.includes(f)}
              onPress={() => toggleFilter(f)}
            />
          ))}
        </View>

        {/* Quest List */}
        {filtered.length === 0 ? (
          <EmptyState
            icon="🏰"
            title="No quests found"
            subtitle="Try changing your filters or add a new quest"
          />
        ) : (
          filtered.map((quest, index) => renderQuestCard(quest, index))
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* FAB — Add Quest */}
      <Pressable
        onPress={() => nav.navigate('BrainDump')}
        style={styles.fab}
      >
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: '300' }}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingTop: 60,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  questCard: {
    marginBottom: SPACING.sm,
  },
  questRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  questInfo: {
    flex: 1,
    marginRight: 12,
  },
  questTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bossTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    backgroundColor: `${COLORS.red}11`,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  metaText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  categoryChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  frictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  frictionLabel: {
    fontSize: 10,
    color: COLORS.textDim,
  },
  frictionTrack: {
    width: 60,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
  },
  frictionFill: {
    height: '100%',
    borderRadius: 2,
  },
  xpCol: {
    alignItems: 'flex-end',
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.red,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.red,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
