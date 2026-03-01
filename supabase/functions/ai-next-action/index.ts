// ═══════════════════════════════════════════════════
// AI-NEXT-ACTION — Recommend the best next task
// ═══════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { userId, currentState } = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch active quests
    const { data: quests } = await supabase
      .from("quests")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["active", "in_progress"])
      .order("priority", { ascending: false });

    if (!quests || quests.length === 0) {
      return new Response(
        JSON.stringify({ questId: null, reason: "No active quests found. Time to brain dump!" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Score each quest
    const scored = quests.map((q: any) => {
      let score = 0;

      // Priority
      const pWeights: Record<string, number> = { critical: 40, high: 30, medium: 15, low: 5 };
      score += pWeights[q.priority] || 10;

      // State fit
      if (currentState.energy <= 2) {
        score += (5 - q.difficulty_score) * 6;  // Favor easy
      } else if (currentState.focus >= 4) {
        score += q.difficulty_score * 4;  // Can handle hard
        score += q.xp_reward / 30;
      }

      if (currentState.stateTag === "overwhelmed" || currentState.stateTag === "frozen") {
        score += (5 - q.difficulty_score) * 10;  // Strongly favor easy
        score -= q.emotional_weight_score * 5;
      }

      // Friction penalty
      score -= q.friction_score * 3;

      // Time awareness (favor shorter when low energy)
      if (currentState.energy <= 2 && q.estimated_minutes <= 15) score += 15;

      // Boss bonus when in good state
      if (q.quest_type === "boss" && currentState.focus >= 3 && currentState.energy >= 3) {
        score += 20;
      }

      return { questId: q.id, title: q.title, score };
    });

    scored.sort((a: any, b: any) => b.score - a.score);
    const best = scored[0];

    // Generate reason
    let reason = "Best match for your current state.";
    if (currentState.stateTag === "overwhelmed") reason = "Easiest win to build momentum.";
    else if (currentState.energy <= 2) reason = "Low-friction task that fits your energy.";
    else if (currentState.focus >= 4) reason = "High-impact task — your focus is strong.";

    return new Response(
      JSON.stringify({ questId: best.questId, title: best.title, reason, backupQuestId: scored[1]?.questId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
