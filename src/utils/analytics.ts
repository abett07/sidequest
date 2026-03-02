// ═══════════════════════════════════════════════════
// ANALYTICS ENGINE — Phase 3
// Computes real behavior insights from store data
// No LLM required — pure data analysis
// ═══════════════════════════════════════════════════

import type { Quest, FocusSession, StateCheckin, DailyLog } from '../types';

// ─── Types ───

export interface InsightCard {
  label: string;
  value: string;
  icon: string;
  color: string;
  detail?: string;
}

export interface WeeklyFocusDay {
  day: string;        // Mon, Tue, etc.
  minutes: number;
  sessions: number;
}

export interface CategoryFailure {
  category: string;
  failRate: number;   // 0-1
  count: number;
}

export interface AIAdvice {
  title: string;
  body: string;
}

// ─── Core Analysis Functions ───

export function computeBestFocusHours(sessions: FocusSession[]): string {
  if (sessions.length < 3) return 'Not enough data yet';

  const hourBuckets: Record<number, { total: number; completed: number }> = {};
  for (const s of sessions) {
    const hour = new Date(s.startedAt).getHours();
    if (!hourBuckets[hour]) hourBuckets[hour] = { total: 0, completed: 0 };
    hourBuckets[hour].total++;
    if (s.completed) hourBuckets[hour].completed++;
  }

  // Find top 2-hour window by completion rate (min 2 sessions)
  let bestStart = 9;
  let bestRate = 0;
  for (let h = 6; h < 22; h++) {
    const a = hourBuckets[h] || { total: 0, completed: 0 };
    const b = hourBuckets[h + 1] || { total: 0, completed: 0 };
    const total = a.total + b.total;
    if (total < 2) continue;
    const rate = (a.completed + b.completed) / total;
    if (rate > bestRate) { bestRate = rate; bestStart = h; }
  }

  const fmt = (h: number) => `${h > 12 ? h - 12 : h} ${h >= 12 ? 'PM' : 'AM'}`;
  return `${fmt(bestStart)} – ${fmt(bestStart + 2)}`;
}

export function computeMostFailedCategory(quests: Quest[]): CategoryFailure[] {
  const cats: Record<string, { total: number; failed: number }> = {};
  for (const q of quests) {
    if (!cats[q.category]) cats[q.category] = { total: 0, failed: 0 };
    cats[q.category].total++;
    if (q.status === 'failed' || q.status === 'paused') cats[q.category].failed++;
  }

  return Object.entries(cats)
    .map(([category, { total, failed }]) => ({
      category,
      failRate: total > 0 ? failed / total : 0,
      count: total,
    }))
    .filter((c) => c.count >= 2)
    .sort((a, b) => b.failRate - a.failRate);
}

export function computeStartSuccessRate(quests: Quest[]): number {
  const started = quests.filter((q) => q.status !== 'inbox');
  if (started.length === 0) return 0;
  const completed = started.filter((q) => q.status === 'done');
  return Math.round((completed.length / started.length) * 100);
}

export function computeAvgDurationVsEstimate(sessions: FocusSession[]): string {
  const completed = sessions.filter((s) => s.completed && s.actualMinutes > 0);
  if (completed.length < 3) return 'Not enough data';

  const avgActual = completed.reduce((sum, s) => sum + s.actualMinutes, 0) / completed.length;
  const avgPlanned = completed.reduce((sum, s) => sum + s.plannedMinutes, 0) / completed.length;
  const diff = Math.round(avgActual - avgPlanned);

  if (Math.abs(diff) <= 2) return 'On target';
  return diff > 0 ? `+${diff} min over` : `${Math.abs(diff)} min under`;
}

export function computeCommonDebuff(checkins: StateCheckin[]): string {
  if (checkins.length < 3) return 'Not enough data';

  const tagCounts: Record<string, number> = {};
  for (const c of checkins) {
    if (c.stateTag && c.stateTag !== 'clear') {
      tagCounts[c.stateTag] = (tagCounts[c.stateTag] || 0) + 1;
    }
  }

  const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return 'None detected';

  const debuffNames: Record<string, string> = {
    overwhelmed: 'Task Paralysis',
    frozen: 'Task Paralysis',
    anxious: 'Anxiety Fog',
    distracted: 'Doomscroll Drift',
    'low-energy': 'Sleep Debt',
    hyperfocus: 'Tunnel Vision',
  };

  return debuffNames[sorted[0][0]] || sorted[0][0];
}

export function computeBestWinPattern(sessions: FocusSession[], quests: Quest[]): string {
  if (sessions.length < 5) return 'Still gathering data...';

  // Check if short sprints have better completion
  const short = sessions.filter((s) => s.plannedMinutes <= 15);
  const long = sessions.filter((s) => s.plannedMinutes > 25);

  const shortRate = short.length > 0 ? short.filter((s) => s.completed).length / short.length : 0;
  const longRate = long.length > 0 ? long.filter((s) => s.completed).length / long.length : 0;

  // Check morning vs afternoon
  const morning = sessions.filter((s) => new Date(s.startedAt).getHours() < 12);
  const afternoon = sessions.filter((s) => {
    const h = new Date(s.startedAt).getHours();
    return h >= 12 && h < 18;
  });
  const morningRate = morning.length > 0 ? morning.filter((s) => s.completed).length / morning.length : 0;
  const afternoonRate = afternoon.length > 0 ? afternoon.filter((s) => s.completed).length / afternoon.length : 0;

  const patterns: Array<{ desc: string; score: number }> = [];

  if (shortRate > longRate + 0.15 && short.length >= 3) {
    patterns.push({ desc: 'Short sprints (≤15 min) beat long sessions', score: shortRate - longRate });
  }
  if (morningRate > afternoonRate + 0.1 && morning.length >= 3) {
    patterns.push({ desc: 'Morning sessions outperform afternoon', score: morningRate - afternoonRate });
  }
  if (afternoonRate > morningRate + 0.1 && afternoon.length >= 3) {
    patterns.push({ desc: 'Afternoon is your power zone', score: afternoonRate - morningRate });
  }

  // Check boss fights
  const bossQuests = quests.filter((q) => q.questType === 'boss' && q.status === 'done');
  if (bossQuests.length >= 2) {
    patterns.push({ desc: 'Boss fights completed with phase approach', score: 0.3 });
  }

  patterns.sort((a, b) => b.score - a.score);
  return patterns[0]?.desc || 'Complete more sessions to detect patterns';
}

export function computeWeeklyFocusChart(sessions: FocusSession[]): WeeklyFocusDay[] {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // Sunday
  weekStart.setHours(0, 0, 0, 0);

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const buckets: WeeklyFocusDay[] = days.map((d) => ({ day: d, minutes: 0, sessions: 0 }));

  for (const s of sessions) {
    const d = new Date(s.startedAt);
    if (d >= weekStart) {
      const dayIdx = d.getDay();
      buckets[dayIdx].minutes += s.actualMinutes || 0;
      buckets[dayIdx].sessions++;
    }
  }

  // Rotate to start on Monday
  return [...buckets.slice(1), buckets[0]];
}

// ─── AI Advice Generator (rule-based) ───

export function generateAIAdvice(
  sessions: FocusSession[],
  quests: Quest[],
  checkins: StateCheckin[],
): AIAdvice[] {
  const advice: AIAdvice[] = [];

  // 1. Category-time analysis
  const failedCats = computeMostFailedCategory(quests);
  const worstCat = failedCats[0];
  if (worstCat && worstCat.failRate > 0.3) {
    const afternoonFails = quests.filter((q) =>
      q.category === worstCat.category &&
      (q.status === 'failed' || q.status === 'paused') &&
      q.scheduledFor && new Date(q.scheduledFor).getHours() >= 14
    ).length;
    const totalFails = quests.filter((q) =>
      q.category === worstCat.category && (q.status === 'failed' || q.status === 'paused')
    ).length;

    if (afternoonFails > totalFails / 2) {
      advice.push({
        title: 'Time-Category Mismatch',
        body: `${worstCat.category} tasks fail ${Math.round(worstCat.failRate * 100)}% of the time, mostly after 2 PM. Try scheduling them before lunch.`,
      });
    } else {
      advice.push({
        title: 'Struggle Category',
        body: `${worstCat.category} tasks have a ${Math.round(worstCat.failRate * 100)}% failure rate. Consider breaking them into boss fights with smaller phases.`,
      });
    }
  }

  // 2. Sprint length analysis
  const short = sessions.filter((s) => s.plannedMinutes <= 15);
  const shortRate = short.length > 2 ? short.filter((s) => s.completed).length / short.length : 0;
  if (shortRate > 0.8 && short.length >= 3) {
    advice.push({
      title: 'Sprint Size Sweet Spot',
      body: `Short sprints (≤15 min) have a ${Math.round(shortRate * 100)}% completion rate. Use Ignite or Scout presets more often.`,
    });
  }

  // 3. Overwhelm frequency
  const recentCheckins = checkins.slice(-14);
  const overwhelmedCount = recentCheckins.filter((c) =>
    c.stateTag === 'overwhelmed' || c.stateTag === 'frozen'
  ).length;
  if (overwhelmedCount >= 3) {
    advice.push({
      title: 'Overwhelm Pattern Detected',
      body: `You've been overwhelmed ${overwhelmedCount} times in the last 14 check-ins. Try limiting visible tasks to 3 and using Rescue Mode more proactively.`,
    });
  }

  // 4. Streak analysis
  const completedRecently = quests.filter((q) =>
    q.status === 'done' && q.completedAt &&
    Date.now() - new Date(q.completedAt).getTime() < 7 * 86400000
  );
  if (completedRecently.length >= 10) {
    advice.push({
      title: 'Momentum Building',
      body: `${completedRecently.length} quests completed this week. You're in a strong position — consider adding a campaign to sustain this arc.`,
    });
  }

  // Default
  if (advice.length === 0) {
    advice.push({
      title: 'Keep Going',
      body: 'Complete a few more sessions and quests for the system to learn your patterns. Every data point sharpens your shadow intelligence.',
    });
  }

  return advice;
}

// ─── Full Insight Card Set ───

export function computeAllInsights(
  sessions: FocusSession[],
  quests: Quest[],
  checkins: StateCheckin[],
  colors: { cyan: string; red: string; green: string; gold: string; purple: string },
): InsightCard[] {
  const failedCats = computeMostFailedCategory(quests);
  const worstCat = failedCats[0];

  return [
    {
      label: 'Best Focus Hours',
      value: computeBestFocusHours(sessions),
      icon: '🎯',
      color: colors.cyan,
    },
    {
      label: 'Most Failed Category',
      value: worstCat ? `${worstCat.category} (${Math.round(worstCat.failRate * 100)}%)` : 'None yet',
      icon: '📋',
      color: colors.red,
    },
    {
      label: 'Start Success Rate',
      value: `${computeStartSuccessRate(quests)}%`,
      icon: '🚀',
      color: colors.green,
    },
    {
      label: 'Avg Duration vs Est.',
      value: computeAvgDurationVsEstimate(sessions),
      icon: '⏱',
      color: colors.gold,
    },
    {
      label: 'Common Debuff',
      value: computeCommonDebuff(checkins),
      icon: '👁️',
      color: colors.purple,
    },
    {
      label: 'Best Win Pattern',
      value: computeBestWinPattern(sessions, quests),
      icon: '🏆',
      color: colors.gold,
    },
  ];
}
