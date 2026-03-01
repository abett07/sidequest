// ═══════════════════════════════════════════════════
// ERROR BOUNDARY + SCREEN STATES
// Fix #8: No error boundaries / fallback UI
// ═══════════════════════════════════════════════════

import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

// ─── Global Error Boundary ───

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ShadowSystem] Error caught by boundary:', error, info);
    // TODO: Send to error tracking service (Sentry, etc.)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <View style={styles.errorScreen}>
          <Text style={{ fontSize: 48 }}>⚠️</Text>
          <Text style={[FONTS.displaySmall, { color: COLORS.red, marginTop: 16 }]}>
            SYSTEM ERROR
          </Text>
          <Text style={[FONTS.body, { color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, paddingHorizontal: 32 }]}>
            Something went wrong. Your data is safe.
          </Text>
          {__DEV__ && this.state.error && (
            <Text style={[FONTS.bodySmall, { color: COLORS.textDim, textAlign: 'center', marginTop: 12, paddingHorizontal: 24, fontSize: 11 }]}>
              {this.state.error.message}
            </Text>
          )}
          <Pressable onPress={this.handleRetry} style={styles.retryButton}>
            <Text style={[FONTS.label, { color: COLORS.cyan }]}>RETRY</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

// ─── Screen-Level State Components ───

/** Shows a centered loading spinner */
export function ScreenLoading({ message = 'Loading...' }: { message?: string }) {
  return (
    <View style={styles.stateScreen}>
      <ActivityIndicator size="large" color={COLORS.cyan} />
      <Text style={[FONTS.body, { color: COLORS.textSecondary, marginTop: 12 }]}>
        {message}
      </Text>
    </View>
  );
}

/** Shows an empty state with icon + message + optional CTA */
export function ScreenEmpty({
  icon = '📭',
  title = 'Nothing here yet',
  message = '',
  actionLabel,
  onAction,
}: {
  icon?: string;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.stateScreen}>
      <Text style={{ fontSize: 48 }}>{icon}</Text>
      <Text style={[FONTS.displaySmall, { color: COLORS.text, marginTop: 12 }]}>
        {title}
      </Text>
      {message ? (
        <Text style={[FONTS.body, { color: COLORS.textSecondary, textAlign: 'center', marginTop: 6, paddingHorizontal: 32 }]}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction && (
        <Pressable onPress={onAction} style={styles.actionButton}>
          <Text style={[FONTS.label, { color: COLORS.cyan }]}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Shows an error state with retry button */
export function ScreenError({
  message = 'Failed to load data',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.stateScreen}>
      <Text style={{ fontSize: 48 }}>⚡</Text>
      <Text style={[FONTS.displaySmall, { color: COLORS.red, marginTop: 12 }]}>
        Connection Lost
      </Text>
      <Text style={[FONTS.body, { color: COLORS.textSecondary, textAlign: 'center', marginTop: 6, paddingHorizontal: 32 }]}>
        {message}
      </Text>
      {onRetry && (
        <Pressable onPress={onRetry} style={styles.retryButton}>
          <Text style={[FONTS.label, { color: COLORS.cyan }]}>RETRY</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Offline banner — show at top of screen when connectivity lost */
export function OfflineBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={styles.offlineBanner}>
      <Text style={[FONTS.bodySmall, { color: COLORS.gold, fontSize: 12 }]}>
        ⚡ Offline — changes will sync when connected
      </Text>
    </View>
  );
}

// ─── Styles ───

const styles = StyleSheet.create({
  errorScreen: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateScreen: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: `${COLORS.cyan}55`,
    backgroundColor: `${COLORS.cyan}11`,
  },
  actionButton: {
    marginTop: 20,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: `${COLORS.cyan}55`,
    backgroundColor: `${COLORS.cyan}11`,
  },
  offlineBanner: {
    backgroundColor: `${COLORS.gold}15`,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.gold}33`,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
});
