-- ═══════════════════════════════════════════════════
-- SHADOW SYSTEM v1.2 — Full Database Schema
-- FIX #2: profiles keyed to auth.users(id)
-- FIX #6: push_token column
-- FIX #10: stat_points + stat_point_cost on skill_nodes
-- FIX #11: current_phase on quests for boss persistence
-- ═══════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ═══════════════════════════════════════════════════
-- IDENTITY SYSTEM
-- profiles.id = auth.users.id (not a separate sequence)
-- ═══════════════════════════════════════════════════

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  timezone TEXT DEFAULT 'UTC',
  display_name TEXT,
  character_name TEXT DEFAULT 'Hunter',
  rank TEXT DEFAULT 'E' CHECK (rank IN ('E','D','C','B','A','S','SS','SSS','Monarch')),
  level INT DEFAULT 1 CHECK (level >= 1),
  xp_total INT DEFAULT 0 CHECK (xp_total >= 0),
  xp_to_next INT DEFAULT 1500,
  coins INT DEFAULT 0 CHECK (coins >= 0),
  stat_points INT DEFAULT 0 CHECK (stat_points >= 0),
  theme_mode TEXT DEFAULT 'hunter' CHECK (theme_mode IN ('hunter','system','minimal')),
  reminder_style TEXT DEFAULT 'direct' CHECK (reminder_style IN ('gentle','direct','intense')),
  play_style TEXT DEFAULT 'balanced' CHECK (play_style IN ('calm','intense','balanced')),
  streak INT DEFAULT 0,
  combo INT DEFAULT 0,
  last_streak_date DATE,
  last_active_date DATE,
  grace_used_at DATE,
  push_token TEXT
);

CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  stimulation_mode TEXT DEFAULT 'medium' CHECK (stimulation_mode IN ('low','medium','high')),
  reward_sensitivity INT DEFAULT 3 CHECK (reward_sensitivity BETWEEN 1 AND 5),
  reminder_tolerance INT DEFAULT 3 CHECK (reminder_tolerance BETWEEN 1 AND 5),
  overwhelm_sensitivity INT DEFAULT 3 CHECK (overwhelm_sensitivity BETWEEN 1 AND 5),
  time_blindness_level TEXT DEFAULT 'medium' CHECK (time_blindness_level IN ('low','medium','high')),
  preferred_focus_length INT DEFAULT 25,
  ai_tone TEXT DEFAULT 'commander' CHECK (ai_tone IN ('commander','mentor','calm','hype')),
  reduce_motion BOOLEAN DEFAULT FALSE,
  low_clutter_mode BOOLEAN DEFAULT FALSE,
  mute_sounds BOOLEAN DEFAULT FALSE,
  mute_haptics BOOLEAN DEFAULT FALSE,
  body_double_enabled BOOLEAN DEFAULT FALSE,
  body_double_personality TEXT DEFAULT 'commander' CHECK (body_double_personality IN ('commander','cheerleader','stoic','gentle')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  focus_stat INT DEFAULT 10 CHECK (focus_stat BETWEEN 0 AND 100),
  discipline_stat INT DEFAULT 10 CHECK (discipline_stat BETWEEN 0 AND 100),
  energy_stat INT DEFAULT 10 CHECK (energy_stat BETWEEN 0 AND 100),
  recovery_stat INT DEFAULT 10 CHECK (recovery_stat BETWEEN 0 AND 100),
  clarity_stat INT DEFAULT 10 CHECK (clarity_stat BETWEEN 0 AND 100),
  courage_stat INT DEFAULT 10 CHECK (courage_stat BETWEEN 0 AND 100),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- STATE SYSTEM
-- ═══════════════════════════════════════════════════

CREATE TABLE state_checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  mood INT CHECK (mood BETWEEN 1 AND 5),
  energy INT CHECK (energy BETWEEN 1 AND 5),
  stress INT CHECK (stress BETWEEN 1 AND 5),
  focus INT CHECK (focus BETWEEN 1 AND 5),
  state_tag TEXT CHECK (state_tag IN ('overwhelmed','frozen','anxious','distracted','low_energy','hyperfocus','clear','motivated')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE buffs_debuffs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('buff','debuff')),
  name TEXT NOT NULL,
  intensity INT DEFAULT 1 CHECK (intensity BETWEEN 1 AND 3),
  source TEXT,
  icon TEXT,
  color TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT TRUE
);

-- ═══════════════════════════════════════════════════
-- QUEST SYSTEM
-- ═══════════════════════════════════════════════════

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('study','admin','health','chores','work','social')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','paused','failed')),
  progress_pct INT DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  due_date TIMESTAMPTZ,
  main_boss TEXT,
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low','medium','high')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE quests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('study','admin','health','chores','work','social')),
  quest_type TEXT DEFAULT 'normal' CHECK (quest_type IN ('normal','boss','recurring','recovery')),
  status TEXT DEFAULT 'active' CHECK (status IN ('inbox','active','in_progress','done','paused','failed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  difficulty_score INT DEFAULT 2 CHECK (difficulty_score BETWEEN 1 AND 5),
  emotional_weight_score INT DEFAULT 2 CHECK (emotional_weight_score BETWEEN 1 AND 5),
  friction_score INT DEFAULT 2 CHECK (friction_score BETWEEN 1 AND 5),
  estimated_minutes INT DEFAULT 30,
  due_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  xp_reward INT DEFAULT 100,
  coin_reward INT DEFAULT 10,
  -- Boss-specific fields
  boss_hp INT,
  boss_max_hp INT,
  boss_name TEXT,
  boss_weak_points JSONB DEFAULT '[]'::JSONB,
  boss_current_phase INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE quest_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quest_id UUID REFERENCES quests(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  title TEXT NOT NULL,
  is_required BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done','skipped')),
  estimated_minutes INT,
  completed_at TIMESTAMPTZ
);

CREATE TABLE boss_phases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quest_id UUID REFERENCES quests(id) ON DELETE CASCADE,
  phase_order INT NOT NULL,
  title TEXT NOT NULL,
  hp_value INT DEFAULT 100,
  status TEXT DEFAULT 'locked' CHECK (status IN ('locked','active','defeated')),
  completed_at TIMESTAMPTZ
);

CREATE TABLE recurring_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quest_id UUID REFERENCES quests(id) ON DELETE CASCADE UNIQUE,
  recurrence_type TEXT NOT NULL CHECK (recurrence_type IN ('daily','weekly','custom')),
  recurrence_config JSONB DEFAULT '{}'::JSONB,
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE campaign_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  week_number INT,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ
);

-- ═══════════════════════════════════════════════════
-- FOCUS SYSTEM
-- ═══════════════════════════════════════════════════

CREATE TABLE focus_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  quest_id UUID REFERENCES quests(id) ON DELETE SET NULL,
  session_type TEXT CHECK (session_type IN ('ignite','scout','dungeon','raid','custom','rescue')),
  planned_minutes INT NOT NULL,
  actual_minutes INT DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  distraction_count INT DEFAULT 0,
  quality_score INT DEFAULT 0 CHECK (quality_score BETWEEN 0 AND 5),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- ═══════════════════════════════════════════════════
-- PROGRESSION SYSTEM
-- ═══════════════════════════════════════════════════

CREATE TABLE rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reward_type TEXT CHECK (reward_type IN ('theme','token','chest','custom','cosmetic')),
  title TEXT NOT NULL,
  description TEXT,
  cost_coins INT DEFAULT 0,
  unlocked BOOLEAN DEFAULT FALSE,
  icon TEXT,
  redeemed_at TIMESTAMPTZ
);

CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  unlocked_at TIMESTAMPTZ
);

CREATE TABLE skill_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  branch TEXT CHECK (branch IN ('focus','consistency','recovery','order','confidence','execution')),
  title TEXT NOT NULL,
  description TEXT,
  unlock_rule TEXT,
  stat_bonus JSONB DEFAULT '{}'::JSONB,
  stat_point_cost INT DEFAULT 0,
  icon TEXT,
  requires JSONB DEFAULT '[]'::JSONB,
  level INT DEFAULT 1
);

CREATE TABLE user_skill_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  skill_node_id UUID REFERENCES skill_nodes(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, skill_node_id)
);

-- ═══════════════════════════════════════════════════
-- NARRATIVE + INTELLIGENCE SYSTEM
-- ═══════════════════════════════════════════════════

CREATE TABLE daily_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  quests_completed INT DEFAULT 0,
  xp_earned INT DEFAULT 0,
  focus_minutes INT DEFAULT 0,
  streak_continued BOOLEAN DEFAULT FALSE,
  main_win TEXT,
  dominant_debuff TEXT,
  UNIQUE (user_id, log_date)
);

CREATE TABLE weekly_arcs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  title TEXT,
  summary TEXT,
  major_win TEXT,
  main_boss_defeated TEXT,
  risk_pattern TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 4: Battle Log
CREATE TABLE battle_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('quest_complete','boss_defeat','boss_phase','rank_up','streak_milestone','rescue_used','skill_unlock','achievement','daily_summary')),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  xp_earned INT DEFAULT 0,
  icon TEXT DEFAULT '⚔️',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_battle_log_user ON battle_log(user_id, created_at DESC);

-- Phase 4: Narrative Events
CREATE TABLE narrative_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('lore','title_earned','arc_begin','arc_end','rank_ceremony')),
  content TEXT NOT NULL,
  flavor_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ai_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  recommendation_type TEXT CHECK (recommendation_type IN ('next_action','rescue','schedule','insight','backup')),
  content TEXT NOT NULL,
  source_context JSONB DEFAULT '{}'::JSONB,
  accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('quest_reminder','streak_warning','buff_expired','rank_up','boss_ready','weekly_arc')),
  title TEXT NOT NULL,
  body TEXT,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  action_target_type TEXT,
  action_target_id UUID
);

-- ═══════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════

CREATE INDEX idx_quests_user_status ON quests(user_id, status);
CREATE INDEX idx_quests_user_type ON quests(user_id, quest_type);
CREATE INDEX idx_quests_user_priority ON quests(user_id, priority);
CREATE INDEX idx_quests_due ON quests(due_at) WHERE due_at IS NOT NULL;
CREATE INDEX idx_quest_steps_quest ON quest_steps(quest_id, step_order);
CREATE INDEX idx_boss_phases_quest ON boss_phases(quest_id, phase_order);
CREATE INDEX idx_focus_sessions_user ON focus_sessions(user_id, started_at DESC);
CREATE INDEX idx_state_checkins_user ON state_checkins(user_id, created_at DESC);
CREATE INDEX idx_buffs_active ON buffs_debuffs(user_id, active) WHERE active = TRUE;
CREATE INDEX idx_daily_logs_user ON daily_logs(user_id, log_date DESC);
CREATE INDEX idx_weekly_arcs_user ON weekly_arcs(user_id, week_start DESC);
CREATE INDEX idx_campaigns_user ON campaigns(user_id, status);

-- ═══════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE buffs_debuffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE boss_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skill_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_arcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles own data" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "User prefs own" ON user_preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "User stats own" ON user_stats FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "State checkins own" ON state_checkins FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Buffs own" ON buffs_debuffs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Campaigns own" ON campaigns FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Quests own" ON quests FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Quest steps own" ON quest_steps FOR ALL USING (
  EXISTS (SELECT 1 FROM quests WHERE quests.id = quest_steps.quest_id AND quests.user_id = auth.uid())
);
CREATE POLICY "Boss phases own" ON boss_phases FOR ALL USING (
  EXISTS (SELECT 1 FROM quests WHERE quests.id = boss_phases.quest_id AND quests.user_id = auth.uid())
);
CREATE POLICY "Recurring own" ON recurring_rules FOR ALL USING (
  EXISTS (SELECT 1 FROM quests WHERE quests.id = recurring_rules.quest_id AND quests.user_id = auth.uid())
);
CREATE POLICY "Focus own" ON focus_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Rewards own" ON rewards FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Achievements own" ON achievements FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Skills own" ON user_skill_nodes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Daily logs own" ON daily_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Weekly arcs own" ON weekly_arcs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "AI recs own" ON ai_recommendations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Notifications own" ON notifications FOR ALL USING (auth.uid() = user_id);

ALTER TABLE battle_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Battle log own" ON battle_log FOR ALL USING (auth.uid() = user_id);

ALTER TABLE narrative_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Narrative events own" ON narrative_events FOR ALL USING (auth.uid() = user_id);

ALTER TABLE skill_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Skill nodes readable" ON skill_nodes FOR SELECT USING (TRUE);

-- ═══════════════════════════════════════════════════
-- FIX #2: Trigger on auth.users → auto-create profile row
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, character_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Hunter'),
    COALESCE(NEW.raw_user_meta_data->>'character_name', 'Hunter')
  );
  INSERT INTO public.user_preferences (user_id) VALUES (NEW.id);
  INSERT INTO public.user_stats (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════════════
-- Server-side RPC: complete_quest
-- Single atomic operation for quest completion
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.complete_quest(
  p_quest_id UUID,
  p_xp_earned INT,
  p_coins_earned INT
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_profile profiles%ROWTYPE;
  v_new_xp INT;
  v_new_level INT;
  v_new_xp_to_next INT;
  v_new_rank TEXT;
  v_today DATE := CURRENT_DATE;
  v_new_streak INT;
BEGIN
  -- Get quest owner
  SELECT user_id INTO v_user_id FROM quests WHERE id = p_quest_id;
  IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Quest not found or unauthorized';
  END IF;

  -- Mark quest done
  UPDATE quests SET status = 'done', completed_at = NOW() WHERE id = p_quest_id;

  -- Get current profile
  SELECT * INTO v_profile FROM profiles WHERE id = v_user_id FOR UPDATE;

  -- Calculate new XP + level
  v_new_xp := v_profile.xp_total + p_xp_earned;
  v_new_level := v_profile.level;
  v_new_xp_to_next := v_profile.xp_to_next;

  -- Level-up loop
  DECLARE
    v_level_xp INT := v_new_xp;
    v_temp_level INT := 1;
    v_temp_next INT := 1500;
  BEGIN
    WHILE v_level_xp >= v_temp_next AND v_temp_level < 999 LOOP
      v_level_xp := v_level_xp - v_temp_next;
      v_temp_level := v_temp_level + 1;
      v_temp_next := 1000 + (v_temp_level * 500);
    END LOOP;
    v_new_level := v_temp_level;
    v_new_xp_to_next := v_temp_next;
  END;

  -- Calculate rank
  v_new_rank := CASE
    WHEN v_new_level >= 100 THEN 'Monarch'
    WHEN v_new_level >= 95 THEN 'SSS'
    WHEN v_new_level >= 85 THEN 'SS'
    WHEN v_new_level >= 70 THEN 'S'
    WHEN v_new_level >= 50 THEN 'A'
    WHEN v_new_level >= 35 THEN 'B'
    WHEN v_new_level >= 20 THEN 'C'
    WHEN v_new_level >= 10 THEN 'D'
    ELSE 'E'
  END;

  -- Calculate streak
  IF v_profile.last_streak_date = v_today THEN
    v_new_streak := v_profile.streak;
  ELSE
    v_new_streak := v_profile.streak + 1;
  END IF;

  -- Award stat point every 5 levels
  DECLARE
    v_new_stat_points INT := v_profile.stat_points;
  BEGIN
    IF v_new_level > v_profile.level THEN
      v_new_stat_points := v_new_stat_points + ((v_new_level / 5) - (v_profile.level / 5));
    END IF;

    UPDATE profiles SET
      xp_total = v_new_xp,
      level = v_new_level,
      xp_to_next = v_new_xp_to_next,
      rank = v_new_rank,
      coins = coins + p_coins_earned,
      streak = v_new_streak,
      last_streak_date = v_today,
      last_active_date = v_today,
      stat_points = v_new_stat_points
    WHERE id = v_user_id;
  END;

  RETURN jsonb_build_object(
    'xp_total', v_new_xp,
    'level', v_new_level,
    'rank', v_new_rank,
    'streak', v_new_streak,
    'coins', v_profile.coins + p_coins_earned
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════
-- Server-side RPC: unlock_skill_node
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.unlock_skill_node(p_node_key TEXT)
RETURNS JSONB AS $$
DECLARE
  v_node skill_nodes%ROWTYPE;
  v_user_id UUID := auth.uid();
  v_profile profiles%ROWTYPE;
  v_already_unlocked BOOLEAN;
BEGIN
  SELECT * INTO v_node FROM skill_nodes WHERE key = p_node_key;
  IF NOT FOUND THEN RAISE EXCEPTION 'Node not found'; END IF;

  SELECT * INTO v_profile FROM profiles WHERE id = v_user_id FOR UPDATE;

  -- Check already unlocked
  SELECT EXISTS(
    SELECT 1 FROM user_skill_nodes WHERE user_id = v_user_id AND skill_node_id = v_node.id
  ) INTO v_already_unlocked;
  IF v_already_unlocked THEN RAISE EXCEPTION 'Already unlocked'; END IF;

  -- Check stat points
  IF v_profile.stat_points < v_node.stat_point_cost THEN
    RAISE EXCEPTION 'Not enough stat points';
  END IF;

  -- Check level requirement
  IF v_profile.level < (v_node.level * 5) THEN
    RAISE EXCEPTION 'Level too low';
  END IF;

  -- Deduct stat points + unlock
  UPDATE profiles SET stat_points = stat_points - v_node.stat_point_cost WHERE id = v_user_id;
  INSERT INTO user_skill_nodes (user_id, skill_node_id) VALUES (v_user_id, v_node.id);

  -- Apply stat bonuses
  UPDATE user_stats SET
    focus_stat = focus_stat + COALESCE((v_node.stat_bonus->>'focus')::INT, 0),
    discipline_stat = discipline_stat + COALESCE((v_node.stat_bonus->>'discipline')::INT, 0),
    energy_stat = energy_stat + COALESCE((v_node.stat_bonus->>'energy')::INT, 0),
    recovery_stat = recovery_stat + COALESCE((v_node.stat_bonus->>'recovery')::INT, 0),
    clarity_stat = clarity_stat + COALESCE((v_node.stat_bonus->>'clarity')::INT, 0),
    courage_stat = courage_stat + COALESCE((v_node.stat_bonus->>'courage')::INT, 0),
    updated_at = NOW()
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object('unlocked', p_node_key, 'stat_bonus', v_node.stat_bonus);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════
-- SEED: Default Skill Tree Nodes (with stat_point_cost)
-- ═══════════════════════════════════════════════════

INSERT INTO skill_nodes (key, branch, title, description, unlock_rule, stat_bonus, stat_point_cost, icon, level) VALUES
  ('focus_1',       'focus',       'Sharp Eye',          'Start 10 tasks within 2 minutes of prompt',   'tasks_started_fast >= 10', '{"focus": 5}', 1, '🎯', 1),
  ('focus_2',       'focus',       'First Step Master',  'Start 20 tasks within 2 minutes of prompt',   'tasks_started_fast >= 20', '{"focus": 15}', 2, '🎯', 2),
  ('consistency_1', 'consistency', 'Streak Starter',     'Maintain a 3-day streak',                     'streak >= 3',              '{"discipline": 5}', 1, '🔁', 1),
  ('consistency_2', 'consistency', 'Iron Will',          'Maintain a 14-day streak',                    'streak >= 14',             '{"discipline": 15}', 2, '🔁', 2),
  ('recovery_1',    'recovery',    'Phoenix Down',       'Use rescue mode 5 times and recover',         'rescue_recoveries >= 5',   '{"recovery": 10}', 1, '🌿', 1),
  ('recovery_2',    'recovery',    'Second Wind',        'Complete 3 tasks after using rescue mode',     'post_rescue_completions >= 3', '{"recovery": 15}', 2, '🌿', 2),
  ('order_1',       'order',       'Planner',            'Complete 10 tasks with all micro-steps done',  'full_step_completions >= 10', '{"clarity": 8}', 1, '📋', 1),
  ('confidence_1',  'confidence',  'Boss Slayer',        'Defeat 3 boss quests',                        'bosses_defeated >= 3',     '{"courage": 8}', 1, '🦁', 1),
  ('execution_1',   'execution',   'Dungeon Runner',     'Complete 10 focus sessions (25+ min)',         'long_sessions >= 10',      '{"focus": 5, "discipline": 5}', 1, '⚡', 1),
  ('mastery',       'execution',   'Shadow Monarch',     'Reach Level 50',                              'level >= 50',              '{"focus": 10, "discipline": 10, "courage": 10}', 5, '👑', 3);
