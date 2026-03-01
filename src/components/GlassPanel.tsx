// ═══════════════════════════════════════════════════
// GlassPanel — Core UI container with glassmorphism
// ═══════════════════════════════════════════════════

import React from 'react';
import { ViewStyle, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../constants/theme';

interface GlassPanelProps {
  children: React.ReactNode;
  style?: ViewStyle;
  glow?: boolean;
  glowColor?: string;
  onPress?: () => void;
  borderLeft?: string;
  padding?: number;
  animate?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GlassPanel({
  children,
  style,
  glow = false,
  glowColor = COLORS.cyan,
  onPress,
  borderLeft,
  padding = SPACING.xl,
  animate = true,
}: GlassPanelProps) {
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: glow
      ? withTiming(interpolate(pressed.value, [0, 1], [0.15, 0.35]).toString(), { duration: 200 })
      : undefined,
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
      pressed.value = withTiming(1, { duration: 150 });
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    pressed.value = withTiming(0, { duration: 200 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress}
      style={[
        styles.container,
        glow && [styles.glow, { shadowColor: glowColor }],
        borderLeft ? { borderLeftWidth: 3, borderLeftColor: borderLeft } : undefined,
        animatedStyle,
        style,
      ]}
    >
      <LinearGradient
        colors={[COLORS.glass, 'rgba(10,10,15,0.96)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { padding }]}
      >
        {children}
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    ...SHADOWS.md,
  },
  glow: {
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    borderColor: COLORS.cyanDim,
  },
  gradient: {
    borderRadius: RADIUS.xl - 1,
  },
});
