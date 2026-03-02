-- Idempotency + focus completion RPC hardening

CREATE TABLE IF NOT EXISTS public.client_mutations (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mutation_type TEXT NOT NULL,
  entity_id TEXT,
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_mutations_user_created
  ON public.client_mutations(user_id, created_at DESC);

ALTER TABLE public.client_mutations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'client_mutations'
      AND policyname = 'Client mutations own'
  ) THEN
    CREATE POLICY "Client mutations own"
      ON public.client_mutations
      FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END
$$;

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
  v_new_xp INT;
  v_new_level INT;
  v_new_xp_to_next INT;
  v_new_rank TEXT;
  v_today DATE := CURRENT_DATE;
  v_new_streak INT;
  v_existing JSONB;
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

  SELECT user_id INTO v_user_id FROM quests WHERE id = p_quest_id;
  IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Quest not found or unauthorized';
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
    v_result JSONB;
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

    v_result := jsonb_build_object(
      'xp_total', v_new_xp,
      'level', v_new_level,
      'rank', v_new_rank,
      'streak', v_new_streak,
      'coins', v_profile.coins + p_coins_earned
    );

    IF p_client_mutation_id IS NOT NULL THEN
      INSERT INTO public.client_mutations (id, user_id, mutation_type, entity_id, result)
      VALUES (p_client_mutation_id, auth.uid(), 'complete_quest', p_quest_id::text, v_result)
      ON CONFLICT (id) DO NOTHING;
    END IF;

    RETURN v_result;
  END;
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

  SELECT * INTO v_profile FROM profiles WHERE id = v_user_id FOR UPDATE;

  IF p_completed THEN
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
    'xp_to_next', v_new_xp_to_next
  );

  IF p_client_mutation_id IS NOT NULL THEN
    INSERT INTO public.client_mutations (id, user_id, mutation_type, entity_id, result)
    VALUES (p_client_mutation_id, v_user_id, 'complete_focus_session', p_session_id, v_existing)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN v_existing;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
