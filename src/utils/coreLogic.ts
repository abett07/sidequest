// ═══════════════════════════════════════════════════
// SHADOW SYSTEM — Core Logic Utilities
// XP calculation, recommendations, adaptive UI
// ═══════════════════════════════════════════════════

import { XP_CONFIG, RANK_THRESHOLDS } from '../constants/theme';
import type { Quest, StateCheckin, Rank, StateTag } from '../types';

// ─── XP Calculation ───

export function calculateXPReward(
  quest: Quest,
  streak: number,
  combo: number,
): number {
  let xp = quest.xpReward;

  // Task start bonus
  xp += XP_CONFIG.taskStartBonus;

  // Boss multiplier
  if (quest.questType === 'boss') {
    xp *= XP_CONFIG.bossCompletionMultiplier;
  }

  // Streak multiplier (capped)
  const streakBonus = Math.min(
    streak * XP_CONFIG.streakMultiplier,
    XP_CONFIG.streakMultiplierCap,
  );

  // Combo multiplier (capped)
  const comboBonus = Math.min(
    combo * XP_CONFIG.comboMultiplier,
    XP_CONFIG.comboMultiplierCap,
  );

  return Math.round(xp * (1 + streakBonus + comboBonus));
}

export function xpForLevel(level: number): number {
  return XP_CONFIG.baseXP + level * XP_CONFIG.levelMultiplier;
}

export function getRankForLevel(level: number): Rank {
  const entries = Object.entries(RANK_THRESHOLDS)
    .sort((a, b) => b[1].minLevel - a[1].minLevel);
  for (const [rank, { minLevel }] of entries) {
    if (level >= minLevel) return rank as Rank;
  }
  return 'E';
}

// ─── Task Recommendation Engine ───

interface TaskScore {
  questId: string;
  score: number;
  reason: string;
}

export function rankTasks(
  quests: Quest[],
  state: {
    energy: number;
    focus: number;
    stress: number;
    stateTag: StateTag;
    isOverwhelmed: boolean;
  },
  timeAvailableMinutes: number = 60,
): TaskScore[] {
  return quests
    .filter((q) => q.status === 'active' || q.status === 'in_progress')
    .map((q) => {
      let score = 0;
      let reason = '';

      // Priority weight (0-40 points)
      const priorityWeight = { low: 5, medium: 15, high: 30, critical: 40 };
      score += priorityWeight[q.priority] || 10;

      // State fit (-20 to +20 points)
      if (state.isOverwhelmed) {
        // When overwhelmed, strongly favor easy tasks
        score += (5 - q.difficultyScore) * 8;
        score -= q.emotionalWeightScore * 5;
        reason = 'Easy win while overwhelmed';
      } else if (state.energy <= 2) {
        // Low energy → favor low-difficulty
        score += (5 - q.difficultyScore) * 5;
        reason = 'Low energy task';
      } else if (state.focus >= 4) {
        // High focus → can handle hard tasks
        score += q.difficultyScore * 3;
        score += q.xpReward / 20;
        reason = 'High focus — maximize impact';
      }

      // Friction risk (-15 to 0 points)
      score -= q.frictionScore * 3;

      // Time fit (0-15 points)
      if (q.estimatedMinutes <= timeAvailableMinutes) {
        score += 10;
        if (q.estimatedMinutes <= timeAvailableMinutes * 0.5) {
          score += 5; // Bonus for quick tasks
        }
      } else {
        score -= 10; // Penalty for not fitting
      }

      // Reward value (0-10 points)
      score += Math.min(q.xpReward / 50, 10);

      // Boss bonus during good state
      if (q.questType === 'boss' && state.focus >= 3 && state.energy >= 3) {
        score += 15;
        reason = 'Good state for boss fight';
      }

      return { questId: q.id, score: Math.round(score), reason: reason || 'Standard priority' };
    })
    .sort((a, b) => b.score - a.score);
}

// ─── Adaptive Simplification ───

export interface UIAdaptation {
  reduceVisibleTasks: boolean;
  maxVisibleTasks: number;
  suppressAnimations: boolean;
  showRescuePrompt: boolean;
  prioritizeEasyWins: boolean;
  hideNonEssential: boolean;
  rewardMultiplier: number;
  reminderIntensity: 'gentle' | 'direct' | 'intense';
}

export function calculateUIAdaptation(
  state: {
    energy: number;
    focus: number;
    stress: number;
    stateTag: StateTag;
    isOverwhelmed: boolean;
  },
  recentMissedTasks: number,
  preferences: {
    overwhelmSensitivity: number;
    reminderTolerance: number;
    rewardSensitivity: number;
  },
): UIAdaptation {
  const isStrugging = state.isOverwhelmed || recentMissedTasks >= 3;
  const isLowEnergy = state.energy <= 2;
  const isHighStress = state.stress >= 4;

  return {
    reduceVisibleTasks: isStrugging || isHighStress,
    maxVisibleTasks: isStrugging ? 3 : isLowEnergy ? 5 : 10,
    suppressAnimations: isStrugging && preferences.overwhelmSensitivity >= 4,
    showRescuePrompt: isStrugging,
    prioritizeEasyWins: isStrugging || isLowEnergy,
    hideNonEssential: isStrugging,
    rewardMultiplier: isStrugging ? 1.5 : 1.0,  // Bonus XP when struggling
    reminderIntensity: isStrugging ? 'gentle' : 'direct',
  };
}

// ─── State Tag Detection ───

export function detectStateTag(
  energy: number,
  mood: number,
  stress: number,
  focus: number,
): StateTag {
  if (stress >= 4 && energy <= 2) return 'overwhelmed';
  if (energy <= 1) return 'low_energy';
  if (stress >= 4) return 'anxious';
  if (focus <= 1) return 'distracted';
  if (mood <= 1 && energy <= 2) return 'frozen';
  if (focus >= 5) return 'hyperfocus';
  if (mood >= 4 && focus >= 3) return 'motivated';
  return 'clear';
}

// ─── Buff/Debuff Auto-Detection ───

export function detectBuffsDebuffs(
  timeOfDay: number,  // 0-23
  streak: number,
  recentDistractions: number,
  sleepDebt: boolean,
  state: { energy: number; focus: number; stress: number },
): Array<{ name: string; type: 'buff' | 'debuff'; icon: string; color: string }> {
  const results: Array<{ name: string; type: 'buff' | 'debuff'; icon: string; color: string }> = [];

  // Buffs
  if (timeOfDay >= 6 && timeOfDay <= 10) {
    results.push({ name: 'Morning Momentum', type: 'buff', icon: '☀️', color: '#FFD700' });
  }
  if (state.focus >= 4) {
    results.push({ name: 'Deep Focus', type: 'buff', icon: '🎯', color: '#00E5FF' });
  }
  if (streak >= 7) {
    results.push({ name: 'Streak Fire', type: 'buff', icon: '🔥', color: '#FF6B35' });
  }

  // Debuffs
  if (sleepDebt) {
    results.push({ name: 'Sleep Debt', type: 'debuff', icon: '😴', color: '#B388FF' });
  }
  if (recentDistractions >= 5) {
    results.push({ name: 'Doomscroll Drift', type: 'debuff', icon: '👁️', color: '#FF1744' });
  }
  if (state.stress >= 4) {
    results.push({ name: 'Overload', type: 'debuff', icon: '⚡', color: '#FF1744' });
  }
  if (state.energy <= 1 && state.focus <= 2) {
    results.push({ name: 'Task Paralysis', type: 'debuff', icon: '❄️', color: '#00E5FF' });
  }

  return results;
}

// ─── Failure Handling ───

export type FailureOption = 'shrink' | 'reschedule' | 'delegate' | 'convert_to_boss' | 'archive';

export function getFailureOptions(quest: Quest): Array<{ action: FailureOption; label: string; icon: string }> {
  const options: Array<{ action: FailureOption; label: string; icon: string }> = [
    { action: 'shrink', label: 'Shrink to micro-task', icon: '🔬' },
    { action: 'reschedule', label: 'Reschedule for tomorrow', icon: '📅' },
  ];

  if (quest.questType !== 'boss') {
    options.push({ action: 'convert_to_boss', label: 'Convert to boss fight', icon: '👹' });
  }

  options.push(
    { action: 'delegate', label: 'Delegate to someone', icon: '🤝' },
    { action: 'archive', label: 'Archive (no shame)', icon: '📦' },
  );

  return options;
}

// ═══════════════════════════════════════════════════
// #6 FIX: computeRules — single source of truth for
// adaptive behavior across the entire app
// ═══════════════════════════════════════════════════

export interface SystemRules {
  /** How to sort quests: priority-first, easy-first, or time-urgent */
  sortMode: 'priority' | 'easy_first' | 'urgent_first';
  /** UI density mode */
  uiMode: 'normal' | 'compact' | 'minimal';
  /** Max tasks shown on dashboard/list */
  maxVisibleTasks: number;
  /** XP multiplier for current conditions */
  xpMultiplier: number;
  /** Nudge/reminder intensity */
  nudgeIntensity: 'gentle' | 'direct' | 'intense';
  /** Whether to show rescue prompt on dashboard */
  showRescuePrompt: boolean;
  /** Suppress non-essential animations */
  suppressAnimations: boolean;
}

export function computeRules(
  state: {
    energy: number;
    mood: number;
    stress: number;
    focus: number;
    stateTag: string;
    isOverwhelmed: boolean;
  },
  recentFailedCount: number,
  streak: number,
  preferences: {
    overwhelmSensitivity: number;
    reminderTolerance: number;
    rewardSensitivity: number;
    reduceMotion?: boolean;
  },
): SystemRules {
  const isStruggling = state.isOverwhelmed || recentFailedCount >= 3;
  const isLowEnergy = state.energy <= 2;
  const isHighStress = state.stress >= 4;
  const isHighFocus = state.focus >= 4 && state.energy >= 3;

  // Sort mode
  let sortMode: SystemRules['sortMode'] = 'priority';
  if (isStruggling || isLowEnergy) sortMode = 'easy_first';
  else if (isHighStress) sortMode = 'urgent_first';

  // UI mode
  let uiMode: SystemRules['uiMode'] = 'normal';
  if (isStruggling) uiMode = 'minimal';
  else if (isLowEnergy || isHighStress) uiMode = 'compact';

  // Max visible tasks
  let maxVisibleTasks = 10;
  if (isStruggling) maxVisibleTasks = 3;
  else if (isLowEnergy) maxVisibleTasks = 5;

  // XP multiplier
  let xpMultiplier = 1.0;
  if (isStruggling) xpMultiplier = 1.5; // Bonus when recovering from low state
  if (streak >= 7) xpMultiplier *= 1.1;
  if (streak >= 14) xpMultiplier *= 1.1;
  if (isHighFocus) xpMultiplier *= 1.1;

  // Nudge intensity
  let nudgeIntensity: SystemRules['nudgeIntensity'] = 'direct';
  if (isStruggling || isHighStress) nudgeIntensity = 'gentle';
  else if (isHighFocus && preferences.reminderTolerance >= 4) nudgeIntensity = 'intense';

  // Suppress animations
  const suppressAnimations =
    preferences.reduceMotion === true ||
    (isStruggling && preferences.overwhelmSensitivity >= 4);

  return {
    sortMode,
    uiMode,
    maxVisibleTasks,
    xpMultiplier: Math.round(xpMultiplier * 100) / 100,
    nudgeIntensity,
    showRescuePrompt: isStruggling,
    suppressAnimations,
  };
}

