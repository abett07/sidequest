// ═══════════════════════════════════════════════════
// REWARDS / INVENTORY SCREEN
// ═══════════════════════════════════════════════════

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { GlassPanel } from '../components/GlassPanel';
import { TabBar, ActionButton } from '../components/UIKit';
import { COLORS, SPACING, FONTS, RADIUS } from '../constants/theme';
import { useShadowStore } from '../store/useShadowStore';

const REWARD_DATA: Record<string, Array<{ name: string; cost: number; icon: string; owned: boolean }>> = {
  Cosmetics: [
    { name: 'Shadow Theme', cost: 1000, icon: '🎨', owned: true },
    { name: 'Neon Blade Skin', cost: 2500, icon: '⚔️', owned: false },
    { name: 'Crimson Aura', cost: 1500, icon: '🔴', owned: false },
  ],
  'Real-Life': [
    { name: '20-min Break', cost: 500, icon: '☕', owned: false },
    { name: 'Snack Token', cost: 300, icon: '🍕', owned: false },
    { name: 'Episode Token', cost: 800, icon: '📺', owned: false },
  ],
  Tokens: [
    { name: 'Bonus XP (2x)', cost: 1000, icon: '✨', owned: false },
    { name: 'Skip Quest', cost: 2000, icon: '🎫', owned: false },
    { name: 'Custom Goal', cost: 2500, icon: '🏆', owned: false },
  ],
};

const CHESTS = [
  { type: 'Common',    icon: '📦', color: COLORS.textSecondary },
  { type: 'Rare',      icon: '🎁', color: COLORS.cyan },
  { type: 'Legendary', icon: '👑', color: COLORS.gold },
];

export function RewardsScreen() {
  const coins = useShadowStore((s) => s.user.coins);
  const [tab, setTab] = useState('Cosmetics');

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={[FONTS.displaySmall, { color: COLORS.text, textAlign: 'center' }]}>INVENTORY</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Coin Display */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.coinArea}>
          <View style={styles.coinOrb}>
            <Text style={{ fontSize: 24 }}>⭐</Text>
          </View>
          <Text style={[FONTS.number, { color: COLORS.gold, fontSize: 32, marginTop: 8 }]}>
            {coins.toLocaleString()}
          </Text>
        </Animated.View>

        {/* Tabs */}
        <TabBar tabs={['Cosmetics', 'Real-Life', 'Tokens']} active={tab} onSelect={setTab} />

        {/* Rewards Grid */}
        <Text style={[FONTS.label, { color: COLORS.text, marginTop: 20, marginBottom: 10 }]}>
          REWARDS INVENTORY
        </Text>
        <View style={styles.rewardGrid}>
          {(REWARD_DATA[tab] || []).map((r, i) => (
            <Animated.View key={r.name} entering={FadeInDown.delay(i * 60).duration(250)} style={styles.rewardCell}>
              <GlassPanel style={{ alignItems: 'center' }} padding={14}>
                <Text style={{ fontSize: 30 }}>{r.icon}</Text>
                <Text style={[FONTS.bodySmall, { color: COLORS.text, marginTop: 6, textAlign: 'center', fontWeight: '600' }]}>
                  {r.name}
                </Text>
                <Text style={[FONTS.label, { color: COLORS.gold, fontSize: 14, marginVertical: 4 }]}>
                  {r.cost.toLocaleString()}
                </Text>
                <Pressable style={[styles.redeemBtn, {
                  borderColor: r.owned ? `${COLORS.green}55` : `${COLORS.gold}55`,
                  backgroundColor: r.owned ? `${COLORS.green}22` : `${COLORS.gold}22`,
                }]}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: r.owned ? COLORS.green : COLORS.gold }}>
                    {r.owned ? 'Owned' : 'Redeem'}
                  </Text>
                </Pressable>
              </GlassPanel>
            </Animated.View>
          ))}
        </View>

        {/* Chests */}
        <Text style={[FONTS.label, { color: COLORS.text, marginTop: 20, marginBottom: 10 }]}>
          RECENT CHESTS
        </Text>
        <View style={styles.chestGrid}>
          {CHESTS.map((c, i) => (
            <Animated.View key={c.type} entering={FadeInDown.delay(i * 80).duration(250)} style={styles.chestCell}>
              <GlassPanel style={{ alignItems: 'center' }} padding={16}>
                <Text style={{ fontSize: 36 }}>{c.icon}</Text>
                <Pressable style={[styles.chestBtn, { borderColor: `${c.color}44`, backgroundColor: `${c.color}22` }]}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: c.color }}>Open Chest</Text>
                </Pressable>
              </GlassPanel>
            </Animated.View>
          ))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingTop: 60, paddingHorizontal: SPACING.xl, paddingBottom: SPACING.md },
  content: { paddingHorizontal: SPACING.xl },
  coinArea: { alignItems: 'center', marginBottom: 20 },
  coinOrb: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: `${COLORS.gold}33`, borderWidth: 2, borderColor: `${COLORS.gold}55`,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.gold, shadowOpacity: 0.4, shadowRadius: 16,
  },
  rewardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  rewardCell: { width: '31%' },
  redeemBtn: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  chestGrid: { flexDirection: 'row', gap: 10 },
  chestCell: { flex: 1 },
  chestBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, borderWidth: 1, marginTop: 10 },
});
