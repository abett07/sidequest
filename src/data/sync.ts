// ═══════════════════════════════════════════════════
// DATA SYNC LAYER — Supabase ↔ Local MMKV
// v1.2 FIXES:
//  #7  pushOutbox returns exact id; clear uses that id
//  #8  Full sync: profile, quests, steps, prefs, stats
//  #9  Profile sync after XP/coin/streak changes
// ═══════════════════════════════════════════════════

import { MMKV } from 'react-native-mmkv';
import { supabase } from '../supabase/client';
import type { Quest, QuestStep, UserProfile, UserStats, UserPreferences, FocusSession, StateCheckin } from '../types';

const cache = new MMKV({ id: 'shadow-cache' });
const outboxStore = new MMKV({ id: 'shadow-outbox' });

// ─── Cache helpers ───

function cacheGet<T>(key: string): T | null {
  const raw = cache.getString(key);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

function cacheSet(key: string, value: unknown): void {
  cache.set(key, JSON.stringify(value));
}

// ─── Outbox: queue writes for retry ───

interface OutboxEntry {
  id: string;
  table: string;
  operation: 'upsert' | 'update' | 'delete';
  payload: Record<string, unknown>;
  matchKey: string; // which field to match on for update/delete (default: 'id')
  createdAt: string;
}

// #7 FIX: Returns the generated id so callers can clear the exact entry
function pushOutbox(entry: Omit<OutboxEntry, 'id' | 'createdAt'>): string {
  const id = `ob_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const full: OutboxEntry = { ...entry, id, createdAt: new Date().toISOString() };
  const queue = getOutboxQueue();
  queue.push(full);
  outboxStore.set('queue', JSON.stringify(queue));
  return id;
}

function getOutboxQueue(): OutboxEntry[] {
  const raw = outboxStore.getString('queue');
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function clearOutboxEntry(id: string): void {
  if (!id) return;
  const queue = getOutboxQueue().filter((e) => e.id !== id);
  outboxStore.set('queue', JSON.stringify(queue));
}

// ─── Flush outbox ───

export async function flushOutbox(): Promise<{ flushed: number; failed: number }> {
  const queue = getOutboxQueue();
  let flushed = 0;
  let failed = 0;

  for (const entry of queue) {
    try {
      const mk = entry.matchKey || 'id';
      if (entry.operation === 'upsert') {
        const { error } = await supabase.from(entry.table).upsert(entry.payload);
        if (error) throw error;
      } else if (entry.operation === 'update') {
        const matchVal = entry.payload[mk];
        const rest = { ...entry.payload };
        delete rest[mk];
        const { error } = await supabase.from(entry.table).update(rest).eq(mk, matchVal);
        if (error) throw error;
      } else if (entry.operation === 'delete') {
        const { error } = await supabase.from(entry.table).delete().eq(mk, entry.payload[mk]);
        if (error) throw error;
      }
      clearOutboxEntry(entry.id);
      flushed++;
    } catch {
      failed++;
    }
  }
  return { flushed, failed };
}

// ─── Shared helper: push + try immediate + clear exact entry ───
async function pushAndTryWrite(
  table: string,
  operation: 'upsert' | 'update' | 'delete',
  payload: Record<string, unknown>,
  matchKey: string = 'id',
): Promise<void> {
  const outboxId = pushOutbox({ table, operation, payload, matchKey });
  try {
    if (operation === 'upsert') {
      const { error } = await supabase.from(table).upsert(payload);
      if (error) throw error;
    } else if (operation === 'update') {
      const matchVal = payload[matchKey];
      const rest = { ...payload };
      delete rest[matchKey];
      const { error } = await supabase.from(table).update(rest).eq(matchKey, matchVal);
      if (error) throw error;
    } else if (operation === 'delete') {
      const { error } = await supabase.from(table).delete().eq(matchKey, payload[matchKey]);
      if (error) throw error;
    }
    clearOutboxEntry(outboxId); // #7 FIX: clear exact entry
  } catch {
    // Stays in outbox for flushOutbox() retry
  }
}

// ═══════════════════════════════════════════════════
// REPOSITORIES
// ═══════════════════════════════════════════════════

// ─── Profiles (was "users") ───

export const profilesRepo = {
  async fetchProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (data && !error) {
        const mapped = mapDbUser(data);
        cacheSet(`user:${userId}`, mapped);
        return mapped;
      }
    } catch {}
    return cacheGet<UserProfile>(`user:${userId}`);
  },

  async updateProfile(userId: string, partial: Partial<UserProfile>): Promise<void> {
    const dbPayload = mapUserToDb(partial);
    const existing = cacheGet<UserProfile>(`user:${userId}`) || {};
    cacheSet(`user:${userId}`, { ...existing, ...partial });
    await pushAndTryWrite('profiles', 'update', { id: userId, ...dbPayload });
  },

  // FIX #9: Dedicated method for progression updates
  async syncProgression(userId: string, data: {
    xpTotal: number; level: number; xpToNext: number;
    rank: string; coins: number; streak: number; combo: number;
    statPoints?: number;
  }): Promise<void> {
    const dbPayload: Record<string, unknown> = {
      xp_total: data.xpTotal, level: data.level,
      xp_to_next: data.xpToNext, rank: data.rank,
      coins: data.coins, streak: data.streak, combo: data.combo,
      last_active_date: new Date().toISOString().slice(0, 10),
    };
    if (data.statPoints !== undefined) dbPayload.stat_points = data.statPoints;
    await pushAndTryWrite('profiles', 'update', { id: userId, ...dbPayload });
  },

  // Alias for store compat
  async update(userId: string, partial: Partial<UserProfile>): Promise<void> {
    return profilesRepo.updateProfile(userId, partial);
  },

  // Short alias
  async fetch(userId: string): Promise<UserProfile | null> {
    return profilesRepo.fetchProfile(userId);
  },
};

// ─── Preferences ───

export const prefsRepo = {
  async fetch(userId: string): Promise<UserPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (data && !error) {
        const mapped = mapDbPrefs(data);
        cacheSet(`prefs:${userId}`, mapped);
        return mapped;
      }
    } catch {}
    return cacheGet<UserPreferences>(`prefs:${userId}`);
  },

  async update(userId: string, partial: Partial<UserPreferences>): Promise<void> {
    const dbPayload = mapPrefsToDb(partial);
    const existing = cacheGet<UserPreferences>(`prefs:${userId}`) || {};
    cacheSet(`prefs:${userId}`, { ...existing, ...partial });
    await pushAndTryWrite('user_preferences', 'update', { user_id: userId, ...dbPayload }, 'user_id');
  },
};

// ─── User Stats ───

export const statsRepo = {
  async fetch(userId: string): Promise<UserStats | null> {
    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (data && !error) {
        const mapped = mapDbStats(data);
        cacheSet(`stats:${userId}`, mapped);
        return mapped;
      }
    } catch {}
    return cacheGet<UserStats>(`stats:${userId}`);
  },

  async update(userId: string, partial: Partial<UserStats>): Promise<void> {
    const dbPayload: Record<string, unknown> = {};
    if (partial.focusStat !== undefined)      dbPayload.focus_stat = partial.focusStat;
    if (partial.disciplineStat !== undefined) dbPayload.discipline_stat = partial.disciplineStat;
    if (partial.energyStat !== undefined)     dbPayload.energy_stat = partial.energyStat;
    if (partial.recoveryStat !== undefined)   dbPayload.recovery_stat = partial.recoveryStat;
    if (partial.clarityStat !== undefined)    dbPayload.clarity_stat = partial.clarityStat;
    if (partial.courageStat !== undefined)    dbPayload.courage_stat = partial.courageStat;
    dbPayload.updated_at = new Date().toISOString();

    const existing = cacheGet<UserStats>(`stats:${userId}`) || {};
    cacheSet(`stats:${userId}`, { ...existing, ...partial });
    await pushAndTryWrite('user_stats', 'update', { user_id: userId, ...dbPayload }, 'user_id');
  },
};

// ─── Quests ───

export const questsRepo = {
  async fetchAll(userId: string): Promise<Quest[]> {
    try {
      const { data, error } = await supabase
        .from('quests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (data && !error) {
        const mapped = data.map(mapDbQuest);
        cacheSet(`quests:${userId}`, mapped);
        return mapped;
      }
    } catch {}
    return cacheGet<Quest[]>(`quests:${userId}`) || [];
  },

  async upsert(userId: string, quest: Quest): Promise<void> {
    const dbPayload = mapQuestToDb(userId, quest);
    const cached = cacheGet<Quest[]>(`quests:${userId}`) || [];
    const idx = cached.findIndex((q) => q.id === quest.id);
    if (idx >= 0) cached[idx] = quest;
    else cached.unshift(quest);
    cacheSet(`quests:${userId}`, cached);
    await pushAndTryWrite('quests', 'upsert', dbPayload);
  },

  async delete(userId: string, questId: string): Promise<void> {
    const cached = cacheGet<Quest[]>(`quests:${userId}`) || [];
    cacheSet(`quests:${userId}`, cached.filter((q) => q.id !== questId));
    await pushAndTryWrite('quests', 'delete', { id: questId });
  },
};

// ─── Quest Steps ───

export const stepsRepo = {
  async fetchForQuest(questId: string): Promise<QuestStep[]> {
    try {
      const { data, error } = await supabase
        .from('quest_steps')
        .select('*')
        .eq('quest_id', questId)
        .order('step_order');
      if (data && !error) {
        const mapped = data.map(mapDbStep);
        cacheSet(`steps:${questId}`, mapped);
        return mapped;
      }
    } catch {}
    return cacheGet<QuestStep[]>(`steps:${questId}`) || [];
  },

  async upsert(questId: string, step: QuestStep): Promise<void> {
    const dbPayload = mapStepToDb(step);
    const cached = cacheGet<QuestStep[]>(`steps:${questId}`) || [];
    const idx = cached.findIndex((s) => s.id === step.id);
    if (idx >= 0) cached[idx] = step;
    else cached.push(step);
    cacheSet(`steps:${questId}`, cached);
    await pushAndTryWrite('quest_steps', 'upsert', dbPayload);
  },
};

// ─── Focus Sessions ───

export const focusRepo = {
  async save(userId: string, session: FocusSession): Promise<void> {
    await pushAndTryWrite('focus_sessions', 'upsert', {
      id: session.id,
      user_id: userId,
      quest_id: session.questId || null,
      session_type: session.sessionType,
      planned_minutes: session.plannedMinutes,
      actual_minutes: session.actualMinutes,
      completed: session.completed,
      distraction_count: session.distractionCount,
      quality_score: session.qualityScore,
      started_at: session.startedAt,
      ended_at: session.endedAt || null,
    });
  },
};

// ─── State Checkins ───

export const stateRepo = {
  async save(userId: string, checkin: StateCheckin): Promise<void> {
    await pushAndTryWrite('state_checkins', 'upsert', {
      id: checkin.id,
      user_id: userId,
      mood: checkin.mood,
      energy: checkin.energy,
      stress: checkin.stress,
      focus: checkin.focus,
      state_tag: checkin.stateTag,
      notes: checkin.notes || null,
      created_at: checkin.createdAt,
    });
  },
};

// ─── Server RPCs (#9, #10) ───

export async function rpcCompleteQuest(
  userId: string, questId: string, xpEarned: number, coinsEarned: number,
): Promise<{ ok: boolean; new_xp_total?: number; new_streak?: number; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('complete_quest', {
      p_user_id: userId, p_quest_id: questId, p_xp_earned: xpEarned, p_coins_earned: coinsEarned,
    });
    if (error) throw error;
    return data;
  } catch (e: any) {
    return { ok: false, error: e?.message || 'RPC failed' };
  }
}

export async function rpcUnlockSkill(
  userId: string, nodeKey: string, cost: number = 1,
): Promise<{ ok: boolean; stat_bonus?: Record<string, number>; remaining_points?: number; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('unlock_skill_node', {
      p_user_id: userId, p_node_key: nodeKey, p_cost: cost,
    });
    if (error) throw error;
    return data;
  } catch (e: any) {
    return { ok: false, error: e?.message || 'RPC failed' };
  }
}

// ─── Skill Nodes (FIX #8: was missing from sync) ───

export const skillNodesRepo = {
  async fetchAll(): Promise<any[]> {
    try {
      const { data, error } = await supabase.from('skill_nodes').select('*').order('level');
      if (data && !error) {
        cacheSet('skill_nodes', data.map(mapDbSkillNode));
        return data.map(mapDbSkillNode);
      }
    } catch {}
    return cacheGet<any[]>('skill_nodes') || [];
  },

  async fetchUnlocked(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('user_skill_nodes').select('*').eq('user_id', userId);
      if (data && !error) {
        const mapped = data.map((r: any) => ({
          id: r.id, userId: r.user_id, skillNodeId: r.skill_node_id, unlockedAt: r.unlocked_at,
        }));
        cacheSet(`unlocked_skills:${userId}`, mapped);
        return mapped;
      }
    } catch {}
    return cacheGet<any[]>(`unlocked_skills:${userId}`) || [];
  },
};

// ─── Rewards (FIX #8) ───

export const rewardsRepo = {
  async fetchAll(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('rewards').select('*').eq('user_id', userId);
      if (data && !error) {
        cacheSet(`rewards:${userId}`, data);
        return data;
      }
    } catch {}
    return cacheGet<any[]>(`rewards:${userId}`) || [];
  },
};

// ─── Achievements (FIX #8) ───

export const achievementsRepo = {
  async fetchAll(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('achievements').select('*').eq('user_id', userId);
      if (data && !error) {
        cacheSet(`achievements:${userId}`, data);
        return data;
      }
    } catch {}
    return cacheGet<any[]>(`achievements:${userId}`) || [];
  },
};

// ─── Skill node mapper ───

function mapDbSkillNode(row: any): any {
  return {
    id: row.id, key: row.key, branch: row.branch,
    title: row.title, description: row.description || '',
    unlockRule: row.unlock_rule || '', statBonus: row.stat_bonus || {},
    statPointCost: row.stat_point_cost || 0,
    icon: row.icon || '⚡', requires: row.requires || [],
    level: row.level || 1,
  };
}

// ═══════════════════════════════════════════════════
// DB ↔ App mappers
// ═══════════════════════════════════════════════════

function mapDbUser(row: any): UserProfile {
  return {
    id: row.id,
    email: row.email || '',
    displayName: row.display_name || 'Hunter',
    characterName: row.character_name || 'Hunter',
    rank: row.rank || 'E',
    level: row.level || 1,
    xpTotal: row.xp_total || 0,
    xpToNext: row.xp_to_next || 1500,
    coins: row.coins || 0,
    statPoints: row.stat_points || 0,
    themeMode: row.theme_mode || 'hunter',
    reminderStyle: row.reminder_style || 'direct',
    playStyle: row.play_style || 'balanced',
    createdAt: row.created_at,
    timezone: row.timezone || 'UTC',
  };
}

function mapUserToDb(partial: Partial<UserProfile>): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  if (partial.displayName !== undefined)    m.display_name = partial.displayName;
  if (partial.characterName !== undefined)  m.character_name = partial.characterName;
  if (partial.rank !== undefined)           m.rank = partial.rank;
  if (partial.level !== undefined)          m.level = partial.level;
  if (partial.xpTotal !== undefined)        m.xp_total = partial.xpTotal;
  if (partial.xpToNext !== undefined)       m.xp_to_next = partial.xpToNext;
  if (partial.coins !== undefined)          m.coins = partial.coins;
  if (partial.statPoints !== undefined)     m.stat_points = partial.statPoints;
  if (partial.themeMode !== undefined)      m.theme_mode = partial.themeMode;
  if (partial.reminderStyle !== undefined)  m.reminder_style = partial.reminderStyle;
  if (partial.playStyle !== undefined)      m.play_style = partial.playStyle;
  return m;
}

function mapDbPrefs(row: any): UserPreferences {
  return {
    id: row.id, userId: row.user_id,
    stimulationMode: row.stimulation_mode || 'medium',
    rewardSensitivity: row.reward_sensitivity || 3,
    reminderTolerance: row.reminder_tolerance || 3,
    overwhelmSensitivity: row.overwhelm_sensitivity || 3,
    timeBlindnessLevel: row.time_blindness_level || 'medium',
    preferredFocusLength: row.preferred_focus_length || 25,
    aiTone: row.ai_tone || 'commander',
    reduceMotion: row.reduce_motion ?? false,
    lowClutterMode: row.low_clutter_mode ?? false,
    muteSounds: row.mute_sounds ?? false,
    muteHaptics: row.mute_haptics ?? false,
    bodyDoubleEnabled: row.body_double_enabled ?? false,
    bodyDoublePersonality: row.body_double_personality || 'commander',
  };
}

function mapPrefsToDb(partial: Partial<UserPreferences>): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  if (partial.stimulationMode !== undefined)       m.stimulation_mode = partial.stimulationMode;
  if (partial.rewardSensitivity !== undefined)     m.reward_sensitivity = partial.rewardSensitivity;
  if (partial.reminderTolerance !== undefined)     m.reminder_tolerance = partial.reminderTolerance;
  if (partial.overwhelmSensitivity !== undefined)  m.overwhelm_sensitivity = partial.overwhelmSensitivity;
  if (partial.timeBlindnessLevel !== undefined)    m.time_blindness_level = partial.timeBlindnessLevel;
  if (partial.preferredFocusLength !== undefined)  m.preferred_focus_length = partial.preferredFocusLength;
  if (partial.aiTone !== undefined)                m.ai_tone = partial.aiTone;
  if (partial.reduceMotion !== undefined)          m.reduce_motion = partial.reduceMotion;
  if (partial.lowClutterMode !== undefined)        m.low_clutter_mode = partial.lowClutterMode;
  if (partial.muteSounds !== undefined)            m.mute_sounds = partial.muteSounds;
  if (partial.muteHaptics !== undefined)           m.mute_haptics = partial.muteHaptics;
  if (partial.bodyDoubleEnabled !== undefined)     m.body_double_enabled = partial.bodyDoubleEnabled;
  if (partial.bodyDoublePersonality !== undefined) m.body_double_personality = partial.bodyDoublePersonality;
  return m;
}

function mapDbStats(row: any): UserStats {
  return {
    id: row.id, userId: row.user_id,
    focusStat: row.focus_stat || 10, disciplineStat: row.discipline_stat || 10,
    energyStat: row.energy_stat || 10, recoveryStat: row.recovery_stat || 10,
    clarityStat: row.clarity_stat || 10, courageStat: row.courage_stat || 10,
    updatedAt: row.updated_at,
  };
}

function mapDbQuest(row: any): Quest {
  return {
    id: row.id, userId: row.user_id,
    campaignId: row.campaign_id || undefined,
    title: row.title, description: row.description || '',
    category: row.category, questType: row.quest_type || 'normal',
    status: row.status || 'active', priority: row.priority || 'medium',
    difficultyScore: row.difficulty_score || 2,
    emotionalWeightScore: row.emotional_weight_score || 2,
    frictionScore: row.friction_score || 2,
    estimatedMinutes: row.estimated_minutes || 30,
    dueAt: row.due_at || undefined, scheduledFor: row.scheduled_for || undefined,
    xpReward: row.xp_reward || 100, coinReward: row.coin_reward || 10,
    bossHp: row.boss_hp || undefined, bossMaxHp: row.boss_max_hp || undefined,
    bossName: row.boss_name || undefined, bossWeakPoints: row.boss_weak_points || undefined,
    createdAt: row.created_at, completedAt: row.completed_at || undefined,
  };
}

function mapQuestToDb(userId: string, q: Quest): Record<string, unknown> {
  return {
    id: q.id, user_id: userId, campaign_id: q.campaignId || null,
    title: q.title, description: q.description || null,
    category: q.category, quest_type: q.questType, status: q.status, priority: q.priority,
    difficulty_score: q.difficultyScore, emotional_weight_score: q.emotionalWeightScore,
    friction_score: q.frictionScore, estimated_minutes: q.estimatedMinutes,
    due_at: q.dueAt || null, scheduled_for: q.scheduledFor || null,
    xp_reward: q.xpReward, coin_reward: q.coinReward,
    boss_hp: q.bossHp || null, boss_max_hp: q.bossMaxHp || null,
    boss_name: q.bossName || null, boss_weak_points: q.bossWeakPoints || [],
    created_at: q.createdAt, completed_at: q.completedAt || null,
  };
}

function mapDbStep(row: any): QuestStep {
  return {
    id: row.id, questId: row.quest_id, stepOrder: row.step_order,
    title: row.title, isRequired: row.is_required ?? true,
    status: row.status || 'pending',
    estimatedMinutes: row.estimated_minutes, completedAt: row.completed_at || undefined,
  };
}

function mapStepToDb(s: QuestStep): Record<string, unknown> {
  return {
    id: s.id, quest_id: s.questId, step_order: s.stepOrder,
    title: s.title, is_required: s.isRequired, status: s.status,
    estimated_minutes: s.estimatedMinutes || null,
    completed_at: s.completedAt || null,
  };
}

export function getCachedQuests(userId: string): Quest[] {
  return cacheGet<Quest[]>(`quests:${userId}`) || [];
}
export function getCachedSteps(questId: string): QuestStep[] {
  return cacheGet<QuestStep[]>(`steps:${questId}`) || [];
}
export function clearAllCache(): void {
  cache.clearAll();
  outboxStore.clearAll();
}
