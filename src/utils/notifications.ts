// ═══════════════════════════════════════════════════
// NOTIFICATION SCHEDULER v1.2
//
// FIXES:
//  #3  Named params object instead of positional args
//  #4  Dedupe check BEFORE canceling — no wipe-then-skip race
//  #6  push_token writes to "profiles" table (not "users")
// ═══════════════════════════════════════════════════

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { MMKV } from 'react-native-mmkv';
import { supabase } from '../supabase/client';
import type { Quest, ReminderStyle } from '../types';

const notifStore = new MMKV({ id: 'shadow-notifications' });

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ─── Token Registration (FIX #6: writes to profiles) ───

export async function registerPushToken(userId: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return null;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    notifStore.set('push_token', token);

    try {
      await supabase.from('profiles').update({ push_token: token }).eq('id', userId);
    } catch { /* retry next sync */ }

    return token;
  } catch {
    return null;
  }
}

// ─── Daily Notification Plan ───
// FIX #3: Named params object (no positional arg confusion)
// FIX #4: Dedupe check BEFORE canceling existing notifications

export interface DailyPlanParams {
  quests: Quest[];
  reminderStyle: ReminderStyle;
  streak: number;
}

export async function scheduleDailyPlan(params: DailyPlanParams): Promise<void> {
  const { quests, reminderStyle, streak } = params;
  const now = new Date();
  const hour = now.getHours();

  // FIX #4: Check dedupe FIRST — if already scheduled this hour, don't cancel + skip
  const dedupeKey = `plan:${now.toISOString().slice(0, 13)}`;
  if (notifStore.getString('last_plan') === dedupeKey) return;

  // Safe to cancel now — we WILL reschedule
  await Notifications.cancelAllScheduledNotificationsAsync();
  notifStore.set('last_plan', dedupeKey);

  const activeQuests = quests.filter((q) => q.status === 'active' || q.status === 'in_progress');
  const urgentQuests = activeQuests.filter((q) => q.priority === 'critical' || q.priority === 'high');

  if (hour < 9) {
    const body = urgentQuests.length > 0
      ? `${urgentQuests.length} urgent quest${urgentQuests.length > 1 ? 's' : ''} await. Begin your assault.`
      : activeQuests.length > 0
        ? `${activeQuests.length} quest${activeQuests.length > 1 ? 's' : ''} on today's board. Time to hunt.`
        : 'No quests yet. Brain dump your chaos and create your first mission.';
    await safeSchedule({
      content: { title: getTitle('morning', reminderStyle), body, data: { type: 'morning_kickoff' } },
      trigger: { hour: 9, minute: 0, repeats: false },
    });
  }

  if (streak > 0 && hour < 20) {
    await safeSchedule({
      content: {
        title: `🔥 ${streak}-day streak at risk`,
        body: getStreakBody(streak, reminderStyle),
        data: { type: 'streak_warning' },
      },
      trigger: { hour: 20, minute: 0, repeats: false },
    });
  }

  for (const quest of activeQuests) {
    if (!quest.dueAt) continue;
    const dueDate = new Date(quest.dueAt);
    const reminderTime = new Date(dueDate.getTime() - 60 * 60 * 1000);
    if (reminderTime <= now) continue;
    const secondsUntil = Math.round((reminderTime.getTime() - now.getTime()) / 1000);
    if (secondsUntil <= 0 || secondsUntil > 86400) continue;
    await safeSchedule({
      content: {
        title: `⏰ "${quest.title}" due in 1 hour`,
        body: quest.questType === 'boss' ? 'The boss gate closes soon.' : 'Complete before the deadline.',
        data: { type: 'due_reminder', questId: quest.id },
      },
      trigger: { seconds: secondsUntil },
    });
  }

  if (hour < 14) {
    const completedToday = quests.filter((q) =>
      q.completedAt && q.completedAt.slice(0, 10) === now.toISOString().slice(0, 10)
    ).length;
    await safeSchedule({
      content: {
        title: getTitle('afternoon', reminderStyle),
        body: completedToday > 0
          ? `${completedToday} quest${completedToday > 1 ? 's' : ''} cleared. Keep the momentum.`
          : 'No quests completed yet. Try a 3-minute Ignite sprint to start.',
        data: { type: 'afternoon_checkin' },
      },
      trigger: { hour: 14, minute: 0, repeats: false },
    });
  }
}

// ─── Focus Session Reminder ───

export async function scheduleFocusReminder(questTitle: string, minutes: number): Promise<void> {
  if (minutes > 5) {
    await safeSchedule({
      content: {
        title: '⚔️ Halfway there',
        body: `${Math.round(minutes / 2)} minutes left on "${questTitle}". Your shadows are watching.`,
        data: { type: 'focus_halfway' },
      },
      trigger: { seconds: Math.round(minutes * 30) },
    });
  }
}

// ─── Cancel All ───

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  notifStore.delete('last_plan');
}

// ─── Helpers ───

async function safeSchedule(request: Notifications.NotificationRequestInput): Promise<void> {
  try { await Notifications.scheduleNotificationAsync(request); }
  catch (e) { console.warn('[Notifications] Failed to schedule:', e); }
}

function getTitle(slot: 'morning' | 'afternoon', style: ReminderStyle): string {
  switch (style) {
    case 'gentle': return slot === 'morning' ? '☀️ Good morning, Hunter' : '📋 Afternoon check-in';
    case 'intense': return slot === 'morning' ? '⚔️ ARISE, SHADOW SOVEREIGN' : '🔥 STATUS REPORT';
    default: return slot === 'morning' ? '🗡️ Daily missions ready' : '🎯 Mid-day status';
  }
}

function getStreakBody(streak: number, style: ReminderStyle): string {
  switch (style) {
    case 'gentle': return `Complete one quest to keep your ${streak}-day streak alive.`;
    case 'intense': return `${streak} days of power. One quest stands between you and preservation. Do NOT break the chain.`;
    default: return `Your ${streak}-day streak needs one quest to survive. Open the system.`;
  }
}
