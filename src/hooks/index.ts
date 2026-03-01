// ═══════════════════════════════════════════════════
// SHADOW SYSTEM — Custom Hooks (updated for new store)
// ═══════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { useShadowStore, useSystemRules } from '../store/useShadowStore';
import { detectStateTag, detectBuffsDebuffs, rankTasks, computeRules, type SystemRules } from '../utils/coreLogic';
import type { Quest, StateTag } from '../types';

// ─── useTimer: Countdown with callbacks ───

interface UseTimerOptions {
  onTick?: (secondsLeft: number) => void;
  onComplete?: () => void;
  onHalfway?: () => void;
}

export function useTimer(totalSeconds: number, options: UseTimerOptions = {}) {
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const halfwayFired = useRef(false);

  const start = useCallback(() => {
    setTimeLeft(totalSeconds);
    setIsRunning(true);
    setIsComplete(false);
    halfwayFired.current = false;
  }, [totalSeconds]);

  const pause = useCallback(() => setIsRunning(false), []);
  const resume = useCallback(() => setIsRunning(true), []);
  const stop = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(totalSeconds);
    halfwayFired.current = false;
  }, [totalSeconds]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          const next = prev - 1;
          options.onTick?.(next);
          if (!halfwayFired.current && next <= totalSeconds / 2) {
            halfwayFired.current = true;
            options.onHalfway?.();
          }
          if (next <= 0) {
            setIsRunning(false);
            setIsComplete(true);
            options.onComplete?.();
            return 0;
          }
          return next;
        });
      }, 1000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
  }, [isRunning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0;

  return {
    timeLeft, minutes, seconds, progress,
    isRunning, isComplete,
    start, pause, resume, stop,
    formatted: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
  };
}

// ─── useStateEngine: reads systemRules from store ───

export function useStateEngine() {
  const currentState = useShadowStore((s) => s.currentState);
  const quests = useShadowStore((s) => s.quests);
  const streak = useShadowStore((s) => s.streak);
  const systemRules = useSystemRules();
  const updateCurrentState = useShadowStore((s) => s.updateCurrentState);

  const [recommendedQuests, setRecommendedQuests] = useState<string[]>([]);

  const checkIn = useCallback((energy: number, mood: number, stress: number, focus: number) => {
    updateCurrentState({ energy, mood, stress, focus });
  }, [updateCurrentState]);

  // Recompute recommendations when state or quests change
  useEffect(() => {
    const ranked = rankTasks(quests, currentState);
    setRecommendedQuests(ranked.slice(0, 5).map((r) => r.questId));
  }, [currentState, quests]);

  // Auto-detect buffs/debuffs
  const autoBuffs = useCallback(() => {
    const hour = new Date().getHours();
    return detectBuffsDebuffs(hour, streak, 0, false, currentState);
  }, [currentState, streak]);

  return {
    currentState,
    systemRules,
    recommendedQuests,
    checkIn,
    autoBuffs,
  };
}

// ─── useNotifications ───

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  useEffect(() => {
    registerForPush().then(setExpoPushToken);
  }, []);

  const scheduleReminder = useCallback(async (title: string, body: string, triggerSeconds: number) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: { title, body, sound: true },
        trigger: { seconds: triggerSeconds },
      });
    } catch (e) {
      console.warn('Failed to schedule notification:', e);
    }
  }, []);

  const scheduleStreakReminder = useCallback(async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔥 Streak Warning',
          body: "Your streak is at risk, Hunter. Complete one quest today.",
          sound: true,
        },
        trigger: { hour: 20, minute: 0, repeats: true },
      });
    } catch (e) {
      console.warn('Failed to schedule streak reminder:', e);
    }
  }, []);

  const cancelAll = useCallback(async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }, []);

  return { expoPushToken, scheduleReminder, scheduleStreakReminder, cancelAll };
}

async function registerForPush(): Promise<string | null> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return null;
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch {
    return null;
  }
}

// ─── useHaptic ───

export function useHaptic() {
  return {
    light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
    heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
    success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
    selection: () => Haptics.selectionAsync(),
  };
}
