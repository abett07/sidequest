// ═══════════════════════════════════════════════════
// SKILL TREE SCREEN — Functional version
// Fix #4: Connected to store, real unlock logic
// ═══════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, FONTS, RADIUS } from '../constants/theme';
import { useShadowStore } from '../store/useShadowStore';
import { GlassPanel } from '../components/GlassPanel';
import { ActionButton } from '../components/UIKit';
import { ScreenEmpty } from '../components/ErrorBoundary';

// ─── Seed nodes (used when store.skillNodes is empty — mirrors DB seed) ───
const SEED_NODES = [
  { id: 'focus_1',       key: 'focus_1',       branch: 'focus',       title: 'Sharp Eye',        description: 'Start 10 tasks within 2 min',           statBonus: { focus: 5 },           icon: '🎯', level: 1, requires: [] },
  { id: 'focus_2',       key: 'focus_2',       branch: 'focus',       title: 'First Step Master', description: 'Start 20 tasks within 2 min',           statBonus: { focus: 15 },          icon: '🎯', level: 2, requires: ['focus_1'] },
  { id: 'consistency_1', key: 'consistency_1', branch: 'consistency', title: 'Streak Starter',    description: 'Maintain a 3-day streak',                statBonus: { discipline: 5 },      icon: '🔁', level: 1, requires: [] },
  { id: 'consistency_2', key: 'consistency_2', branch: 'consistency', title: 'Iron Will',         description: 'Maintain a 14-day streak',               statBonus: { discipline: 15 },     icon: '🔁', level: 2, requires: ['consistency_1'] },
  { id: 'recovery_1',    key: 'recovery_1',    branch: 'recovery',    title: 'Phoenix Down',      description: 'Use rescue mode 5 times',                statBonus: { recovery: 10 },       icon: '🌿', level: 1, requires: [] },
  { id: 'recovery_2',    key: 'recovery_2',    branch: 'recovery',    title: 'Second Wind',       description: 'Complete 3 tasks after rescue',           statBonus: { recovery: 15 },       icon: '🌿', level: 2, requires: ['recovery_1'] },
  { id: 'order_1',       key: 'order_1',       branch: 'order',       title: 'Planner',           description: 'Complete 10 tasks with all steps done',   statBonus: { clarity: 8 },         icon: '📋', level: 1, requires: [] },
  { id: 'confidence_1',  key: 'confidence_1',  branch: 'confidence',  title: 'Boss Slayer',       description: 'Defeat 3 boss quests',                   statBonus: { courage: 8 },         icon: '🦁', level: 1, requires: [] },
  { id: 'execution_1',   key: 'execution_1',   branch: 'execution',   title: 'Dungeon Runner',    description: 'Complete 10 focus sessions (25+ min)',    statBonus: { focus: 5, discipline: 5 }, icon: '⚡', level: 1, requires: [] },
  { id: 'mastery',       key: 'mastery',       branch: 'execution',   title: 'Shadow Monarch',    description: 'Reach Level 50',                         statBonus: { focus: 10, discipline: 10, courage: 10 }, icon: '👑', level: 3, requires: ['focus_2', 'consistency_2', 'execution_1'] },
] as const;

type NodeState = 'locked' | 'available' | 'unlocked';

const branchColors: Record<string, string> = {
  focus: COLORS.gold,
  consistency: COLORS.gold,
  recovery: COLORS.cyan,
  execution: COLORS.cyan,
  order: COLORS.red,
  confidence: COLORS.red,
};

export function SkillTreeScreen() {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const level = useShadowStore((s) => s.user.level);
  const storeNodes = useShadowStore((s) => s.skillNodes);
  const unlockedSkills = useShadowStore((s) => s.unlockedSkills);
  const unlockSkillNode = useShadowStore((s) => s.unlockSkillNode);
  const stats = useShadowStore((s) => s.stats);

  // Use seed nodes if store is empty (before DB sync)
  const nodes = storeNodes.length > 0 ? storeNodes : SEED_NODES as any[];
  const unlockedKeys = new Set(unlockedSkills.map((us) => us.skillNodeId));

  // Compute state for each node
  const nodeStates = useMemo(() => {
    const map = new Map<string, NodeState>();
    for (const node of nodes) {
      if (unlockedKeys.has(node.id) || unlockedKeys.has(node.key)) {
        map.set(node.key, 'unlocked');
      } else {
        // Check prerequisites
        const prereqs = node.requires || [];
        const allPrereqsMet = prereqs.every((req: string) =>
          unlockedKeys.has(req) || unlockedKeys.has(nodes.find((n: any) => n.key === req)?.id)
        );
        // Check level requirement
        const levelMet = level >= (node.level || 1) * 5; // level 1 = need lvl 5, level 2 = need lvl 10, etc.
        map.set(node.key, allPrereqsMet && levelMet ? 'available' : 'locked');
      }
    }
    return map;
  }, [nodes, unlockedKeys, level]);

  const selected = nodes.find((n: any) => n.key === selectedKey);
  const selectedState = selectedKey ? nodeStates.get(selectedKey) : null;
  const totalUnlocked = unlockedSkills.length;
  const totalNodes = nodes.length;

  const handleUnlock = () => {
    if (!selected || selectedState !== 'available') return;
    Alert.alert(
      `Unlock "${selected.title}"?`,
      `This will grant: ${formatStatBonus(selected.statBonus)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlock',
          onPress: () => {
            unlockSkillNode(selected.id || selected.key);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setSelectedKey(null);
          },
        },
      ]
    );
  };

  // Group nodes by tier (level)
  const tiers = useMemo(() => {
    const tierMap = new Map<number, typeof nodes>();
    for (const node of nodes) {
      const tier = node.level || 1;
      if (!tierMap.has(tier)) tierMap.set(tier, []);
      tierMap.get(tier)!.push(node);
    }
    return Array.from(tierMap.entries()).sort((a, b) => a[0] - b[0]);
  }, [nodes]);

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[FONTS.displaySmall, { color: COLORS.text }]}>Shadow Sovereign Core</Text>
        <Text style={[FONTS.bodySmall, { color: COLORS.textSecondary, marginTop: 4 }]}>
          {totalUnlocked}/{totalNodes} nodes unlocked
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tiers */}
        {tiers.map(([tier, tierNodes], ti) => (
          <Animated.View key={tier} entering={FadeInDown.delay(ti * 80).duration(300)}>
            {/* Connector line */}
            {ti > 0 && <View style={styles.connector} />}

            <View style={styles.tierRow}>
              {tierNodes.map((node: any, ni: number) => {
                const state = nodeStates.get(node.key) || 'locked';
                const color = branchColors[node.branch] || COLORS.cyan;
                const isSelected = selectedKey === node.key;

                return (
                  <Pressable
                    key={node.key}
                    onPress={() => setSelectedKey(isSelected ? null : node.key)}
                    style={[
                      styles.nodeBtn,
                      {
                        borderColor: state === 'unlocked' ? color
                          : state === 'available' ? `${color}88`
                          : COLORS.textDim,
                        backgroundColor: state === 'unlocked' ? `${color}22`
                          : state === 'available' ? `${color}08`
                          : 'rgba(255,255,255,0.02)',
                        shadowColor: state === 'unlocked' ? color : 'transparent',
                        shadowOpacity: state === 'unlocked' ? 0.4 : 0,
                        shadowRadius: state === 'unlocked' ? 12 : 0,
                      },
                      isSelected && { borderWidth: 2 },
                    ]}
                  >
                    {state === 'locked' ? (
                      <Text style={{ fontSize: 20, opacity: 0.3 }}>🔒</Text>
                    ) : (
                      <Text style={{ fontSize: 22 }}>{node.icon}</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Branch labels */}
            <View style={[styles.tierRow, { marginTop: 4 }]}>
              {tierNodes.map((node: any) => (
                <Text key={node.key} style={[FONTS.bodySmall, {
                  color: (nodeStates.get(node.key) || 'locked') !== 'locked'
                    ? branchColors[node.branch] || COLORS.text
                    : COLORS.textDim,
                  textAlign: 'center',
                  width: 72,
                  fontSize: 10,
                }]}>
                  {node.title}
                </Text>
              ))}
            </View>
          </Animated.View>
        ))}

        {/* Selected node detail card */}
        {selected && (
          <Animated.View entering={FadeIn.duration(200)} style={{ marginTop: 20 }}>
            <GlassPanel glow glowColor={branchColors[selected.branch] || COLORS.cyan}>
              <Text style={[FONTS.label, { color: branchColors[selected.branch] || COLORS.cyan }]}>
                {selected.title}
              </Text>
              <Text style={[FONTS.body, { color: COLORS.text, marginTop: 6 }]}>
                {selected.description}
              </Text>
              <Text style={[FONTS.bodySmall, { color: COLORS.gold, marginTop: 8 }]}>
                Grants: {formatStatBonus(selected.statBonus)}
              </Text>
              <Text style={[FONTS.bodySmall, { color: COLORS.textSecondary, marginTop: 4 }]}>
                Requires: Level {(selected.level || 1) * 5}
                {selected.requires?.length > 0
                  ? ` + ${selected.requires.map((r: string) => nodes.find((n: any) => n.key === r)?.title || r).join(', ')}`
                  : ''}
              </Text>

              {selectedState === 'available' && (
                <ActionButton
                  onPress={handleUnlock}
                  color={branchColors[selected.branch] || COLORS.cyan}
                  fullWidth
                  icon="⚡"
                  style={{ marginTop: 12 }}
                >
                  UNLOCK NODE
                </ActionButton>
              )}

              {selectedState === 'unlocked' && (
                <View style={[styles.unlockedBadge, { borderColor: `${branchColors[selected.branch]}55` }]}>
                  <Text style={[FONTS.label, { color: COLORS.green, fontSize: 12 }]}>✓ UNLOCKED</Text>
                </View>
              )}

              {selectedState === 'locked' && (
                <View style={[styles.unlockedBadge, { borderColor: `${COLORS.textDim}33` }]}>
                  <Text style={[FONTS.label, { color: COLORS.textDim, fontSize: 12 }]}>🔒 LOCKED</Text>
                </View>
              )}
            </GlassPanel>
          </Animated.View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

function formatStatBonus(bonus: Record<string, number> | undefined): string {
  if (!bonus) return 'None';
  return Object.entries(bonus)
    .map(([stat, val]) => `+${val} ${stat.charAt(0).toUpperCase() + stat.slice(1)}`)
    .join(', ');
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingTop: 56, paddingHorizontal: SPACING.xl, paddingBottom: SPACING.md,
    alignItems: 'center',
  },
  content: { paddingHorizontal: SPACING.xl, alignItems: 'center' },
  tierRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 16, flexWrap: 'wrap',
  },
  connector: {
    width: 2, height: 20, backgroundColor: COLORS.glassBorder,
    alignSelf: 'center', marginVertical: 4,
  },
  nodeBtn: {
    width: 56, height: 56, borderRadius: 14,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
    elevation: 4,
  },
  unlockedBadge: {
    marginTop: 12, paddingVertical: 6, paddingHorizontal: 16,
    borderRadius: RADIUS.md, borderWidth: 1, alignSelf: 'center',
  },
});
