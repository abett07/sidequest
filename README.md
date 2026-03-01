# ⚔️ Shadow System

**Solo Leveling-inspired ADHD productivity app** — a gamified task management system that transforms daily challenges into dungeon raids, boss fights, and narrative arcs.

Built with React Native + Expo · Supabase · Zustand · Reanimated 3

---

## Features

### 🎮 7 Connected Systems
- **Identity** — Hunter profile, rank progression (E → Monarch), 6 core stats
- **Quest Engine** — Tasks, boss fights with HP phases, campaigns, recurring quests
- **State Engine** — Energy/mood/stress/focus tracking with automatic buffs & debuffs
- **Focus Engine** — Sprint timers (Ignite 3m, Scout 10m, Dungeon 25m, Raid 45m)
- **Progression** — XP, leveling, streaks, combos, skill tree, coin rewards
- **Intelligence** — AI task breakdown, next-action recommendations, rescue mode
- **Narrative** — Weekly arcs, boss naming, battle summaries, rank-up moments

### 📱 12 Screens
| Screen | Purpose |
|--------|---------|
| Onboarding | 4-step setup wizard |
| Dashboard | Command center with adaptive overwhelm mode |
| Quest List | Filterable task list with tabs |
| Quest Detail | Boss HP, micro-steps, "Enter Dungeon" CTA |
| Focus Mode | Sprint timer with motivational AI prompts |
| Rescue Mode | Emotional safety screen for when you're stuck |
| Brain Dump | Voice/text capture with AI parsing |
| Boss Fight | Phase-by-phase combat with attack animations |
| Campaign | Multi-week arc progress with milestones |
| Skill Tree | Unlockable nodes across 6 branches |
| Rewards | Coin shop, chest opening, real-life tokens |
| Insights | Weekly behavior analysis with AI advice |
| Settings | Profile, stats, ADHD-specific controls |

### 🧠 ADHD-Specific Design
- Overwhelm detection auto-simplifies the UI
- "Rescue Mode" provides a safe escape when frozen
- No shame for missed tasks — offers shrink, reschedule, convert-to-boss options
- Adaptive task ranking based on your current energy/focus state
- Configurable: time blindness level, overwhelm sensitivity, reward sensitivity

---

## Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/your-repo/ShadowSystem.git
cd ShadowSystem
npm install
```

### 2. Fonts (optional but recommended)
Download from Google Fonts and place in `assets/fonts/`:
- [Orbitron](https://fonts.google.com/specimen/Orbitron) (Regular, Medium, SemiBold, Bold, Black)
- [Rajdhani](https://fonts.google.com/specimen/Rajdhani) (Regular, Medium, SemiBold, Bold)

Then uncomment the font loading block in `App.tsx`.

### 3. Supabase Setup
```bash
cp .env.example .env
# Fill in your Supabase project URL and anon key
```

Run the database migration:
```bash
npx supabase db push
# Or manually run supabase/migrations/20250228_v1_2_schema.sql in the SQL editor
```

Deploy edge functions:
```bash
supabase functions deploy ai-breakdown
supabase functions deploy ai-next-action
supabase functions deploy ai-weekly-arc
supabase functions deploy ai-rescue
```

### 4. Run
```bash
# FIX #13: MMKV requires a development build — Expo Go is NOT supported
npx expo prebuild
npx expo run:ios    # or run:android
```

> **Note:** This app uses `react-native-mmkv` for high-performance local persistence.
> MMKV is a native module that requires a **development build** (`expo prebuild` + `expo run`).
> It will **not** work with Expo Go. For a quick local test without MMKV, swap to AsyncStorage
> in `src/store/useShadowStore.ts` and `src/data/sync.ts`.

---

## Architecture

```
ShadowSystem/
├── App.tsx                          # Entry + ErrorBoundary + startup sync
├── src/
│   ├── types/index.ts               # Complete TypeScript definitions
│   ├── constants/theme.ts           # Design tokens, colors, fonts, XP config
│   ├── store/useShadowStore.ts      # Zustand + MMKV persist (all 7 systems)
│   ├── data/sync.ts                 # Supabase ↔ MMKV repo layer + outbox queue
│   ├── components/
│   │   ├── GlassPanel.tsx           # Animated glassmorphism container
│   │   ├── UIKit.tsx                # XPBar, StatOrb, ActionButton, ProgressRing, etc.
│   │   ├── ErrorBoundary.tsx        # Global error boundary + screen states
│   │   └── SafeScreen.tsx           # Route param validation wrapper
│   ├── screens/                     # 12 screens (see table above)
│   ├── navigation/AppNavigator.tsx  # Stack + bottom tab navigator
│   ├── hooks/index.ts               # useTimer, useStateEngine, useNotifications
│   ├── utils/
│   │   ├── coreLogic.ts             # XP calc, recommendation engine, computeRules
│   │   └── notifications.ts         # Push token, daily plan, dedup scheduler
│   └── supabase/client.ts           # Client + edge function helpers
├── supabase/
│   ├── migrations/                  # Full Postgres schema (18 tables, RLS, indexes)
│   └── functions/                   # 3 AI edge functions (Deno)
└── .env.example
```

### State Management
Zustand store with MMKV persistence. No Provider wrapper needed — just import hooks:
```ts
import { useShadowStore, useQuestById } from './store/useShadowStore';
```

### XP & Progression
- Base XP per level: 1000 + (level × 500)
- Task start bonus: +10 XP
- Micro-step completion: +15 XP
- Boss completion: 2× base XP
- Streak bonus: up to +50%
- Combo bonus: up to +30%
- Rank progression: E(1) → D(10) → C(20) → B(35) → A(50) → S(70) → SS(85) → SSS(95) → Monarch(100)

### Adaptive UI
When the state engine detects overwhelm (high stress + low energy):
- Dashboard reduces to 3 visible items
- Animations suppressed
- Easy wins prioritized
- Rescue mode prompted
- Reward multiplier increases to 1.5×

---

## Database Schema (18 tables)

| Table | Purpose |
|-------|---------|
| `users` | Profile, rank, level, XP, coins |
| `user_preferences` | ADHD settings, AI tone, accessibility |
| `user_stats` | 6 core stats (Focus/Discipline/Energy/Recovery/Clarity/Courage) |
| `state_checkins` | Energy/mood/stress/focus logs |
| `buffs_debuffs` | Active buffs (Morning Momentum) and debuffs (Sleep Debt) |
| `campaigns` | Multi-week goal arcs |
| `campaign_milestones` | Weekly milestone tracking |
| `quests` | All tasks with boss metadata |
| `quest_steps` | AI-generated micro-steps |
| `boss_phases` | Boss fight phase tracking |
| `recurring_rules` | Daily/weekly recurrence config |
| `focus_sessions` | Sprint timer logs |
| `rewards` | Cosmetics, tokens, custom rewards |
| `achievements` | Unlockable badges |
| `skill_nodes` | Skill tree node definitions |
| `user_skill_nodes` | User's unlocked nodes |
| `daily_logs` | Per-day summary |
| `weekly_arcs` | AI-generated narrative arcs |
| `ai_recommendations` | Next-action and rescue suggestions |
| `notifications` | Scheduled push notifications |

All tables have Row Level Security (RLS) enabled — users can only access their own data.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native + Expo ~51.0.0 |
| Navigation | React Navigation 6 (Stack + Bottom Tabs) |
| State | Zustand 4.5 + MMKV persistence |
| Animations | Reanimated 3.15 + Gesture Handler 2.16 |
| UI | Custom glassmorphism, Linear Gradient, SVG |
| Backend | Supabase (Postgres + Edge Functions + Auth) |
| Notifications | Expo Notifications |
| Haptics | Expo Haptics |

---

## Build Phases

- [x] **Phase 1** — Auth, dashboard, quests, quest steps, focus sessions, XP/leveling, state check-ins
- [x] **Phase 2** — Boss fights, rescue mode, recurring quests, rewards, weekly arc summaries
- [x] **Phase 2.5 (v1.1 Stability)** — 12 initial audit fixes
- [x] **Phase 2.6 (v1.2 Runtime Audit)** — 14 runtime/wiring fixes:
  - #1 Real auth flow (Supabase signInWithOtp + session hydration)
  - #2 DB: `profiles` table references `auth.users`, trigger on `auth.users`
  - #3 Notification arg order fixed (named params object)
  - #4 Notification dedupe checks BEFORE cancel (no wipe-then-skip)
  - #5 AppState callback uses `getState()` (no stale closure)
  - #6 `push_token` column on profiles table
  - #7 Outbox returns entry ID, clears exact entry (no race)
  - #8 Full-domain sync (prefs, stats, skills, rewards, achievements)
  - #9 Profile progression synced after quest completion
  - #10 Skill tree: stat_points on profile, stat_point_cost on nodes, prereqs + server RPC
  - #11 Boss phases + current_phase on quests table
  - #12 Missing `ai-rescue` edge function created
  - #13 README: MMKV requires dev build, not Expo Go
  - #14 Duplicate XP/rank logic removed (single source in coreLogic.ts)
- [x] **Phase 3** — AI task breakdown (rule-based + edge function), AI next-action, real behavior insights (analytics engine), voice brain dump (expo-av recording), data-driven insights screen, interactive settings
- [x] **Phase 4** — Body doubling (4 companion personalities with dynamic prompts), battle log / chronicles screen, narrative events system, daily log auto-generation, weekly arcs, lore flavor text, new DB tables (battle_log, narrative_events)

**Total: ~9,750 lines across 38 source files, 20 DB tables, 4 edge functions**

---

## License

MIT

---

## v1.2 Runtime Audit Fixes

All 14 runtime bugs identified in the v1.1 audit have been addressed:

| # | Issue | Fix |
|---|-------|-----|
| 1 | Supabase auth dormant | Real auth flow: `signInWithOtp` + `verifyOtp` + `hydrateSession` on startup. Store wires `user.id` from `auth.users` session |
| 2 | DB schema mismatches auth | `users` → `profiles` table, `id` references `auth.users(id)`. Trigger on `auth.users` auto-creates profile + prefs + stats |
| 3 | Notification arg order wrong | `scheduleDailyPlan` now takes `{ quests, reminderStyle, streak }` object — no positional arg confusion |
| 4 | Dedupe wipes notifications | Dedupe key checked BEFORE `cancelAllScheduledNotificationsAsync`. Only cancels if actually rescheduling |
| 5 | AppState uses stale data | `handleAppState` and `scheduleNotifications` are standalone functions that call `useShadowStore.getState()` each time |
| 6 | push_token column missing | `profiles` table now has `push_token TEXT` column. `registerPushToken` writes to `profiles` |
| 7 | Outbox race condition | `pushOutbox` returns the entry ID. `tryImmediateWrite` clears that exact ID on success. No `.at(-1)` race |
| 8 | Sync only partial | `syncWithSupabase` now pulls: profile, preferences, stats, quests, steps, skill_nodes, unlocked_skills, rewards, achievements. Always sets arrays even when empty |
| 9 | Progression not synced | `completeQuest` calls `profilesRepo.syncProgression()` after XP/coin/streak changes. Server-side `complete_quest` RPC also available |
| 10 | Skill tree non-functional | `stat_points` on profile (earned every 5 levels), `stat_point_cost` on skill_nodes. Full prereq check + cost deduction + stat bonus application. Server-side `unlock_skill_node` RPC |
| 11 | Boss fights local-only | `boss_current_phase` column on quests. Boss HP derived from step completion + persisted. `boss_phases` table ready for phase-by-phase tracking |
| 12 | ai-rescue function missing | Created `supabase/functions/ai-rescue/index.ts` with state-based response logic |
| 13 | README says Expo Go | Updated to require `npx expo prebuild` + `expo run` (MMKV needs native modules) |
| 14 | Duplicate XP/rank logic | Removed `getRankForLevel` and `xpForLevel` from store — now imports from `utils/coreLogic.ts` (single source of truth) |

### New / rewritten files in v1.2
- `supabase/migrations/20250228_v1_2_schema.sql` — Full rewrite with `profiles`, RPCs, stat points
- `supabase/functions/ai-rescue/index.ts` — Missing edge function
- `src/data/sync.ts` — Rewritten: outbox race fix, full-domain repos, profiles table
- `src/utils/notifications.ts` — Rewritten: named params, dedupe-before-cancel
- `App.tsx` — Rewritten: auth hydration, getState() pattern, named notification params
- `src/store/useShadowStore.ts` — Updated: auth methods, profilesRepo, stat points, full sync
- `src/types/index.ts` — Updated: `statPoints` on UserProfile, `statPointCost` on SkillNode

### New files in v1.1
- `src/data/sync.ts` — Data layer (repos + outbox + Supabase mappers)
- `src/components/ErrorBoundary.tsx` — Error boundary + screen state components
- `src/components/SafeScreen.tsx` — Route param validation wrapper

### New / rewritten files in Phase 3+4
- `src/utils/analytics.ts` — NEW: Real behavior analysis engine (focus hours, failure patterns, win patterns, AI advice generation)
- `src/screens/BrainDumpScreen.tsx` — REWRITTEN: Voice recording (expo-av), AI edge function parsing, per-task modifiers, quest creation
- `src/screens/InsightsSettingsScreens.tsx` — REWRITTEN: Data-driven insights from analytics engine, interactive Switch/Picker/Slider settings, body doubling config
- `src/screens/BattleLogScreen.tsx` — NEW: Battle log, daily reports, weekly arcs tabs with lore flavor text
- `src/screens/FocusModeScreen.tsx` — UPDATED: Body doubling mode with 4 companion personalities, dynamic prompts, toggle during session
- `src/types/index.ts` — UPDATED: BattleLogEntry, NarrativeEvent, BodyDoubleConfig, COMPANION_PROMPTS, new UserPreferences fields
- `src/store/useShadowStore.ts` — UPDATED: Battle log, narrative events, daily log generation, auto battle entries on quest completion
- `src/data/sync.ts` — UPDATED: New preference field mappers (body double, sounds, haptics)
- `src/navigation/AppNavigator.tsx` — UPDATED: BattleLog screen route
- `supabase/migrations/20250228_v1_2_schema.sql` — UPDATED: battle_log + narrative_events tables, new pref columns, RLS policies
