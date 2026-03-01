// ═══════════════════════════════════════════════════
// BRAIN DUMP SCREEN — Phase 3: Voice + AI Parsing
// Records audio via expo-av, sends text to AI for
// task extraction, creates quests from results
// ═══════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, SlideInRight } from 'react-native-reanimated';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { GlassPanel } from '../components/GlassPanel';
import { ActionButton, Chip } from '../components/UIKit';
import { COLORS, SPACING, FONTS, RADIUS } from '../constants/theme';
import { useShadowStore } from '../store/useShadowStore';
import { aiBreakdown } from '../supabase/client';

// ─── Quick Action Modifiers ───

const QUICK_ACTIONS = [
  { label: 'Make it Tiny',   icon: '🔬', mod: { estimatedMinutes: 5,  difficultyScore: 1 } },
  { label: 'Turn into Boss', icon: '💀', mod: { questType: 'boss' as const } },
  { label: 'Make it Quick',  icon: '⚡', mod: { estimatedMinutes: 10 } },
  { label: 'Make it Easy',   icon: '🌱', mod: { difficultyScore: 1, emotionalWeightScore: 1 } },
  { label: 'Plan Later',     icon: '📥', mod: { status: 'inbox' as const } },
];

const CATEGORY_DETECT: Array<{ keywords: string[]; category: string; color: string }> = [
  { keywords: ['meet', 'call', 'zoom', 'standup', 'sync'], category: 'MEETING', color: COLORS.gold },
  { keywords: ['project', 'code', 'build', 'design', 'ship'], category: 'PROJECT', color: COLORS.cyan },
  { keywords: ['email', 'reply', 'urgent', 'asap', 'deadline'], category: 'URGENT', color: COLORS.red },
  { keywords: ['gym', 'run', 'eat', 'sleep', 'shower', 'health'], category: 'HEALTH', color: COLORS.green },
  { keywords: ['clean', 'wash', 'dishes', 'laundry', 'trash'], category: 'CHORES', color: COLORS.purple },
  { keywords: ['study', 'read', 'learn', 'course', 'chapter'], category: 'STUDY', color: COLORS.cyan },
];

function detectCategory(text: string): { category: string; color: string } {
  const lower = text.toLowerCase();
  for (const c of CATEGORY_DETECT) {
    if (c.keywords.some((kw) => lower.includes(kw))) return { category: c.category, color: c.color };
  }
  return { category: 'PERSONAL', color: COLORS.textSecondary };
}

// ─── Types ───

interface ParsedTask {
  id: string;
  text: string;
  category: string;
  categoryColor: string;
  selected: boolean;
  modifier?: string;
}

// ═══════════════════════════════════════════════════

export function BrainDumpScreen() {
  const nav = useNavigation<any>();
  const { addQuest, user } = useShadowStore();

  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedTask[] | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingRef.current) recordingRef.current.stopAndUnloadAsync().catch(() => {});
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ─── Voice Recording ───

  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Enable microphone access to use voice brain dump.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      timerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      console.warn('Failed to start recording:', err);
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setIsRecording(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (uri) {
        // In production, send audio to Whisper / Deepgram / Google STT
        // For now, prompt user to type what they said
        Alert.alert(
          'Voice Captured',
          'Speech-to-text requires an API key (Whisper/Deepgram). For now, type your thoughts below or paste a transcript.',
          [{ text: 'OK' }]
        );
        // TODO: Replace with actual STT call:
        // const transcript = await speechToText(uri);
        // setText((prev) => prev + (prev ? '\n' : '') + transcript);
      }
    } catch (err) {
      console.warn('Failed to stop recording:', err);
      setIsRecording(false);
    }
  };

  // ─── AI Parsing ───

  const handleParse = async () => {
    if (!text.trim()) return;
    setIsParsing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Try AI edge function first
      const result = await aiBreakdown(text, 3, 'general', 30);

      if (result?.steps && Array.isArray(result.steps)) {
        // AI returned structured steps
        const tasks: ParsedTask[] = result.steps.map((step: any, i: number) => {
          const { category, color } = detectCategory(step.title || step);
          return {
            id: `bd_${Date.now()}_${i}`,
            text: typeof step === 'string' ? step : step.title,
            category,
            categoryColor: color,
            selected: true,
          };
        });
        setParsed(tasks);
      } else {
        // Fallback: local parsing
        localParse();
      }
    } catch {
      // Fallback: local parsing
      localParse();
    }

    setIsParsing(false);
  };

  const localParse = () => {
    const lines = text.split(/[.\n;]+/).filter((l) => l.trim().length > 3);
    const tasks: ParsedTask[] = lines.map((l, i) => {
      const { category, color } = detectCategory(l);
      return {
        id: `bd_${Date.now()}_${i}`,
        text: l.trim(),
        category,
        categoryColor: color,
        selected: true,
      };
    });
    setParsed(tasks);
  };

  // ─── Create Quests from Parsed Tasks ───

  const handleExtractAll = () => {
    if (!parsed) return;
    const selected = parsed.filter((t) => t.selected);
    if (selected.length === 0) return;

    for (const task of selected) {
      const mod = task.modifier ? QUICK_ACTIONS.find((a) => a.label === task.modifier)?.mod : {};
      addQuest({
        id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        userId: user.id,
        title: task.text,
        description: '',
        category: task.category.toLowerCase() as any,
        questType: (mod as any)?.questType || 'normal',
        status: (mod as any)?.status || 'active',
        priority: task.category === 'URGENT' ? 'high' : 'medium',
        difficultyScore: (mod as any)?.difficultyScore || 2,
        emotionalWeightScore: (mod as any)?.emotionalWeightScore || 2,
        frictionScore: 2,
        estimatedMinutes: (mod as any)?.estimatedMinutes || 30,
        xpReward: task.category === 'URGENT' ? 150 : 100,
        coinReward: 10,
        createdAt: new Date().toISOString(),
      } as any);
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Quests Created', `${selected.length} quest${selected.length > 1 ? 's' : ''} added to your board.`, [
      { text: 'View Quests', onPress: () => nav.navigate('MainTabs') },
      { text: 'Dump More', style: 'cancel' },
    ]);

    setText('');
    setParsed(null);
  };

  const toggleTask = (id: string) => {
    setParsed((prev) =>
      prev?.map((t) => t.id === id ? { ...t, selected: !t.selected } : t) || null
    );
  };

  const applyModifier = (taskId: string, modLabel: string) => {
    setParsed((prev) =>
      prev?.map((t) => t.id === taskId ? { ...t, modifier: t.modifier === modLabel ? undefined : modLabel } : t) || null
    );
  };

  // ─── Render ───

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()} style={styles.backBtn}>
          <Text style={{ color: COLORS.text, fontSize: 16 }}>‹</Text>
        </Pressable>
        <Text style={[FONTS.displaySmall, { color: COLORS.text, fontSize: 18 }]}>Brain Dump</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[FONTS.bodySmall, { color: COLORS.cyan, textAlign: 'center', fontStyle: 'italic' }]}>
          Speak or type your chaos, Hunter...
        </Text>

        {/* Voice Recording Button */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.micContainer}>
          <Pressable
            onPress={isRecording ? stopRecording : startRecording}
            style={[styles.micBtn, isRecording && styles.micBtnActive]}
          >
            <Text style={{ fontSize: 28 }}>{isRecording ? '⏹️' : '🎙️'}</Text>
          </Pressable>
          {isRecording && (
            <Animated.View entering={FadeIn}>
              <Text style={[FONTS.bodySmall, { color: COLORS.red, marginTop: 8 }]}>
                Recording... {recordingDuration}s
              </Text>
            </Animated.View>
          )}
        </Animated.View>

        {/* Text Input */}
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Dump everything here..."
          placeholderTextColor={COLORS.textDim}
          multiline
          style={styles.textInput}
        />

        {/* Quick Action Chips */}
        <View style={styles.chipRow}>
          {QUICK_ACTIONS.map((a) => (
            <Chip key={a.label} label={`${a.icon} ${a.label}`} color={COLORS.cyan} />
          ))}
        </View>

        {/* Parse / Extract Button */}
        {!parsed ? (
          <ActionButton
            onPress={handleParse}
            color={COLORS.cyan}
            fullWidth
            disabled={!text.trim() || isParsing}
            icon={isParsing ? '' : '🤖'}
            style={{ marginTop: 16 }}
          >
            {isParsing ? 'ANALYZING...' : 'EXTRACT ALL'}
          </ActionButton>
        ) : (
          <ActionButton
            onPress={handleExtractAll}
            color={COLORS.green}
            fullWidth
            icon="⚔️"
            style={{ marginTop: 16 }}
          >
            CREATE {parsed.filter((t) => t.selected).length} QUESTS
          </ActionButton>
        )}

        {isParsing && (
          <View style={{ alignItems: 'center', marginTop: 16 }}>
            <ActivityIndicator color={COLORS.cyan} />
          </View>
        )}

        {/* Parsed Results */}
        {parsed && (
          <Animated.View entering={FadeInDown.duration(400)} style={{ marginTop: 20 }}>
            <Text style={[FONTS.label, { color: COLORS.textSecondary, marginBottom: 12 }]}>
              AI PARSING — TAP TO SELECT/DESELECT
            </Text>
            {parsed.map((t, i) => (
              <Animated.View key={t.id} entering={SlideInRight.delay(i * 80).duration(250)}>
                <Pressable onPress={() => toggleTask(t.id)}>
                  <GlassPanel style={[styles.taskCard, !t.selected && styles.taskDeselected]} padding={14}>
                    <View style={styles.parsedRow}>
                      <Text style={{ fontSize: 18, opacity: t.selected ? 1 : 0.3 }}>
                        {t.selected ? '✅' : '⬜'}
                      </Text>
                      <View style={[styles.catTag, {
                        backgroundColor: `${t.categoryColor}22`,
                        borderColor: `${t.categoryColor}44`,
                      }]}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: t.categoryColor }}>
                          {t.category}
                        </Text>
                      </View>
                      <Text style={[FONTS.bodySmall, { color: COLORS.text, flex: 1 }]} numberOfLines={2}>
                        {t.text}
                      </Text>
                    </View>
                    {/* Per-task modifier chips */}
                    {t.selected && (
                      <View style={[styles.chipRow, { marginTop: 8, marginLeft: 30 }]}>
                        {QUICK_ACTIONS.slice(0, 3).map((a) => (
                          <Pressable
                            key={a.label}
                            onPress={() => applyModifier(t.id, a.label)}
                            style={[styles.miniChip, t.modifier === a.label && styles.miniChipActive]}
                          >
                            <Text style={{ fontSize: 10, color: t.modifier === a.label ? COLORS.bg : COLORS.textSecondary }}>
                              {a.icon} {a.label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </GlassPanel>
                </Pressable>
              </Animated.View>
            ))}

            {/* Reset button */}
            <Pressable
              onPress={() => setParsed(null)}
              style={{ alignItems: 'center', marginTop: 12 }}
            >
              <Text style={[FONTS.bodySmall, { color: COLORS.textSecondary }]}>← Re-parse</Text>
            </Pressable>
          </Animated.View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: SPACING.xl, paddingBottom: SPACING.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: RADIUS.md,
    backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  content: { paddingHorizontal: SPACING.xl },
  micContainer: { alignItems: 'center', marginVertical: 20 },
  micBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: `${COLORS.cyan}22`, borderWidth: 2, borderColor: `${COLORS.cyan}44`,
    alignItems: 'center', justifyContent: 'center',
  },
  micBtnActive: {
    backgroundColor: `${COLORS.red}33`, borderColor: COLORS.red,
  },
  textInput: {
    minHeight: 120, padding: 16, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
    color: COLORS.text, fontSize: 15, textAlignVertical: 'top', lineHeight: 24,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  parsedRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  taskCard: { marginBottom: 8 },
  taskDeselected: { opacity: 0.5 },
  miniChip: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    backgroundColor: `${COLORS.glass}`, borderWidth: 1, borderColor: COLORS.glassBorder,
  },
  miniChipActive: {
    backgroundColor: COLORS.cyan, borderColor: COLORS.cyan,
  },
});
