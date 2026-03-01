// ═══════════════════════════════════════════════════
// SHADOW SYSTEM — Global State (Zustand + MMKV persist)
//
// FIXES APPLIED:
//  #1  Supabase sync wired via data/sync.ts repos
//  #3  Full store persisted to MMKV (not just hasOnboarded)
//  #5  Boss HP/phase persisted on quest object
//  #7  Date-based streak + grace day + combo decay
//  #9  No sample data — empty initial state, seed on first quest
// ═══════════════════════════════════════════════════

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
import { XP_CONFIG, RANK_THRESHOLDS } from '../constants/theme';
import {
  profilesRepo, prefsRepo, statsRepo,
  questsRepo, stepsRepo, focusRepo, stateRepo,
  skillNodesRepo, rewardsRepo, achievementsRepo,
  flushOutbox,
} from '../data/sync';
import { computeRules, xpForLevel, getRankForLevel, type SystemRules } from '../utils/coreLogic';
import { supabase } from '../supabase/client';
import type {
  UserProfile, UserStats, UserPreferences,
  Quest, QuestStep, Campaign, BuffDebuff,
  FocusSession, StateCheckin, Reward,
  Achievement, SkillNode, UserSkillNode,
  DailyLog, WeeklyArc, AIRecommendation,
  BattleLogEntry, NarrativeEvent,
  Rank, StateTag, SessionType,
} from '../types';

// ─── MMKV storage adapter for zustand/persist ───
const mmkv = new MMKV({ id: 'shadow-system-store' });

const mmkvStorage = createJSONStorage(() => ({
  getItem: (key: string) => mmkv.getString(key) ?? null,
  setItem: (key: string, value: string) => mmkv.set(key, value),
  removeItem: (key: string) => mmkv.delete(key),
}));

// ─── Helpers (FIX #14: xpForLevel + getRankForLevel come from coreLogic) ───

function isSameDay(d1: string | null, d2: string | null): boolean {
  if (!d1 || !d2) return false;
  return d1.slice(0, 10) === d2.slice(0, 10);
}

function isYesterday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return dateStr.slice(0, 10) === yesterday.toISOString().slice(0, 10);
}

function daysBetween(d1: string, d2: string): number {
  const a = new Date(d1.slice(0, 10));
  const b = new Date(d2.slice(0, 10));
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Store Interface ───
interface ShadowStore {
  // ── Auth (FIX #1: real auth flow) ──
  isAuthenticated: boolean;
  hasOnboarded: boolean;
  setHasOnboarded: (val: boolean) => void;
  signIn: (email: string) => Promise<{ error?: string }>;
  signInWithOtp: (email: string) => Promise<{ error?: string }>;
  verifyOtp: (email: string, token: string) => Promise<{ error?: string }>;
  hydrateSession: () => Promise<void>;
  signOut: () => Promise<void>;

  // ── Identity System ──
  user: UserProfile;
  stats: UserStats;
  preferences: UserPreferences;
  updateUser: (partial: Partial<UserProfile>) => void;
  updateStats: (partial: Partial<UserStats>) => void;
  updatePreferences: (partial: Partial<UserPreferences>) => void;

  // ── Quest System ──
  quests: Quest[];
  questSteps: Record<string, QuestStep[]>;
  campaigns: Campaign[];
  addQuest: (quest: Quest) => void;
  updateQuest: (questId: string, partial: Partial<Quest>) => void;
  deleteQuest: (questId: string) => void;
  completeQuest: (questId: string) => void;
  addQuestStep: (questId: string, step: QuestStep) => void;
  toggleQuestStep: (questId: string, stepId: string) => void;
  setQuests: (quests: Quest[]) => void;

  // ── State System ──
  currentState: {
    energy: number;
    mood: number;
    stress: number;
    focus: number;
    stateTag: StateTag;
    isOverwhelmed: boolean;
  };
  buffs: BuffDebuff[];
  checkins: StateCheckin[];
  systemRules: SystemRules;
  updateCurrentState: (partial: Partial<ShadowStore['currentState']>) => void;
  addCheckin: (checkin: StateCheckin) => void;
  addBuff: (buff: BuffDebuff) => void;
  removeBuff: (buffId: string) => void;

  // ── Focus System ──
  activeFocusSession: FocusSession | null;
  focusHistory: FocusSession[];
  startFocusSession: (session: Omit<FocusSession, 'id' | 'startedAt' | 'actualMinutes' | 'completed' | 'distractionCount' | 'qualityScore'>) => void;
  endFocusSession: (completed: boolean, qualityScore: number) => void;
  logDistraction: () => void;

  // ── Progression System (date-aware) ──
  streak: number;
  combo: number;
  todayXP: number;
  lastActiveDate: string | null;     // ISO date string (YYYY-MM-DD)
  lastStreakDate: string | null;     // last day a quest was completed
  graceUsedAt: string | null;       // last grace day used
  comboLastAction: string | null;   // ISO timestamp of last combo action
  addXP: (amount: number, source?: string) => void;
  addCoins: (amount: number) => void;
  refreshStreakOnOpen: () => void;   // call on app open
  recordQuestCompletion: () => void; // updates streak + combo dates
  resetCombo: () => void;

  achievements: Achievement[];
  skillNodes: SkillNode[];
  unlockedSkills: UserSkillNode[];
  rewards: Reward[];
  unlockAchievement: (achievement: Achievement) => void;
  unlockSkillNode: (nodeId: string) => void;

  // ── Intelligence System ──
  recommendations: AIRecommendation[];
  addRecommendation: (rec: AIRecommendation) => void;

  // ── Narrative System (Phase 4) ──
  dailyLogs: DailyLog[];
  weeklyArcs: WeeklyArc[];
  currentArc: WeeklyArc | null;
  battleLog: BattleLogEntry[];
  narrativeEvents: NarrativeEvent[];
  addDailyLog: (log: DailyLog) => void;
  setCurrentArc: (arc: WeeklyArc) => void;
  addBattleEntry: (entry: Omit<BattleLogEntry, 'id' | 'timestamp'>) => void;
  addNarrativeEvent: (event: Omit<NarrativeEvent, 'id' | 'timestamp'>) => void;
  generateDailyLog: () => DailyLog | null;

  // ── Sync ──
  isSyncing: boolean;
  lastSyncAt: string | null;
  syncError: string | null;
  syncWithSupabase: () => Promise<void>;
}

// ─── Defaults (empty — no sample data) ───

const defaultUser: UserProfile = {
  id: '',
  email: '',
  displayName: 'Hunter',
  characterName: 'Hunter',
  rank: 'E',
  level: 1,
  xpTotal: 0,
  xpToNext: 1500,
  coins: 0,
  statPoints: 0,
  themeMode: 'hunter',
  reminderStyle: 'direct',
  playStyle: 'balanced',
  createdAt: new Date().toISOString(),
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

const defaultStats: UserStats = {
  id: '', userId: '',
  focusStat: 10, disciplineStat: 10, energyStat: 10,
  recoveryStat: 10, clarityStat: 10, courageStat: 10,
  updatedAt: new Date().toISOString(),
};

const defaultPreferences: UserPreferences = {
  id: '', userId: '',
  stimulationMode: 'medium',
  rewardSensitivity: 3,
  reminderTolerance: 3,
  overwhelmSensitivity: 3,
  timeBlindnessLevel: 'medium',
  preferredFocusLength: 25,
  aiTone: 'commander',
  reduceMotion: false,
  lowClutterMode: false,
  muteSounds: false,
  muteHaptics: false,
  bodyDoubleEnabled: false,
  bodyDoublePersonality: 'commander',
};

const defaultRules: SystemRules = {
  sortMode: 'priority',
  uiMode: 'normal',
  maxVisibleTasks: 10,
  xpMultiplier: 1.0,
  nudgeIntensity: 'direct',
  showRescuePrompt: false,
  suppressAnimations: false,
};

// ═══════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════
export const useShadowStore = create<ShadowStore>()(
  persist(
    (set, get) => ({
      // ── Auth (FIX #1: real Supabase auth) ──
      isAuthenticated: false,
      hasOnboarded: false,
      setHasOnboarded: (val) => set({ hasOnboarded: val }),

      // Magic link OTP flow
      signInWithOtp: async (email: string) => {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) return { error: error.message };
        return {};
      },

      verifyOtp: async (email: string, token: string) => {
        const { data, error } = await supabase.auth.verifyOtp({
          email, token, type: 'email',
        });
        if (error) return { error: error.message };
        if (data.session?.user) {
          const uid = data.session.user.id;
          set({
            isAuthenticated: true,
            user: { ...get().user, id: uid, email },
          });
          // Profile row created by DB trigger; hydrate it
          get().syncWithSupabase().catch(() => {});
        }
        return {};
      },

      // Anonymous / dev sign-in (for quick start without email)
      signIn: async (email: string) => {
        const { data, error } = await supabase.auth.signInWithOtp({ email });
        if (error) return { error: error.message };
        return {};
      },

      // Restore session on app open
      hydrateSession: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          set({
            isAuthenticated: true,
            user: { ...get().user, id: session.user.id, email: session.user.email || '' },
          });
        }
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ isAuthenticated: false, user: defaultUser });
      },

      // ── Identity ──
      user: defaultUser,
      stats: defaultStats,
      preferences: defaultPreferences,

      updateUser: (partial) => {
        set((s) => ({ user: { ...s.user, ...partial } }));
        const userId = get().user.id;
        if (userId) profilesRepo.update(userId, partial).catch(() => {});
      },

      updateStats: (partial) => {
        set((s) => ({
          stats: { ...s.stats, ...partial, updatedAt: new Date().toISOString() },
        }));
        const userId = get().user.id;
        if (userId) statsRepo.update(userId, partial).catch(() => {});
      },

      updatePreferences: (partial) => {
        set((s) => ({ preferences: { ...s.preferences, ...partial } }));
        const userId = get().user.id;
        if (userId) prefsRepo.update(userId, partial).catch(() => {});
      },

      // ── Quests (empty start) ──
      quests: [],
      questSteps: {},
      campaigns: [],

      addQuest: (quest) => {
        set((s) => ({ quests: [quest, ...s.quests] }));
        const userId = get().user.id;
        if (userId) questsRepo.upsert(userId, quest).catch(() => {});
      },

      updateQuest: (questId, partial) => {
        set((s) => ({
          quests: s.quests.map((q) => q.id === questId ? { ...q, ...partial } : q),
        }));
        // Sync updated quest
        const quest = get().quests.find((q) => q.id === questId);
        const userId = get().user.id;
        if (quest && userId) questsRepo.upsert(userId, quest).catch(() => {});
      },

      deleteQuest: (questId) => {
        set((s) => ({ quests: s.quests.filter((q) => q.id !== questId) }));
        const userId = get().user.id;
        if (userId) questsRepo.delete(userId, questId).catch(() => {});
      },

      completeQuest: (questId) => {
        const quest = get().quests.find((q) => q.id === questId);
        if (!quest) return;

        // Calculate XP with multipliers + state engine
        const { streak, combo, systemRules } = get();
        let xp = quest.xpReward;
        const streakBonus = Math.min(streak * XP_CONFIG.streakMultiplier, XP_CONFIG.streakMultiplierCap);
        const comboBonus = Math.min(combo * XP_CONFIG.comboMultiplier, XP_CONFIG.comboMultiplierCap);
        if (quest.questType === 'boss') xp *= XP_CONFIG.bossCompletionMultiplier;
        xp = Math.round(xp * (1 + streakBonus + comboBonus) * systemRules.xpMultiplier);

        get().addXP(xp, `quest:${questId}`);
        get().addCoins(quest.coinReward);
        get().recordQuestCompletion();

        set((s) => ({
          quests: s.quests.map((q) =>
            q.id === questId
              ? { ...q, status: 'done' as const, completedAt: new Date().toISOString() }
              : q
          ),
        }));

        // Phase 4: Auto battle log entry
        get().addBattleEntry({
          type: quest.questType === 'boss' ? 'boss_defeat' : 'quest_complete',
          title: quest.questType === 'boss' ? `Boss Defeated: ${quest.title}` : `Quest Complete: ${quest.title}`,
          description: `Earned ${xp} XP${quest.coinReward ? ` and ${quest.coinReward} coins` : ''}`,
          xpEarned: xp,
          icon: quest.questType === 'boss' ? '💀' : '⚔️',
        });

        // FIX #9: Sync both the quest AND the updated profile
        const userId = get().user.id;
        if (userId) {
          const updated = get().quests.find((q) => q.id === questId);
          if (updated) questsRepo.upsert(userId, updated).catch(() => {});

          // FIX #9: Sync profile progression (XP, level, rank, coins, streak)
          const { user, streak: newStreak, combo: newCombo } = get();
          profilesRepo.syncProgression(userId, {
            xpTotal: user.xpTotal,
            level: user.level,
            xpToNext: user.xpToNext,
            rank: user.rank,
            coins: user.coins,
            streak: newStreak,
            combo: newCombo,
            statPoints: user.statPoints,
          }).catch(() => {});
        }
      },

      addQuestStep: (questId, step) => {
        set((s) => ({
          questSteps: {
            ...s.questSteps,
            [questId]: [...(s.questSteps[questId] || []), step],
          },
        }));
        stepsRepo.upsert(questId, step).catch(() => {});
      },

      toggleQuestStep: (questId, stepId) => {
        const steps = get().questSteps[questId] || [];
        const step = steps.find((s) => s.id === stepId);
        if (!step) return;

        const wasDone = step.status === 'done';
        const updated: QuestStep = {
          ...step,
          status: wasDone ? 'pending' : 'done',
          completedAt: wasDone ? undefined : new Date().toISOString(),
        };

        set((s) => ({
          questSteps: {
            ...s.questSteps,
            [questId]: s.questSteps[questId]?.map((s) => s.id === stepId ? updated : s) || [],
          },
        }));

        // Micro-step XP (only on completion, not toggle-back)
        if (!wasDone) {
          get().addXP(XP_CONFIG.microStepBonus, `step:${stepId}`);
        }

        // Persist boss HP update — recalculate from completed steps
        const quest = get().quests.find((q) => q.id === questId);
        if (quest?.questType === 'boss' && quest.bossMaxHp) {
          const allSteps = get().questSteps[questId] || [];
          const doneCount = allSteps.filter((s) => s.status === 'done').length;
          const totalCount = Math.max(allSteps.length, 1);
          const newHp = Math.max(0, quest.bossMaxHp - Math.round((doneCount / totalCount) * quest.bossMaxHp));
          get().updateQuest(questId, { bossHp: newHp });
        }

        stepsRepo.upsert(questId, updated).catch(() => {});
      },

      setQuests: (quests) => set({ quests }),

      // ── State System ──
      currentState: {
        energy: 3, mood: 3, stress: 2, focus: 3,
        stateTag: 'clear' as StateTag,
        isOverwhelmed: false,
      },
      buffs: [],
      checkins: [],
      systemRules: defaultRules,

      updateCurrentState: (partial) => {
        set((s) => {
          const newState = { ...s.currentState, ...partial };

          // Auto-detect state tag + overwhelm
          if (newState.stress >= 4 && newState.energy <= 2) {
            newState.isOverwhelmed = true;
            newState.stateTag = 'overwhelmed';
          } else if (newState.energy <= 1) {
            newState.stateTag = 'low_energy';
            newState.isOverwhelmed = false;
          } else if (newState.focus >= 5) {
            newState.stateTag = 'hyperfocus';
            newState.isOverwhelmed = false;
          } else if (newState.focus >= 3 && newState.energy >= 3) {
            newState.stateTag = 'clear';
            newState.isOverwhelmed = false;
          }

          // #6 FIX: Recompute system rules from state
          const failedRecent = s.quests.filter((q) => q.status === 'failed').length;
          const rules = computeRules(newState, failedRecent, s.streak, s.preferences);

          return { currentState: newState, systemRules: rules };
        });

        // Persist checkin
        const userId = get().user.id;
        if (userId && partial.energy !== undefined) {
          const state = get().currentState;
          stateRepo.save(userId, {
            id: generateId('sc'),
            userId,
            mood: state.mood,
            energy: state.energy,
            stress: state.stress,
            focus: state.focus,
            stateTag: state.stateTag,
            createdAt: new Date().toISOString(),
          }).catch(() => {});
        }
      },

      addCheckin: (checkin) => set((s) => ({
        checkins: [checkin, ...s.checkins].slice(0, 50), // keep last 50
      })),

      addBuff: (buff) => set((s) => ({
        buffs: [...s.buffs, buff],
      })),

      removeBuff: (buffId) => set((s) => ({
        buffs: s.buffs.filter((b) => b.id !== buffId),
      })),

      // ── Focus System ──
      activeFocusSession: null,
      focusHistory: [],

      startFocusSession: (session) => {
        const newSession: FocusSession = {
          ...session,
          id: generateId('fs'),
          startedAt: new Date().toISOString(),
          actualMinutes: 0,
          completed: false,
          distractionCount: 0,
          qualityScore: 0,
        };
        set({ activeFocusSession: newSession });
      },

      endFocusSession: (completed, qualityScore) => {
        const session = get().activeFocusSession;
        if (!session) return;

        const ended: FocusSession = {
          ...session,
          endedAt: new Date().toISOString(),
          actualMinutes: Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000),
          completed,
          qualityScore,
        };

        set((s) => ({
          activeFocusSession: null,
          focusHistory: [ended, ...s.focusHistory].slice(0, 100), // keep last 100
        }));

        if (completed) {
          get().addXP(Math.round(ended.plannedMinutes * 2), `focus:${ended.id}`);
        }

        // Persist
        const userId = get().user.id;
        if (userId) focusRepo.save(userId, ended).catch(() => {});
      },

      logDistraction: () => set((s) => ({
        activeFocusSession: s.activeFocusSession
          ? { ...s.activeFocusSession, distractionCount: s.activeFocusSession.distractionCount + 1 }
          : null,
      })),

      // ── Progression System (date-aware) ──
      streak: 0,
      combo: 0,
      todayXP: 0,
      lastActiveDate: null,
      lastStreakDate: null,
      graceUsedAt: null,
      comboLastAction: null,

      addXP: (amount, _source) => set((s) => {
        let newXpTotal = s.user.xpTotal + amount;
        let newLevel = s.user.level;

        // Compute level from total XP
        let levelXp = newXpTotal;
        let tempLevel = 1;
        let tempNext = xpForLevel(1);
        while (levelXp >= tempNext && tempLevel < 999) {
          levelXp -= tempNext;
          tempLevel++;
          tempNext = xpForLevel(tempLevel);
        }
        newLevel = tempLevel;
        const newXpToNext = tempNext;
        const newRank = getRankForLevel(newLevel);
        const today = new Date().toISOString().slice(0, 10);

        // FIX #10: Award 1 stat point per 5 levels gained
        const oldLevelTier = Math.floor(s.user.level / 5);
        const newLevelTier = Math.floor(newLevel / 5);
        const statPointsGained = Math.max(0, newLevelTier - oldLevelTier);

        return {
          user: {
            ...s.user,
            xpTotal: newXpTotal,
            level: newLevel,
            xpToNext: newXpToNext,
            rank: newRank,
            statPoints: s.user.statPoints + statPointsGained,
          },
          todayXP: isSameDay(s.lastActiveDate, today) ? s.todayXP + amount : amount,
          lastActiveDate: today,
        };
      }),

      addCoins: (amount) => set((s) => ({
        user: { ...s.user, coins: s.user.coins + amount },
      })),

      // #7 FIX: Date-based streak with grace day
      refreshStreakOnOpen: () => set((s) => {
        const today = new Date().toISOString().slice(0, 10);
        const { lastStreakDate, graceUsedAt, streak } = s;

        // Already active today
        if (lastStreakDate === today) return {};

        // Active yesterday → streak continues (will extend on next completion)
        if (isYesterday(lastStreakDate)) return {};

        // Missed yesterday — check grace
        if (lastStreakDate) {
          const gap = daysBetween(lastStreakDate, today);

          // 1 day gap = yesterday was active, fine
          if (gap <= 1) return {};

          // 2 day gap = missed 1 day → use grace if available
          if (gap === 2 && graceUsedAt !== today) {
            return { graceUsedAt: today }; // grace preserves streak
          }

          // 3+ day gap or grace already used → reset
          if (gap >= 3 || (gap === 2 && graceUsedAt === today)) {
            return { streak: 0 };
          }
        }

        return {};
      }),

      recordQuestCompletion: () => set((s) => {
        const today = new Date().toISOString().slice(0, 10);
        const now = new Date().toISOString();

        // Streak: extend if not already recorded today
        const newStreak = s.lastStreakDate === today ? s.streak : s.streak + 1;

        // Combo: decay if >30 min since last action
        const comboTimeoutMs = 30 * 60 * 1000;
        const lastComboTime = s.comboLastAction ? new Date(s.comboLastAction).getTime() : 0;
        const comboStillActive = (Date.now() - lastComboTime) < comboTimeoutMs;
        const newCombo = comboStillActive ? s.combo + 1 : 1;

        return {
          streak: newStreak,
          lastStreakDate: today,
          combo: newCombo,
          comboLastAction: now,
        };
      }),

      resetCombo: () => set({ combo: 0, comboLastAction: null }),

      achievements: [],
      skillNodes: [],
      unlockedSkills: [],
      rewards: [],

      unlockAchievement: (achievement) => set((s) => ({
        achievements: [...s.achievements, { ...achievement, unlockedAt: new Date().toISOString() }],
      })),

      // FIX #10: Full skill tree unlock with prerequisites, stat point cost, stat bonuses
      unlockSkillNode: (nodeId) => {
        const { skillNodes, unlockedSkills, user, stats } = get();
        const node = skillNodes.find((n) => n.id === nodeId || n.key === nodeId);
        if (!node) return;

        // Already unlocked?
        if (unlockedSkills.some((us) => us.skillNodeId === node.id || us.skillNodeId === nodeId)) return;

        // Check level requirement (tier * 5)
        const requiredLevel = node.level * 5;
        if (user.level < requiredLevel) return;

        // Check stat point cost
        const cost = node.statPointCost || 0;
        if (user.statPoints < cost) return;

        // Check prerequisites — all required node keys must be unlocked
        if (node.requires && node.requires.length > 0) {
          const unlockedKeys = new Set(
            unlockedSkills.map((us) => {
              const n = skillNodes.find((sn) => sn.id === us.skillNodeId);
              return n?.key;
            }).filter(Boolean)
          );
          const allPrereqsMet = node.requires.every((reqKey: string) => unlockedKeys.has(reqKey));
          if (!allPrereqsMet) return;
        }

        // Deduct stat points
        const newStatPoints = user.statPoints - cost;

        // Apply stat bonuses
        const bonus = node.statBonus || {};
        const newStats = {
          ...stats,
          focusStat: stats.focusStat + (bonus.focus || 0),
          disciplineStat: stats.disciplineStat + (bonus.discipline || 0),
          energyStat: stats.energyStat + (bonus.energy || 0),
          recoveryStat: stats.recoveryStat + (bonus.recovery || 0),
          clarityStat: stats.clarityStat + (bonus.clarity || 0),
          courageStat: stats.courageStat + (bonus.courage || 0),
          updatedAt: new Date().toISOString(),
        };

        set((s) => ({
          user: { ...s.user, statPoints: newStatPoints },
          stats: newStats,
          unlockedSkills: [...s.unlockedSkills, {
            id: generateId('usn'),
            userId: s.user.id,
            skillNodeId: node.id,
            unlockedAt: new Date().toISOString(),
          }],
        }));

        // Sync to backend (prefer server RPC if available)
        const userId = get().user.id;
        if (userId) {
          supabase.rpc('unlock_skill_node', { p_node_key: node.key }).catch(() => {
            // Fallback: manual sync
            profilesRepo.update(userId, { statPoints: newStatPoints } as any).catch(() => {});
            statsRepo.update(userId, newStats).catch(() => {});
          });
        }
      },

      // ── Intelligence System ──
      recommendations: [],
      addRecommendation: (rec) => set((s) => ({
        recommendations: [rec, ...s.recommendations].slice(0, 20),
      })),

      // ── Narrative System (Phase 4) ──
      dailyLogs: [],
      weeklyArcs: [],
      currentArc: null,
      battleLog: [],
      narrativeEvents: [],

      addDailyLog: (log) => set((s) => ({
        dailyLogs: [log, ...s.dailyLogs].slice(0, 60),
      })),
      setCurrentArc: (arc) => set({ currentArc: arc }),

      addBattleEntry: (entry) => set((s) => ({
        battleLog: [{
          ...entry,
          id: `bl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
        }, ...s.battleLog].slice(0, 200), // keep 200 entries
      })),

      addNarrativeEvent: (event) => set((s) => ({
        narrativeEvents: [{
          ...event,
          id: `ne_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
        }, ...s.narrativeEvents].slice(0, 50),
      })),

      generateDailyLog: () => {
        const { user, quests, focusHistory, checkins, streak, buffs } = get();
        const today = new Date().toISOString().slice(0, 10);

        // Don't duplicate
        const existing = get().dailyLogs.find((l) => l.logDate === today);
        if (existing) return existing;

        const todayQuests = quests.filter((q) =>
          q.completedAt && q.completedAt.startsWith(today)
        );
        const todaySessions = focusHistory.filter((s) =>
          s.startedAt.startsWith(today)
        );
        const todayCheckins = checkins.filter((c) =>
          c.createdAt.startsWith(today)
        );

        const xpEarned = todayQuests.reduce((s, q) => s + (q.xpReward || 0), 0);
        const focusMins = todaySessions.reduce((s, f) => s + (f.actualMinutes || 0), 0);
        const dominantDebuff = todayCheckins.length > 0
          ? todayCheckins
              .map((c) => c.stateTag)
              .filter((t) => t !== 'normal')
              .sort((a, b) =>
                todayCheckins.filter((c) => c.stateTag === b).length -
                todayCheckins.filter((c) => c.stateTag === a).length
              )[0] || undefined
          : undefined;

        // Find main win (highest XP quest)
        const mainWin = todayQuests.sort((a, b) => (b.xpReward || 0) - (a.xpReward || 0))[0]?.title;

        const log: DailyLog = {
          id: `dl_${today}`,
          userId: user.id,
          logDate: today,
          questsCompleted: todayQuests.length,
          xpEarned,
          focusMinutes: focusMins,
          streakContinued: streak > 0,
          mainWin,
          dominantDebuff,
        };

        get().addDailyLog(log);
        return log;
      },

      // ── Sync ──
      isSyncing: false,
      lastSyncAt: null,
      syncError: null,

      syncWithSupabase: async () => {
        const userId = get().user.id;
        if (!userId) {
          // FIX #1: Try to hydrate session first
          await get().hydrateSession();
          const newUserId = get().user.id;
          if (!newUserId) return;
        }

        const uid = get().user.id;
        if (!uid) return;

        set({ isSyncing: true, syncError: null });
        try {
          // 1. Flush offline outbox
          await flushOutbox();

          // 2. FIX #8: Pull ALL domains, not just profile + quests
          const [profile, prefs, userStats, quests, nodes, unlocked, rwds, achs] =
            await Promise.allSettled([
              profilesRepo.fetch(uid),
              prefsRepo.fetch(uid),
              statsRepo.fetch(uid),
              questsRepo.fetchAll(uid),
              skillNodesRepo.fetchAll(),
              skillNodesRepo.fetchUnlocked(uid),
              rewardsRepo.fetchAll(uid),
              achievementsRepo.fetchAll(uid),
            ]);

          // Merge results — FIX #8: always set arrays even when empty
          const updates: Partial<ShadowStore> = {};

          if (profile.status === 'fulfilled' && profile.value) {
            updates.user = profile.value;
          }
          if (prefs.status === 'fulfilled' && prefs.value) {
            updates.preferences = prefs.value;
          }
          if (userStats.status === 'fulfilled' && userStats.value) {
            updates.stats = userStats.value;
          }
          if (quests.status === 'fulfilled') {
            updates.quests = quests.value; // FIX #8: set even if empty (handles deletions)
          }
          if (nodes.status === 'fulfilled') {
            updates.skillNodes = nodes.value;
          }
          if (unlocked.status === 'fulfilled') {
            updates.unlockedSkills = unlocked.value;
          }
          if (rwds.status === 'fulfilled') {
            updates.rewards = rwds.value;
          }
          if (achs.status === 'fulfilled') {
            updates.achievements = achs.value;
          }

          set(updates as any);

          // 3. Pull steps for active quests
          const activeQuests = (updates.quests || get().quests)
            .filter((q: Quest) => q.status === 'active' || q.status === 'in_progress');

          if (activeQuests.length > 0) {
            const stepEntries = await Promise.all(
              activeQuests.map(async (q: Quest) => {
                const steps = await stepsRepo.fetchForQuest(q.id);
                return [q.id, steps] as [string, QuestStep[]];
              })
            );
            const stepMap: Record<string, QuestStep[]> = {};
            for (const [qid, steps] of stepEntries) {
              stepMap[qid] = steps;
            }
            set((s) => ({ questSteps: { ...s.questSteps, ...stepMap } }));
          }

          set({ lastSyncAt: new Date().toISOString(), isSyncing: false });
        } catch (e: any) {
          set({ syncError: e?.message || 'Sync failed', isSyncing: false });
        }
      },
    }),
    {
      name: 'shadow-store',
      storage: mmkvStorage,
      // Persist everything except transient state
      partialize: (state) => ({
        hasOnboarded: state.hasOnboarded,
        user: state.user,
        stats: state.stats,
        preferences: state.preferences,
        quests: state.quests,
        questSteps: state.questSteps,
        campaigns: state.campaigns,
        currentState: state.currentState,
        buffs: state.buffs,
        focusHistory: state.focusHistory,
        streak: state.streak,
        combo: state.combo,
        todayXP: state.todayXP,
        lastActiveDate: state.lastActiveDate,
        lastStreakDate: state.lastStreakDate,
        graceUsedAt: state.graceUsedAt,
        comboLastAction: state.comboLastAction,
        achievements: state.achievements,
        unlockedSkills: state.unlockedSkills,
        rewards: state.rewards,
        dailyLogs: state.dailyLogs,
        weeklyArcs: state.weeklyArcs,
        currentArc: state.currentArc,
        battleLog: state.battleLog,
        narrativeEvents: state.narrativeEvents,
        systemRules: state.systemRules,
      }),
    }
  )
);

// ─── Selectors ───
export const useActiveQuests = () =>
  useShadowStore((s) => s.quests.filter((q) => q.status === 'active' || q.status === 'in_progress'));

export const useBossQuests = () =>
  useShadowStore((s) => s.quests.filter((q) => q.questType === 'boss' && q.status !== 'done'));

export const useQuestById = (id: string) =>
  useShadowStore((s) => s.quests.find((q) => q.id === id));

export const useQuestSteps = (questId: string) =>
  useShadowStore((s) => s.questSteps[questId] || []);

export const useActiveBuffs = () =>
  useShadowStore((s) => s.buffs.filter((b) => b.type === 'buff' && b.active));

export const useActiveDebuffs = () =>
  useShadowStore((s) => s.buffs.filter((b) => b.type === 'debuff' && b.active));

export const useIsOverwhelmed = () =>
  useShadowStore((s) => s.currentState.isOverwhelmed);

export const useSystemRules = () =>
  useShadowStore((s) => s.systemRules);

export const useXPProgress = () =>
  useShadowStore((s) => {
    // Compute XP within current level
    let levelXp = s.user.xpTotal;
    let lvl = 1;
    while (lvl < s.user.level) {
      levelXp -= xpForLevel(lvl);
      lvl++;
    }
    const currentLevelXp = Math.max(0, levelXp);
    return {
      current: currentLevelXp,
      total: s.user.xpToNext,
      percentage: s.user.xpToNext > 0 ? (currentLevelXp / s.user.xpToNext) * 100 : 0,
    };
  });
