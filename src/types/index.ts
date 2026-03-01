// ═══════════════════════════════════════════════════
// SHADOW SYSTEM — Complete Type Definitions
// ═══════════════════════════════════════════════════

// ─── Identity System ───
export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS' | 'Monarch';

export type PlayStyle = 'calm' | 'intense' | 'balanced';

export type ThemeMode = 'hunter' | 'system' | 'minimal';

export type ReminderStyle = 'gentle' | 'direct' | 'intense';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  characterName: string;
  rank: Rank;
  level: number;
  xpTotal: number;
  xpToNext: number;
  coins: number;
  statPoints: number;           // FIX #10: earned every 5 levels, spent on skill tree
  themeMode: ThemeMode;
  reminderStyle: ReminderStyle;
  playStyle: PlayStyle;
  createdAt: string;
  timezone: string;
}

export interface UserPreferences {
  id: string;
  userId: string;
  stimulationMode: 'low' | 'medium' | 'high';
  rewardSensitivity: number;    // 1-5
  reminderTolerance: number;     // 1-5
  overwhelmSensitivity: number;  // 1-5
  timeBlindnessLevel: 'low' | 'medium' | 'high';
  preferredFocusLength: number;  // minutes
  aiTone: 'commander' | 'mentor' | 'calm' | 'hype';
  reduceMotion: boolean;
  lowClutterMode: boolean;
  muteSounds: boolean;
  muteHaptics: boolean;
  bodyDoubleEnabled: boolean;
  bodyDoublePersonality: 'commander' | 'cheerleader' | 'stoic' | 'gentle';
}

export interface UserStats {
  id: string;
  userId: string;
  focusStat: number;
  disciplineStat: number;
  energyStat: number;
  recoveryStat: number;
  clarityStat: number;
  courageStat: number;
  updatedAt: string;
}

// ─── State System ───
export type MoodLevel = 1 | 2 | 3 | 4 | 5;
export type EnergyLevel = 1 | 2 | 3 | 4 | 5;
export type StressLevel = 1 | 2 | 3 | 4 | 5;
export type FocusLevel = 1 | 2 | 3 | 4 | 5;

export type StateTag =
  | 'overwhelmed'
  | 'frozen'
  | 'anxious'
  | 'distracted'
  | 'low_energy'
  | 'hyperfocus'
  | 'clear'
  | 'motivated';

export interface StateCheckin {
  id: string;
  userId: string;
  mood: MoodLevel;
  energy: EnergyLevel;
  stress: StressLevel;
  focus: FocusLevel;
  stateTag: StateTag;
  notes?: string;
  createdAt: string;
}

export type BuffDebuffType = 'buff' | 'debuff';

export interface BuffDebuff {
  id: string;
  userId: string;
  type: BuffDebuffType;
  name: string;
  intensity: number;     // 1-3
  source: string;
  startedAt: string;
  endsAt?: string;
  active: boolean;
  icon: string;
  color: string;
}

// ─── Quest System ───
export type QuestCategory = 'study' | 'admin' | 'health' | 'chores' | 'work' | 'social';

export type QuestType = 'normal' | 'boss' | 'recurring' | 'recovery';

export type QuestStatus = 'inbox' | 'active' | 'in_progress' | 'done' | 'paused' | 'failed';

export type QuestPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Quest {
  id: string;
  userId: string;
  campaignId?: string;
  title: string;
  description?: string;
  category: QuestCategory;
  questType: QuestType;
  status: QuestStatus;
  priority: QuestPriority;
  difficultyScore: number;          // 1-5
  emotionalWeightScore: number;     // 1-5
  frictionScore: number;            // 1-5
  estimatedMinutes: number;
  dueAt?: string;
  scheduledFor?: string;
  xpReward: number;
  coinReward: number;
  createdAt: string;
  completedAt?: string;
  // Boss-specific
  bossHp?: number;
  bossMaxHp?: number;
  bossName?: string;
  bossWeakPoints?: string[];
}

export interface QuestStep {
  id: string;
  questId: string;
  stepOrder: number;
  title: string;
  isRequired: boolean;
  status: 'pending' | 'in_progress' | 'done' | 'skipped';
  estimatedMinutes?: number;
  completedAt?: string;
}

export interface BossPhase {
  id: string;
  questId: string;
  phaseOrder: number;
  title: string;
  hpValue: number;
  status: 'locked' | 'active' | 'defeated';
  completedAt?: string;
}

export interface RecurringRule {
  id: string;
  questId: string;
  recurrenceType: 'daily' | 'weekly' | 'custom';
  recurrenceConfig: Record<string, any>;
  active: boolean;
}

// ─── Campaign System ───
export type CampaignStatus = 'active' | 'completed' | 'paused' | 'failed';

export interface Campaign {
  id: string;
  userId: string;
  title: string;
  description?: string;
  category: QuestCategory;
  status: CampaignStatus;
  progressPct: number;
  dueDate?: string;
  createdAt: string;
  completedAt?: string;
  mainBoss?: string;
  sideQuests: Quest[];
  milestones: CampaignMilestone[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface CampaignMilestone {
  id: string;
  campaignId: string;
  title: string;
  weekNumber: number;
  completed: boolean;
  completedAt?: string;
}

// ─── Focus System ───
export type SessionType = 'ignite' | 'scout' | 'dungeon' | 'raid' | 'custom' | 'rescue';

export interface FocusSession {
  id: string;
  userId: string;
  questId?: string;
  sessionType: SessionType;
  plannedMinutes: number;
  actualMinutes: number;
  completed: boolean;
  distractionCount: number;
  qualityScore: number;         // 1-5
  startedAt: string;
  endedAt?: string;
}

export const SESSION_PRESETS: Record<SessionType, { label: string; minutes: number; icon: string; color: string }> = {
  ignite:  { label: '3-Min Ignite',   minutes: 3,  icon: '🔥', color: '#FF6B35' },
  scout:   { label: '10-Min Scout',   minutes: 10, icon: '🔍', color: '#00E5FF' },
  dungeon: { label: '25-Min Dungeon', minutes: 25, icon: '🏰', color: '#B388FF' },
  raid:    { label: '45-Min Raid',    minutes: 45, icon: '⚔️', color: '#FF1744' },
  custom:  { label: 'Custom',         minutes: 0,  icon: '⚡', color: '#FFD700' },
  rescue:  { label: 'Rescue Sprint',  minutes: 2,  icon: '🆘', color: '#FF1744' },
};

// ─── Progression System ───
export interface Achievement {
  id: string;
  userId: string;
  key: string;
  title: string;
  description: string;
  unlockedAt?: string;
  icon: string;
}

export interface SkillNode {
  id: string;
  key: string;
  branch: SkillBranch;
  title: string;
  description: string;
  unlockRule: string;
  statBonus: Record<string, number>;
  statPointCost: number;          // FIX #10: cost in stat points to unlock
  icon: string;
  requires?: string[];     // other node keys
  level: number;           // tier in tree
}

export type SkillBranch = 'focus' | 'consistency' | 'recovery' | 'order' | 'confidence' | 'execution';

export interface UserSkillNode {
  id: string;
  userId: string;
  skillNodeId: string;
  unlockedAt: string;
}

export interface Reward {
  id: string;
  userId: string;
  rewardType: 'theme' | 'token' | 'chest' | 'custom' | 'cosmetic';
  title: string;
  description?: string;
  costCoins: number;
  unlocked: boolean;
  redeemedAt?: string;
  icon: string;
}

// ─── Intelligence System ───
export type RecommendationType = 'next_action' | 'rescue' | 'schedule' | 'insight' | 'backup';

export interface AIRecommendation {
  id: string;
  userId: string;
  recommendationType: RecommendationType;
  content: string;
  sourceContext: Record<string, any>;
  accepted: boolean;
  createdAt: string;
}

// ─── Narrative System ───
export interface DailyLog {
  id: string;
  userId: string;
  logDate: string;
  questsCompleted: number;
  xpEarned: number;
  focusMinutes: number;
  streakContinued: boolean;
  mainWin?: string;
  dominantDebuff?: string;
}

export interface WeeklyArc {
  id: string;
  userId: string;
  weekStart: string;
  title: string;
  summary?: string;
  majorWin?: string;
  mainBossDefeated?: string;
  riskPattern?: string;
  generatedAt: string;
}

// ─── Phase 4: Narrative System ───

export interface BattleLogEntry {
  id: string;
  timestamp: string;
  type: 'quest_complete' | 'boss_defeat' | 'boss_phase' | 'rank_up' | 'streak_milestone'
    | 'rescue_used' | 'skill_unlock' | 'achievement' | 'daily_summary';
  title: string;
  description: string;
  xpEarned?: number;
  icon: string;
}

export interface NarrativeEvent {
  id: string;
  type: 'lore' | 'title_earned' | 'arc_begin' | 'arc_end' | 'rank_ceremony';
  content: string;
  flavorText?: string;
  timestamp: string;
}

// ─── Phase 4: Body Doubling ───

export interface BodyDoubleConfig {
  enabled: boolean;
  companionName: string;
  personality: 'commander' | 'cheerleader' | 'stoic' | 'gentle';
  promptInterval: number; // seconds between prompts
}

export const COMPANION_PROMPTS: Record<BodyDoubleConfig['personality'], string[]> = {
  commander: [
    "Your shadows are watching. Keep going.",
    "A true Hunter never retreats without striking.",
    "The System demands your focus.",
    "Power flows through discipline.",
    "Arise. Conquer. Repeat.",
    "This dungeon yields to persistence.",
    "Monarch energy detected. Channel it.",
    "You chose this fight. Finish it.",
    "The gate won't clear itself.",
    "Each second builds your shadow army.",
  ],
  cheerleader: [
    "You're doing amazing! Keep it up! ✨",
    "Look at you go — unstoppable! 🔥",
    "Every second counts and you're nailing it!",
    "I believe in you, Hunter! Almost there!",
    "You've got this — the finish line is close!",
    "Your effort is building something great!",
    "So proud of you for showing up today!",
    "That focus? Chef's kiss. Keep going!",
    "You're stronger than you think! 💪",
    "One step at a time — you're winning!",
  ],
  stoic: [
    "Continue.",
    "Stay the course.",
    "Breathe. Focus. Execute.",
    "The work speaks for itself.",
    "Present moment. Present task.",
    "Discipline over motivation.",
    "One thing at a time.",
    "Steady.",
    "This too shall pass. Keep working.",
    "Silence the noise. Do the work.",
  ],
  gentle: [
    "You're here, and that's what matters. 🌱",
    "Take it easy — slow progress is still progress.",
    "It's okay to go at your own pace.",
    "Be kind to yourself while you work.",
    "You showed up today. That takes courage.",
    "No rush — just keep moving forward gently.",
    "Your best is enough. Always.",
    "Breathe. You're doing fine.",
    "Even small steps cross great distances.",
    "I'm here with you. You're not alone in this.",
  ],
};

// ─── Navigation ───
export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: undefined;
  QuestDetail: { questId: string };
  FocusMode: { questId?: string; sessionType?: SessionType; minutes?: number; bodyDouble?: boolean };
  RescueMode: undefined;
  BrainDump: undefined;
  BossFight: { questId: string };
  CampaignDetail: { campaignId: string };
  Insights: undefined;
  Settings: undefined;
  BattleLog: undefined;
};

export type MainTabsParamList = {
  Dashboard: undefined;
  Quests: undefined;
  Focus: undefined;
  Skills: undefined;
  Rewards: undefined;
};

// ─── Notification System ───
export interface AppNotification {
  id: string;
  userId: string;
  type: 'quest_reminder' | 'streak_warning' | 'buff_expired' | 'rank_up' | 'boss_ready' | 'weekly_arc';
  title: string;
  body: string;
  scheduledAt: string;
  sentAt?: string;
  actionTargetType?: string;
  actionTargetId?: string;
}
