-- Concurrency guards + broader idempotent mutation coverage

CREATE OR REPLACE FUNCTION public.complete_quest(
  p_quest_id UUID,
  p_xp_earned INT,
  p_coins_earned INT,
  p_client_mutation_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_profile profiles%ROWTYPE;
  v_quest quests%ROWTYPE;
  v_new_xp INT;
  v_new_level INT;
  v_new_xp_to_next INT;
  v_new_rank TEXT;
  v_today DATE := CURRENT_DATE;
  v_new_streak INT;
  v_existing JSONB;
  v_result JSONB;
BEGIN
  IF p_client_mutation_id IS NOT NULL THEN
    SELECT result INTO v_existing
    FROM public.client_mutations
    WHERE id = p_client_mutation_id
      AND user_id = auth.uid();

    IF v_existing IS NOT NULL THEN
      RETURN v_existing;
    END IF;
  END IF;

  SELECT * INTO v_quest FROM quests WHERE id = p_quest_id FOR UPDATE;
  v_user_id := v_quest.user_id;

  IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Quest not found or unauthorized';
  END IF;

  -- SQL-level state guard: do not award progression twice for already-completed quests.
  IF v_quest.status = 'done' THEN
    SELECT * INTO v_profile FROM profiles WHERE id = v_user_id;
    v_result := jsonb_build_object(
      'xp_total', v_profile.xp_total,
      'level', v_profile.level,
      'rank', v_profile.rank,
      'streak', v_profile.streak,
      'coins', v_profile.coins,
      'already_completed', true
    );

    IF p_client_mutation_id IS NOT NULL THEN
      INSERT INTO public.client_mutations (id, user_id, mutation_type, entity_id, result)
      VALUES (p_client_mutation_id, auth.uid(), 'complete_quest', p_quest_id::text, v_result)
      ON CONFLICT (id) DO NOTHING;
    END IF;

    RETURN v_result;
  END IF;

  UPDATE quests SET status = 'done', completed_at = NOW() WHERE id = p_quest_id;

  SELECT * INTO v_profile FROM profiles WHERE id = v_user_id FOR UPDATE;

  v_new_xp := v_profile.xp_total + p_xp_earned;
  v_new_level := v_profile.level;
  v_new_xp_to_next := v_profile.xp_to_next;

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

  IF v_profile.last_streak_date = v_today THEN
    v_new_streak := v_profile.streak;
  ELSE
    v_new_streak := v_profile.streak + 1;
  END IF;

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

  v_result := jsonb_build_object(
    'xp_total', v_new_xp,
    'level', v_new_level,
    'rank', v_new_rank,
    'streak', v_new_streak,
    'coins', v_profile.coins + p_coins_earned,
    'already_completed', false
  );

  IF p_client_mutation_id IS NOT NULL THEN
    INSERT INTO public.client_mutations (id, user_id, mutation_type, entity_id, result)
    VALUES (p_client_mutation_id, auth.uid(), 'complete_quest', p_quest_id::text, v_result)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.complete_focus_session(
  p_session_id TEXT,
  p_quest_id UUID,
  p_session_type TEXT,
  p_planned_minutes INT,
  p_actual_minutes INT,
  p_distraction_count INT,
  p_quality_score INT,
  p_completed BOOLEAN,
  p_started_at TIMESTAMPTZ,
  p_ended_at TIMESTAMPTZ,
  p_xp_earned INT,
  p_client_mutation_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_existing JSONB;
  v_user_id UUID := auth.uid();
  v_profile profiles%ROWTYPE;
  v_new_xp INT;
  v_new_level INT;
  v_new_xp_to_next INT;
  v_new_rank TEXT;
  v_prev_completed BOOLEAN := FALSE;
  v_should_award_xp BOOLEAN := FALSE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_client_mutation_id IS NOT NULL THEN
    SELECT result INTO v_existing
    FROM public.client_mutations
    WHERE id = p_client_mutation_id
      AND user_id = v_user_id;
    IF v_existing IS NOT NULL THEN
      RETURN v_existing;
    END IF;
  END IF;

  SELECT completed INTO v_prev_completed
  FROM public.focus_sessions
  WHERE id = p_session_id::uuid
    AND user_id = v_user_id
  FOR UPDATE;

  INSERT INTO public.focus_sessions (
    id, user_id, quest_id, session_type, planned_minutes, actual_minutes,
    completed, distraction_count, quality_score, started_at, ended_at
  )
  VALUES (
    p_session_id::uuid,
    v_user_id,
    p_quest_id,
    p_session_type,
    p_planned_minutes,
    p_actual_minutes,
    p_completed,
    p_distraction_count,
    p_quality_score,
    p_started_at,
    p_ended_at
  )
  ON CONFLICT (id) DO UPDATE SET
    actual_minutes = EXCLUDED.actual_minutes,
    completed = EXCLUDED.completed,
    distraction_count = EXCLUDED.distraction_count,
    quality_score = EXCLUDED.quality_score,
    ended_at = EXCLUDED.ended_at;

  v_should_award_xp := p_completed AND COALESCE(v_prev_completed, FALSE) = FALSE;

  SELECT * INTO v_profile FROM profiles WHERE id = v_user_id FOR UPDATE;

  IF v_should_award_xp THEN
    v_new_xp := v_profile.xp_total + GREATEST(p_xp_earned, 0);
  ELSE
    v_new_xp := v_profile.xp_total;
  END IF;

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

  UPDATE profiles SET
    xp_total = v_new_xp,
    level = v_new_level,
    xp_to_next = v_new_xp_to_next,
    rank = v_new_rank,
    last_active_date = CURRENT_DATE
  WHERE id = v_user_id;

  v_existing := jsonb_build_object(
    'xp_total', v_new_xp,
    'level', v_new_level,
    'rank', v_new_rank,
    'xp_to_next', v_new_xp_to_next,
    'xp_awarded', v_should_award_xp
  );

  IF p_client_mutation_id IS NOT NULL THEN
    INSERT INTO public.client_mutations (id, user_id, mutation_type, entity_id, result)
    VALUES (p_client_mutation_id, v_user_id, 'complete_focus_session', p_session_id, v_existing)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN v_existing;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.unlock_skill_node(
  p_node_key TEXT,
  p_client_mutation_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_node skill_nodes%ROWTYPE;
  v_user_id UUID := auth.uid();
  v_profile profiles%ROWTYPE;
  v_already_unlocked BOOLEAN;
  v_existing JSONB;
BEGIN
  IF p_client_mutation_id IS NOT NULL THEN
    SELECT result INTO v_existing
    FROM public.client_mutations
    WHERE id = p_client_mutation_id
      AND user_id = v_user_id;
    IF v_existing IS NOT NULL THEN
      RETURN v_existing;
    END IF;
  END IF;

  SELECT * INTO v_node FROM skill_nodes WHERE key = p_node_key;
  IF NOT FOUND THEN RAISE EXCEPTION 'Node not found'; END IF;

  SELECT * INTO v_profile FROM profiles WHERE id = v_user_id FOR UPDATE;

  SELECT EXISTS(
    SELECT 1 FROM user_skill_nodes WHERE user_id = v_user_id AND skill_node_id = v_node.id
  ) INTO v_already_unlocked;

  IF v_already_unlocked THEN
    v_existing := jsonb_build_object('unlocked', p_node_key, 'stat_bonus', v_node.stat_bonus, 'already_unlocked', true);
  ELSE
    IF v_profile.stat_points < v_node.stat_point_cost THEN
      RAISE EXCEPTION 'Not enough stat points';
    END IF;

    IF v_profile.level < (v_node.level * 5) THEN
      RAISE EXCEPTION 'Level too low';
    END IF;

    UPDATE profiles SET stat_points = stat_points - v_node.stat_point_cost WHERE id = v_user_id;
    INSERT INTO user_skill_nodes (user_id, skill_node_id) VALUES (v_user_id, v_node.id);

    UPDATE user_stats SET
      focus_stat = focus_stat + COALESCE((v_node.stat_bonus->>'focus')::INT, 0),
      discipline_stat = discipline_stat + COALESCE((v_node.stat_bonus->>'discipline')::INT, 0),
      energy_stat = energy_stat + COALESCE((v_node.stat_bonus->>'energy')::INT, 0),
      recovery_stat = recovery_stat + COALESCE((v_node.stat_bonus->>'recovery')::INT, 0),
      clarity_stat = clarity_stat + COALESCE((v_node.stat_bonus->>'clarity')::INT, 0),
      courage_stat = courage_stat + COALESCE((v_node.stat_bonus->>'courage')::INT, 0),
      updated_at = NOW()
    WHERE user_id = v_user_id;

    v_existing := jsonb_build_object('unlocked', p_node_key, 'stat_bonus', v_node.stat_bonus, 'already_unlocked', false);
  END IF;

  IF p_client_mutation_id IS NOT NULL THEN
    INSERT INTO public.client_mutations (id, user_id, mutation_type, entity_id, result)
    VALUES (p_client_mutation_id, v_user_id, 'unlock_skill_node', p_node_key, v_existing)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN v_existing;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Economy mutation: idempotent reward redemption (chest/tokens/themes/custom)
CREATE OR REPLACE FUNCTION public.redeem_reward(
  p_reward_id UUID,
  p_client_mutation_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_reward rewards%ROWTYPE;
  v_profile profiles%ROWTYPE;
  v_existing JSONB;
BEGIN
  IF p_client_mutation_id IS NOT NULL THEN
    SELECT result INTO v_existing
    FROM public.client_mutations
    WHERE id = p_client_mutation_id
      AND user_id = v_user_id;
    IF v_existing IS NOT NULL THEN
      RETURN v_existing;
    END IF;
  END IF;

  SELECT * INTO v_reward
  FROM rewards
  WHERE id = p_reward_id
    AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reward not found';
  END IF;

  IF v_reward.unlocked THEN
    v_existing := jsonb_build_object(
      'reward_id', v_reward.id,
      'coins_remaining', (SELECT coins FROM profiles WHERE id = v_user_id),
      'already_redeemed', true
    );
  ELSE
    SELECT * INTO v_profile FROM profiles WHERE id = v_user_id FOR UPDATE;

    IF v_profile.coins < v_reward.cost_coins THEN
      RAISE EXCEPTION 'Not enough coins';
    END IF;

    UPDATE profiles
    SET coins = coins - v_reward.cost_coins,
        last_active_date = CURRENT_DATE
    WHERE id = v_user_id;

    UPDATE rewards
    SET unlocked = true,
        redeemed_at = NOW()
    WHERE id = v_reward.id;

    v_existing := jsonb_build_object(
      'reward_id', v_reward.id,
      'coins_remaining', v_profile.coins - v_reward.cost_coins,
      'already_redeemed', false
    );
  END IF;

  IF p_client_mutation_id IS NOT NULL THEN
    INSERT INTO public.client_mutations (id, user_id, mutation_type, entity_id, result)
    VALUES (p_client_mutation_id, v_user_id, 'redeem_reward', p_reward_id::text, v_existing)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN v_existing;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
