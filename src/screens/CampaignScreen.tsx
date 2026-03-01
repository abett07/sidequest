// ═══════════════════════════════════════════════════
// CAMPAIGN DETAIL SCREEN — Multi-day arcs
// ═══════════════════════════════════════════════════

import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { GlassPanel } from '../components/GlassPanel';
import { XPBar, ActionButton, ProgressRing } from '../components/UIKit';
import { COLORS, SPACING, FONTS, RADIUS } from '../constants/theme';

// Demo data — in prod this comes from store/supabase
const CAMPAIGN = {
  title: 'Job Hunt Gate',
  week: 3,
  progress: 68,
  mainBoss: { name: 'Final Interview Monarch', icon: '👹' },
  sideQuests: [
    { title: 'Resume Update', done: true },
    { title: 'Mock Interview', done: true },
    { title: 'Mock Interview #2', done: false },
    { title: '5 Applications', done: false },
    { title: 'Recruiter Follow-up', done: false },
  ],
  milestones: [
    { label: 'Week 1', done: true },
    { label: 'Jump', done: true },
    { label: 'Week 2', done: true },
    { label: 'Week 3', done: false },
    { label: 'Saps', done: false },
  ],
  risk: 'low' as const,
};

const riskColors = { low: COLORS.green, medium: COLORS.gold, high: COLORS.red };

export function CampaignScreen() {
  const nav = useNavigation<any>();

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()} style={styles.backBtn}>
          <Text style={{ color: COLORS.text, fontSize: 16 }}>‹</Text>
        </Pressable>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={[FONTS.displaySmall, { color: COLORS.text }]}>Campaign Arc</Text>
          <Text style={[FONTS.bodyLarge, { color: COLORS.gold, marginTop: 4 }]}>
            {CAMPAIGN.title} – Week {CAMPAIGN.week}
          </Text>
        </Animated.View>

        {/* Progress + Boss Row */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.heroRow}>
          {/* Progress Ring */}
          <View style={{ alignItems: 'center' }}>
            <ProgressRing progress={CAMPAIGN.progress} size={120} strokeWidth={8} color={COLORS.cyan}>
              <Text style={[FONTS.number, { color: COLORS.cyan, fontSize: 28 }]}>
                {CAMPAIGN.progress}%
              </Text>
            </ProgressRing>
            <Text style={[FONTS.bodySmall, { color: COLORS.textSecondary, marginTop: 6 }]}>Progress</Text>
          </View>

          {/* Main Boss Card */}
          <GlassPanel glow glowColor={COLORS.purple} style={styles.bossCard} padding={16}>
            <Text style={[FONTS.labelSmall, { color: COLORS.textSecondary, textAlign: 'center' }]}>
              MAIN BOSS
            </Text>
            <View style={styles.bossIconArea}>
              <Text style={{ fontSize: 40 }}>{CAMPAIGN.mainBoss.icon}</Text>
            </View>
            <Text style={[FONTS.body, { color: COLORS.purple, textAlign: 'center', fontWeight: '700', fontSize: 14 }]}>
              {CAMPAIGN.mainBoss.name}
            </Text>
          </GlassPanel>
        </Animated.View>

        {/* Side Quests */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <Text style={[FONTS.label, { color: COLORS.text, marginBottom: 10 }]}>SIDE QUESTS</Text>
          {CAMPAIGN.sideQuests.map((sq, i) => (
            <View key={i} style={styles.sideQuestRow}>
              <View style={[styles.sqCheck, {
                borderColor: sq.done ? COLORS.green : COLORS.textDim,
                backgroundColor: sq.done ? `${COLORS.green}22` : 'transparent',
              }]}>
                {sq.done && <Text style={{ fontSize: 12, color: COLORS.green }}>✓</Text>}
              </View>
              <Text style={[FONTS.body, {
                color: sq.done ? COLORS.textSecondary : COLORS.text,
                textDecorationLine: sq.done ? 'line-through' : 'none',
              }]}>
                {sq.title}
              </Text>
              <Pressable style={styles.sqArrow}>
                <Text style={{ color: COLORS.textDim, fontSize: 16 }}>›</Text>
              </Pressable>
            </View>
          ))}
        </Animated.View>

        {/* Milestone Timeline */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={{ marginTop: 20 }}>
          <Text style={[FONTS.label, { color: COLORS.text, marginBottom: 12 }]}>MILESTONES</Text>
          <View style={styles.milestoneRow}>
            {CAMPAIGN.milestones.map((m, i) => (
              <React.Fragment key={i}>
                <View style={styles.milestoneNode}>
                  <View style={[styles.milestoneCircle, {
                    borderColor: m.done ? COLORS.green : COLORS.textDim,
                    backgroundColor: m.done ? `${COLORS.green}33` : 'rgba(255,255,255,0.03)',
                  }]}>
                    <Text style={[FONTS.labelSmall, { color: m.done ? COLORS.green : COLORS.textDim, fontSize: 10 }]}>
                      {i + 1}
                    </Text>
                  </View>
                  <Text style={[FONTS.bodySmall, {
                    color: m.done ? COLORS.textSecondary : COLORS.textDim,
                    fontSize: 10, textAlign: 'center', marginTop: 4,
                  }]}>
                    {m.label}
                  </Text>
                </View>
                {i < CAMPAIGN.milestones.length - 1 && (
                  <View style={[styles.milestoneLine, {
                    backgroundColor: m.done ? `${COLORS.green}55` : COLORS.textDim,
                  }]} />
                )}
              </React.Fragment>
            ))}
          </View>
        </Animated.View>

        {/* Risk Gauge */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)}>
          <GlassPanel style={{ marginTop: 16 }} padding={14}>
            <View style={styles.riskRow}>
              <Text style={[FONTS.label, { color: COLORS.text }]}>RISK</Text>
              <View style={styles.riskBarTrack}>
                <View style={[styles.riskBarFill, {
                  width: CAMPAIGN.risk === 'low' ? '30%' : CAMPAIGN.risk === 'medium' ? '60%' : '90%',
                  backgroundColor: riskColors[CAMPAIGN.risk],
                }]} />
              </View>
              <Text style={[FONTS.bodySmall, {
                color: riskColors[CAMPAIGN.risk],
                fontWeight: '700',
                textTransform: 'capitalize',
              }]}>
                {CAMPAIGN.risk} Risk
              </Text>
            </View>
          </GlassPanel>
        </Animated.View>

        {/* Advance Arc */}
        <Animated.View entering={FadeInDown.delay(500).duration(400)} style={{ marginTop: 20 }}>
          <ActionButton
            onPress={() => {}}
            color={COLORS.gold}
            fullWidth
            icon="⚡"
            size="lg"
          >
            ADVANCE ARC
          </ActionButton>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: SPACING.xl, paddingBottom: SPACING.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: RADIUS.md,
    backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  content: { paddingHorizontal: SPACING.xl },
  heroRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 20, gap: 16,
  },
  bossCard: { flex: 1, alignItems: 'center' },
  bossIconArea: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: `${COLORS.purple}15`, borderWidth: 2, borderColor: `${COLORS.purple}33`,
    alignItems: 'center', justifyContent: 'center', marginVertical: 8,
  },
  sideQuestRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: RADIUS.md, marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1, borderColor: COLORS.glassBorder,
  },
  sqCheck: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  sqArrow: { marginLeft: 'auto' },
  milestoneRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center' },
  milestoneNode: { alignItems: 'center', width: 52 },
  milestoneCircle: {
    width: 30, height: 30, borderRadius: 15, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  milestoneLine: { width: 16, height: 2, marginTop: 14, borderRadius: 1 },
  riskRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  riskBarTrack: {
    flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3,
  },
  riskBarFill: { height: '100%', borderRadius: 3 },
});
