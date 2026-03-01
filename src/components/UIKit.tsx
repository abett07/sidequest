// ═══════════════════════════════════════════════════
// SHADOW SYSTEM — Shared UI Components
// ═══════════════════════════════════════════════════

import React from 'react';
import {
  View, Text, Pressable, StyleSheet, ViewStyle, TextStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle, useSharedValue, withSpring, withTiming,
  interpolateColor, FadeIn, FadeOut, SlideInRight,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ─── XP Bar ───
interface XPBarProps {
  current: number;
  max: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
  label?: string;
}

export function XPBar({ current, max, color = COLORS.cyan, height = 8, showLabel = true, label }: XPBarProps) {
  const pct = Math.min((current / max) * 100, 100);
  const width = useSharedValue(0);

  React.useEffect(() => {
    width.value = withTiming(pct, { duration: 800 });
  }, [pct]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View>
      {showLabel && (
        <View style={styles.xpLabelRow}>
          <Text style={[styles.xpLabelText, { color: COLORS.textSecondary }]}>{label || ''}</Text>
          <Text style={[styles.xpLabelText, { color: COLORS.textSecondary }]}>
            {current.toLocaleString()} / {max.toLocaleString()}
          </Text>
        </View>
      )}
      <View style={[styles.xpTrack, { height, borderRadius: height / 2 }]}>
        <Animated.View
          style={[
            styles.xpFill,
            { backgroundColor: color, height, borderRadius: height / 2 },
            barStyle,
          ]}
        />
      </View>
    </View>
  );
}

// ─── Stat Orb ───
interface StatOrbProps {
  label: string;
  value: number;
  color: string;
  icon: string;
  size?: number;
}

export function StatOrb({ label, value, color, icon, size = 56 }: StatOrbProps) {
  return (
    <View style={styles.orbContainer}>
      <View
        style={[
          styles.orb,
          {
            width: size, height: size, borderRadius: size / 2,
            borderColor: `${color}66`,
            shadowColor: color,
          },
        ]}
      >
        <LinearGradient
          colors={[`${color}44`, `${color}11`]}
          style={[styles.orbGradient, { borderRadius: size / 2 }]}
        >
          <Text style={{ fontSize: size * 0.36 }}>{icon}</Text>
        </LinearGradient>
      </View>
      <Text style={[FONTS.labelSmall, { color, marginTop: 4 }]}>{value}%</Text>
      <Text style={[styles.orbLabel]}>{label}</Text>
    </View>
  );
}

// ─── Action Button ───
interface ActionButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  color?: string;
  variant?: 'filled' | 'outline' | 'ghost';
  icon?: string;
  disabled?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ActionButton({
  children, onPress, color = COLORS.cyan, variant = 'filled',
  icon, disabled = false, style, fullWidth = false, size = 'md',
}: ActionButtonProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const paddings = { sm: 10, md: 14, lg: 18 };
  const fontSizes = { sm: 11, md: 13, lg: 15 };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.96, { damping: 15 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
      disabled={disabled}
      style={[
        styles.actionBtn,
        {
          borderColor: disabled ? COLORS.textDim : color,
          backgroundColor: variant === 'filled'
            ? (disabled ? `${COLORS.textDim}22` : `${color}18`)
            : 'transparent',
          paddingVertical: paddings[size],
          opacity: disabled ? 0.5 : 1,
        },
        fullWidth && { width: '100%' },
        animStyle,
        style,
      ]}
    >
      {icon && <Text style={{ fontSize: fontSizes[size] + 4, marginRight: 8 }}>{icon}</Text>}
      <Text
        style={[
          FONTS.button,
          {
            fontSize: fontSizes[size],
            color: disabled ? COLORS.textDim : (variant === 'filled' ? '#fff' : color),
          },
        ]}
      >
        {children}
      </Text>
    </AnimatedPressable>
  );
}

// ─── Tab Bar ───
interface TabBarProps {
  tabs: string[];
  active: string;
  onSelect: (tab: string) => void;
}

export function TabBar({ tabs, active, onSelect }: TabBarProps) {
  return (
    <View style={styles.tabContainer}>
      {tabs.map((tab) => (
        <Pressable
          key={tab}
          onPress={() => onSelect(tab)}
          style={[
            styles.tab,
            active === tab && styles.tabActive,
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: active === tab ? COLORS.cyan : COLORS.textSecondary },
            ]}
          >
            {tab}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Filter Chip ───
interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string;
}

export function Chip({ label, active = false, onPress, color = COLORS.cyan }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: active ? color : COLORS.textDim,
          backgroundColor: active ? `${color}22` : 'transparent',
        },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? color : COLORS.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Progress Ring (SVG) ───
interface ProgressRingProps {
  progress: number;    // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  children?: React.ReactNode;
}

export function ProgressRing({
  progress, size = 100, strokeWidth = 6, color = COLORS.cyan, children,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress / 100);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }], position: 'absolute' }}>
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </Svg>
      {children}
    </View>
  );
}

// ─── Rank Badge ───
interface RankBadgeProps {
  rank: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}

export function RankBadge({ rank, color, size = 'md' }: RankBadgeProps) {
  const sizes = { sm: { padding: 4, fontSize: 10 }, md: { padding: 6, fontSize: 12 }, lg: { padding: 8, fontSize: 14 } };
  const s = sizes[size];
  return (
    <View style={[styles.rankBadge, { borderColor: `${color}55`, backgroundColor: `${color}22` }]}>
      <Text style={[FONTS.labelSmall, { color, fontSize: s.fontSize }]}>
        {rank}-RANK
      </Text>
    </View>
  );
}

// ─── Difficulty Skulls ───
export function DifficultyIndicator({ level, max = 5 }: { level: number; max?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: max }, (_, i) => (
        <Text key={i} style={{ fontSize: 12, opacity: i < level ? 1 : 0.2 }}>💀</Text>
      ))}
    </View>
  );
}

// ─── Section Header ───
export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[FONTS.label, { color: COLORS.text }]}>{title}</Text>
      {action && (
        <Pressable onPress={onAction}>
          <Text style={[styles.sectionAction, { color: COLORS.cyan }]}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Empty State ───
export function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.emptyState}>
      <Text style={{ fontSize: 48, marginBottom: 12 }}>{icon}</Text>
      <Text style={[FONTS.bodyLarge, { color: COLORS.text, textAlign: 'center' }]}>{title}</Text>
      {subtitle && (
        <Text style={[FONTS.bodySmall, { color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 }]}>
          {subtitle}
        </Text>
      )}
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════
const styles = StyleSheet.create({
  xpLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  xpLabelText: {
    ...FONTS.bodySmall,
    fontSize: 12,
  },
  xpTrack: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  xpFill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  orbContainer: {
    alignItems: 'center',
    gap: 2,
  },
  orb: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  orbGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  orbLabel: {
    ...FONTS.bodySmall,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: RADIUS.md,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.cyanDim,
  },
  tabText: {
    ...FONTS.bodySmall,
    fontWeight: '600',
    fontSize: 13,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.round,
    borderWidth: 1,
  },
  chipText: {
    ...FONTS.bodySmall,
    fontSize: 12,
    fontWeight: '600',
  },
  rankBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionAction: {
    ...FONTS.bodySmall,
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
});
