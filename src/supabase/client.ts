// ═══════════════════════════════════════════════════
// SHADOW SYSTEM — Supabase Client
// ═══════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';
import { MMKV } from 'react-native-mmkv';

// MMKV storage for Supabase auth persistence
const storage = new MMKV({ id: 'shadow-system-auth' });

const mmkvStorageAdapter = {
  getItem: (key: string): string | null => {
    return storage.getString(key) ?? null;
  },
  setItem: (key: string, value: string): void => {
    storage.set(key, value);
  },
  removeItem: (key: string): void => {
    storage.delete(key);
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: mmkvStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ─── Edge Function Helpers ───

export async function callEdgeFunction<T = any>(
  functionName: string,
  body: Record<string, any>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
  });
  if (error) throw error;
  return data as T;
}

export async function aiBreakdown(
  taskText: string,
  difficulty?: number,
  category?: string,
  estimatedMinutes?: number
): Promise<{ steps: Array<{ title: string; estimatedMinutes: number; isRequired: boolean }> }> {
  return callEdgeFunction('ai-breakdown', { taskText, difficulty, category, estimatedMinutes });
}

export async function aiNextAction(
  userId: string,
  currentState: { energy: number; focus: number; stateTag: string }
): Promise<{ questId: string; reason: string }> {
  return callEdgeFunction('ai-next-action', { userId, currentState });
}

export async function aiWeeklyArc(userId: string): Promise<{
  title: string;
  summary: string;
  mainBoss: string;
  supportHabits: string[];
}> {
  return callEdgeFunction('ai-weekly-arc', { userId });
}

export async function aiRescue(
  userId: string,
  failureState: string,
  overdueQuests: string[]
): Promise<{
  tinyAction: string;
  fallbackAction: string;
  breathingPrompt: string;
}> {
  return callEdgeFunction('ai-rescue', { userId, failureState, overdueQuests });
}
