// ═══════════════════════════════════════════════════
// SAFE SCREEN — Route param validation wrapper
// Fix #11: Guard route params everywhere
// ═══════════════════════════════════════════════════

import React, { type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

interface SafeScreenProps {
  /** Required params to validate */
  requiredParams?: string[];
  /** Custom validator (return error string or null) */
  validate?: (params: Record<string, any>) => string | null;
  /** Content to render when params are valid */
  children: ReactNode;
}

/**
 * Wraps a screen that requires route params.
 * Shows a recovery UI if params are missing or invalid.
 *
 * Usage:
 *   <SafeScreen requiredParams={['questId']}>
 *     <QuestDetailContent questId={route.params.questId} />
 *   </SafeScreen>
 */
export function SafeScreen({ requiredParams = [], validate, children }: SafeScreenProps) {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const params = route.params || {};

  // Check required params
  const missingParam = requiredParams.find((key) => !params[key]);
  if (missingParam) {
    return (
      <ParamError
        message={`Missing required data: "${missingParam}"`}
        onBack={() => nav.canGoBack() ? nav.goBack() : nav.navigate('MainTabs')}
      />
    );
  }

  // Run custom validator
  if (validate) {
    const error = validate(params);
    if (error) {
      return (
        <ParamError
          message={error}
          onBack={() => nav.canGoBack() ? nav.goBack() : nav.navigate('MainTabs')}
        />
      );
    }
  }

  return <>{children}</>;
}

function ParamError({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <View style={styles.screen}>
      <Text style={{ fontSize: 48 }}>🔍</Text>
      <Text style={[FONTS.displaySmall, { color: COLORS.text, marginTop: 16 }]}>
        Not Found
      </Text>
      <Text style={[FONTS.body, { color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, paddingHorizontal: 32 }]}>
        {message}
      </Text>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Text style={[FONTS.label, { color: COLORS.cyan }]}>BACK TO QUESTS</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: `${COLORS.cyan}55`,
    backgroundColor: `${COLORS.cyan}11`,
  },
});
