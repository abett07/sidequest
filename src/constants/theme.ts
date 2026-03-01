// ═══════════════════════════════════════════════════
// SHADOW SYSTEM — Theme & Design Tokens
// Dark anime aesthetic inspired by Solo Leveling
// ═══════════════════════════════════════════════════

export const COLORS = {
  // Core backgrounds
  bg:            '#050507',
  bgSecondary:   '#0A0A0F',
  bgTertiary:    '#111115',
  glass:         'rgba(17,17,19,0.94)',
  glassBorder:   'rgba(0,229,255,0.12)',
  glassHover:    'rgba(0,229,255,0.20)',

  // Primary accent — Cyan (System UI)
  cyan:          '#00E5FF',
  cyanDim:       'rgba(0,229,255,0.30)',
  cyanGlow:      'rgba(0,229,255,0.50)',
  cyanBg:        'rgba(0,229,255,0.08)',

  // Danger / Boss — Red
  red:           '#FF1744',
  redDim:        'rgba(255,23,68,0.30)',
  redGlow:       'rgba(255,23,68,0.50)',
  redBg:         'rgba(255,23,68,0.08)',

  // Gold / XP / Rewards
  gold:          '#FFD700',
  goldDim:       'rgba(255,215,0,0.30)',
  goldGlow:      'rgba(255,215,0,0.50)',
  goldBg:        'rgba(255,215,0,0.08)',

  // Purple — Narrative / Magic
  purple:        '#B388FF',
  purpleDim:     'rgba(179,136,255,0.25)',
  purpleGlow:    'rgba(179,136,255,0.50)',
  purpleBg:      'rgba(179,136,255,0.08)',

  // Green — Success / Recovery
  green:         '#00E676',
  greenDim:      'rgba(0,230,118,0.30)',
  greenBg:       'rgba(0,230,118,0.08)',

  // Orange — Warning
  orange:        '#FF6B35',
  orangeDim:     'rgba(255,107,53,0.30)',

  // Text hierarchy
  text:          '#E8E8EC',
  textSecondary: '#8A8A9C',
  textDim:       '#4A4A5C',
  textMuted:     '#2A2A3C',

  // Rank colors
  rankE:         '#8B8B8B',
  rankD:         '#4CAF50',
  rankC:         '#2196F3',
  rankB:         '#AB47BC',
  rankA:         '#FF9800',
  rankS:         '#FFD700',
  rankSS:        '#FF5252',
  rankSSS:       '#FF1744',
  rankMonarch:   '#B388FF',

  // Category colors
  catWork:       '#00E5FF',
  catStudy:      '#B388FF',
  catHealth:     '#00E676',
  catChores:     '#FF9800',
  catAdmin:      '#8A8A9C',
  catSocial:     '#FF6B35',

  // Overlay
  overlay:       'rgba(0,0,0,0.70)',
  overlayLight:  'rgba(0,0,0,0.40)',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 9999,
} as const;

export const FONTS = {
  // Display / headings — bold, techy
  display: {
    fontFamily: 'Orbitron-Bold',
    fontSize: 28,
    letterSpacing: 3,
  },
  displaySmall: {
    fontFamily: 'Orbitron-Bold',
    fontSize: 20,
    letterSpacing: 2,
  },
  // Labels — medium weight techy
  label: {
    fontFamily: 'Orbitron-Medium',
    fontSize: 12,
    letterSpacing: 2,
  },
  labelSmall: {
    fontFamily: 'Orbitron-Medium',
    fontSize: 10,
    letterSpacing: 1.5,
  },
  // Body text — readable
  body: {
    fontFamily: 'Rajdhani-Medium',
    fontSize: 16,
    lineHeight: 24,
  },
  bodySmall: {
    fontFamily: 'Rajdhani-Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  bodyLarge: {
    fontFamily: 'Rajdhani-SemiBold',
    fontSize: 18,
    lineHeight: 26,
  },
  // Numbers — monospace feel
  number: {
    fontFamily: 'Orbitron-Bold',
    fontSize: 24,
  },
  numberLarge: {
    fontFamily: 'Orbitron-Black',
    fontSize: 48,
  },
  // Buttons
  button: {
    fontFamily: 'Orbitron-Bold',
    fontSize: 14,
    letterSpacing: 2,
  },
  buttonSmall: {
    fontFamily: 'Orbitron-SemiBold',
    fontSize: 12,
    letterSpacing: 1.5,
  },
} as const;

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  }),
} as const;

// Rank thresholds
export const RANK_THRESHOLDS: Record<string, { minLevel: number; color: string }> = {
  E:       { minLevel: 1,   color: COLORS.rankE },
  D:       { minLevel: 10,  color: COLORS.rankD },
  C:       { minLevel: 20,  color: COLORS.rankC },
  B:       { minLevel: 35,  color: COLORS.rankB },
  A:       { minLevel: 50,  color: COLORS.rankA },
  S:       { minLevel: 70,  color: COLORS.rankS },
  SS:      { minLevel: 85,  color: COLORS.rankSS },
  SSS:     { minLevel: 95,  color: COLORS.rankSSS },
  Monarch: { minLevel: 100, color: COLORS.rankMonarch },
};

// XP formula: xpToNext = baseXP + (level * multiplier)
export const XP_CONFIG = {
  baseXP: 1000,
  levelMultiplier: 500,
  taskStartBonus: 10,
  microStepBonus: 15,
  fullCompletionMultiplier: 1.0,
  bossCompletionMultiplier: 2.0,
  streakMultiplier: 0.1,        // +10% per streak day, capped
  streakMultiplierCap: 0.5,     // max +50%
  rescueRecoveryBonus: 25,
  comboMultiplier: 0.05,        // +5% per combo
  comboMultiplierCap: 0.3,
} as const;

// Category icon/color mapping
export const CATEGORY_META: Record<string, { icon: string; color: string; label: string }> = {
  work:   { icon: '💼', color: COLORS.catWork,   label: 'Work' },
  study:  { icon: '📚', color: COLORS.catStudy,  label: 'Study' },
  health: { icon: '💪', color: COLORS.catHealth, label: 'Health' },
  chores: { icon: '🏠', color: COLORS.catChores, label: 'Chores' },
  admin:  { icon: '📋', color: COLORS.catAdmin,  label: 'Admin' },
  social: { icon: '👥', color: COLORS.catSocial, label: 'Social' },
};

// Buff/Debuff definitions
export const BUFF_DEFINITIONS = {
  morning_momentum: { name: 'Morning Momentum', icon: '☀️', color: COLORS.gold, type: 'buff' as const },
  deep_focus:       { name: 'Deep Focus',       icon: '🎯', color: COLORS.cyan, type: 'buff' as const },
  clear_mind:       { name: 'Clear Mind',       icon: '✨', color: COLORS.green, type: 'buff' as const },
  recovery_bonus:   { name: 'Recovery Bonus',   icon: '🌿', color: COLORS.green, type: 'buff' as const },
  streak_fire:      { name: 'Streak Fire',      icon: '🔥', color: COLORS.orange, type: 'buff' as const },
};

export const DEBUFF_DEFINITIONS = {
  sleep_debt:       { name: 'Sleep Debt',        icon: '😴', color: COLORS.purple, type: 'debuff' as const },
  task_paralysis:   { name: 'Task Paralysis',    icon: '❄️', color: COLORS.cyan, type: 'debuff' as const },
  doomscroll_drift: { name: 'Doomscroll Drift',  icon: '👁️', color: COLORS.red, type: 'debuff' as const },
  overload:         { name: 'Overload',           icon: '⚡', color: COLORS.red, type: 'debuff' as const },
  avoidance_fog:    { name: 'Avoidance Fog',      icon: '🌫️', color: COLORS.textDim, type: 'debuff' as const },
};
