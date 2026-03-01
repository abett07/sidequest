// ═══════════════════════════════════════════════════
// BATTLE LOG — Phase 4 Narrative Screen
// Shows quest completions, boss defeats, rank-ups,
// daily summaries, weekly arcs, and lore events
// ═══════════════════════════════════════════════════

import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { GlassPanel } from '../components/GlassPanel';
import { COLORS, SPACING, FONTS, RADIUS } from '../constants/theme';
import { useShadowStore } from '../store/useShadowStore';
import type { BattleLogEntry, DailyLog, WeeklyArc } from '../types';

// ─── Tabs ───

type TabKey = 'log' | 'daily' | 'arcs';

const TABS: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: 'log', label: 'Battle Log', icon: '⚔️' },
  { key: 'daily', label: 'Daily Reports', icon: '📊' },
  { key: 'arcs', label: 'Weekly Arcs', icon: '📖' },
];

// ─── Lore Flavor Text (random per session) ───

const LORE_HEADERS = [
  "The Shadow Monarch's record of conquest.",
  "Every battle shapes the sovereign's rise.",
  "From E-Rank to Monarch — your journey unfolds.",
  "The system remembers all who dare to arise.",
  "Your shadow army grows with every victory.",
];

// ═══════════════════════════════════════════════════

export function BattleLogScreen() {
  const nav = useNavigation<any>();
  const battleLog = useShadowStore((s) => s.battleLog);
  const dailyLogs = useShadowStore((s) => s.dailyLogs);
  const weeklyArcs = useShadowStore((s) => s.weeklyArcs);
  const currentArc = useShadowStore((s) => s.currentArc);
  const narrativeEvents = useShadowStore((s) => s.narrativeEvents);

  const [tab, setTab] = useState<TabKey>('log');

  const loreHeader = useMemo(() => LORE_HEADERS[Math.floor(Math.random() * LORE_HEADERS.length)], []);

  return (
    <View style={st.screen}>
      {/* Header */}
      <View style={st.header}>
        <Pressable onPress={() => nav.goBack()} style={st.backBtn}>
          <Text style={{ color: COLORS.text, fontSize: 16 }}>‹</Text>
        </Pressable>
        <Text style={[FONTS.displaySmall, { color: COLORS.text, fontSize: 16 }]}>CHRONICLES</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Lore flavor */}
      <Animated.View entering={FadeIn.duration(600)}>
        <Text style={[FONTS.bodySmall, { color: COLORS.textDim, textAlign: 'center', fontStyle: 'italic', paddingHorizontal: SPACING.xl }]}>
          {loreHeader}
        </Text>
      </Animated.View>

      {/* Tabs */}
      <View style={st.tabRow}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            style={[st.tab, tab === t.key && st.tabActive]}
          >
            <Text style={{ fontSize: 14 }}>{t.icon}</Text>
            <Text style={[FONTS.bodySmall, {
              color: tab === t.key ? COLORS.cyan : COLORS.textSecondary,
              fontSize: 11, fontWeight: tab === t.key ? '700' : '400',
            }]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        {tab === 'log' && <BattleLogTab entries={battleLog} events={narrativeEvents} />}
        {tab === 'daily' && <DailyTab logs={dailyLogs} />}
        {tab === 'arcs' && <ArcsTab arcs={weeklyArcs} current={currentArc} />}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════
// BATTLE LOG TAB
// ═══════════════════════════════════════════════════

function BattleLogTab({ entries, events }: { entries: BattleLogEntry[]; events: any[] }) {
  if (entries.length === 0 && events.length === 0) {
    return (
      <EmptyState
        icon="🗡️"
        title="No Battles Recorded Yet"
        message="Complete quests and defeat bosses to fill your battle log."
      />
    );
  }

  // Group entries by date
  const grouped = useMemo(() => {
    const groups: Record<string, BattleLogEntry[]> = {};
    for (const e of entries) {
      const date = e.timestamp.slice(0, 10);
      if (!groups[date]) groups[date] = [];
      groups[date].push(e);
    }
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries]);

  return (
    <>
      {grouped.map(([date, dayEntries], gi) => (
        <Animated.View key={date} entering={FadeInDown.delay(gi * 60).duration(300)}>
          {/* Date header */}
          <View style={st.dateHeader}>
            <View style={st.dateLine} />
            <Text style={[FONTS.label, { color: COLORS.textDim, fontSize: 11, paddingHorizontal: 12 }]}>
              {formatDate(date)}
            </Text>
            <View style={st.dateLine} />
          </View>

          {dayEntries.map((entry, i) => (
            <Animated.View key={entry.id} entering={FadeInDown.delay(i * 40).duration(250)}>
              <GlassPanel style={st.logCard} padding={14}>
                <View style={st.logRow}>
                  <View style={[st.logIcon, { backgroundColor: getEntryColor(entry.type) + '22' }]}>
                    <Text style={{ fontSize: 18 }}>{entry.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[FONTS.body, { color: COLORS.text, fontSize: 14 }]}>{entry.title}</Text>
                    <Text style={[FONTS.bodySmall, { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }]}>
                      {entry.description}
                    </Text>
                  </View>
                  {entry.xpEarned ? (
                    <View style={st.xpBadge}>
                      <Text style={[FONTS.bodySmall, { color: COLORS.gold, fontSize: 12, fontWeight: '700' }]}>
                        +{entry.xpEarned}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[FONTS.bodySmall, { color: COLORS.textDim, fontSize: 10, marginTop: 6 }]}>
                  {formatTime(entry.timestamp)}
                </Text>
              </GlassPanel>
            </Animated.View>
          ))}
        </Animated.View>
      ))}
    </>
  );
}

// ═══════════════════════════════════════════════════
// DAILY REPORTS TAB
// ═══════════════════════════════════════════════════

function DailyTab({ logs }: { logs: DailyLog[] }) {
  if (logs.length === 0) {
    return (
      <EmptyState
        icon="📊"
        title="No Daily Reports Yet"
        message="Complete your first day of quests to generate a daily report."
      />
    );
  }

  return (
    <>
      {logs.slice(0, 30).map((log, i) => (
        <Animated.View key={log.id} entering={FadeInDown.delay(i * 50).duration(300)}>
          <GlassPanel style={st.logCard} padding={16}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[FONTS.label, { color: COLORS.cyan }]}>{formatDate(log.logDate)}</Text>
              {log.streakContinued && (
                <View style={st.streakBadge}>
                  <Text style={{ fontSize: 12 }}>🔥</Text>
                  <Text style={[FONTS.bodySmall, { color: COLORS.gold, fontSize: 11 }]}>Streak</Text>
                </View>
              )}
            </View>

            <View style={st.dailyGrid}>
              <DailyStat label="Quests" value={String(log.questsCompleted)} icon="⚔️" />
              <DailyStat label="XP" value={log.xpEarned.toLocaleString()} icon="✨" />
              <DailyStat label="Focus" value={`${log.focusMinutes}m`} icon="🎯" />
            </View>

            {log.mainWin && (
              <View style={st.mainWin}>
                <Text style={{ fontSize: 12 }}>🏆</Text>
                <Text style={[FONTS.bodySmall, { color: COLORS.gold, fontSize: 12 }]}>
                  Main Win: {log.mainWin}
                </Text>
              </View>
            )}

            {log.dominantDebuff && (
              <View style={st.debuffTag}>
                <Text style={{ fontSize: 11 }}>👁️</Text>
                <Text style={[FONTS.bodySmall, { color: COLORS.red, fontSize: 11 }]}>
                  Debuff: {log.dominantDebuff}
                </Text>
              </View>
            )}
          </GlassPanel>
        </Animated.View>
      ))}
    </>
  );
}

function DailyStat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={st.dailyStat}>
      <Text style={{ fontSize: 16 }}>{icon}</Text>
      <Text style={[FONTS.displaySmall, { color: COLORS.text, fontSize: 18 }]}>{value}</Text>
      <Text style={[FONTS.bodySmall, { color: COLORS.textDim, fontSize: 10 }]}>{label}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════
// WEEKLY ARCS TAB
// ═══════════════════════════════════════════════════

function ArcsTab({ arcs, current }: { arcs: WeeklyArc[]; current: WeeklyArc | null }) {
  const all = current ? [current, ...arcs.filter((a) => a.id !== current.id)] : arcs;

  if (all.length === 0) {
    return (
      <EmptyState
        icon="📖"
        title="No Arcs Written Yet"
        message="Complete a full week of quests for the system to generate your first arc."
      />
    );
  }

  return (
    <>
      {all.map((arc, i) => (
        <Animated.View key={arc.id} entering={FadeInDown.delay(i * 60).duration(300)}>
          <GlassPanel
            style={st.logCard}
            padding={16}
            glow={i === 0 && !!current}
            glowColor={COLORS.cyan}
          >
            {i === 0 && current && (
              <View style={st.currentTag}>
                <Text style={[FONTS.bodySmall, { color: COLORS.cyan, fontSize: 10, fontWeight: '700' }]}>CURRENT ARC</Text>
              </View>
            )}
            <Text style={[FONTS.displaySmall, { color: COLORS.gold, fontSize: 18 }]}>{arc.title}</Text>
            <Text style={[FONTS.bodySmall, { color: COLORS.textSecondary, marginTop: 4, fontSize: 12 }]}>
              Week of {formatDate(arc.weekStart)}
            </Text>
            {arc.summary && (
              <Text style={[FONTS.body, { color: COLORS.text, marginTop: 8, lineHeight: 20 }]}>
                {arc.summary}
              </Text>
            )}
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
              {arc.majorWin && (
                <View style={st.arcMeta}>
                  <Text style={{ fontSize: 12 }}>🏆</Text>
                  <Text style={[FONTS.bodySmall, { color: COLORS.gold, fontSize: 11 }]}>{arc.majorWin}</Text>
                </View>
              )}
              {arc.mainBossDefeated && (
                <View style={st.arcMeta}>
                  <Text style={{ fontSize: 12 }}>💀</Text>
                  <Text style={[FONTS.bodySmall, { color: COLORS.red, fontSize: 11 }]}>{arc.mainBossDefeated}</Text>
                </View>
              )}
            </View>
            {arc.riskPattern && (
              <Text style={[FONTS.bodySmall, { color: COLORS.textDim, fontStyle: 'italic', marginTop: 8, fontSize: 11 }]}>
                Risk: {arc.riskPattern}
              </Text>
            )}
          </GlassPanel>
        </Animated.View>
      ))}
    </>
  );
}

// ─── Shared Components ───

function EmptyState({ icon, title, message }: { icon: string; title: string; message: string }) {
  return (
    <Animated.View entering={FadeIn.duration(400)} style={st.empty}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>{icon}</Text>
      <Text style={[FONTS.displaySmall, { color: COLORS.textSecondary, fontSize: 16, textAlign: 'center' }]}>{title}</Text>
      <Text style={[FONTS.bodySmall, { color: COLORS.textDim, textAlign: 'center', marginTop: 8 }]}>{message}</Text>
    </Animated.View>
  );
}

// ─── Helpers ───

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (iso === today.toISOString().slice(0, 10)) return 'Today';
  if (iso === yesterday.toISOString().slice(0, 10)) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function getEntryColor(type: BattleLogEntry['type']): string {
  switch (type) {
    case 'boss_defeat': return COLORS.red;
    case 'rank_up': return COLORS.gold;
    case 'streak_milestone': return COLORS.gold;
    case 'rescue_used': return COLORS.purple;
    case 'skill_unlock': return COLORS.cyan;
    case 'achievement': return COLORS.green;
    case 'daily_summary': return COLORS.cyan;
    default: return COLORS.text;
  }
}

// ─── Styles ───

const st = StyleSheet.create({
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
  content: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.md },
  tabRow: {
    flexDirection: 'row', paddingHorizontal: SPACING.xl, gap: 8, marginTop: 12, marginBottom: 4,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: `${COLORS.cyan}15`, borderColor: `${COLORS.cyan}33`,
  },
  logCard: { marginBottom: 10 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logIcon: {
    width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  xpBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    backgroundColor: `${COLORS.gold}15`, borderWidth: 1, borderColor: `${COLORS.gold}33`,
  },
  dateHeader: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  dateLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dailyGrid: { flexDirection: 'row', gap: 12, marginTop: 12 },
  dailyStat: { flex: 1, alignItems: 'center', gap: 4 },
  mainWin: { flexDirection: 'row', gap: 6, marginTop: 10, alignItems: 'center' },
  debuffTag: { flexDirection: 'row', gap: 4, marginTop: 4, alignItems: 'center' },
  streakBadge: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  currentTag: {
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4,
    backgroundColor: `${COLORS.cyan}22`, borderWidth: 1, borderColor: `${COLORS.cyan}44`,
    marginBottom: 8,
  },
  arcMeta: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 60 },
});
