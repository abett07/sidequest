// ═══════════════════════════════════════════════════
// AI-WEEKLY-ARC — Generate narrative weekly arc
// ═══════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ARC_NAMES = [
  "The Gauntlet of Discipline",
  "Shadow's Reckoning",
  "The Iron Gate Challenge",
  "Monarch's Training Arc",
  "The Frozen Threshold",
  "Rise of the Shadow Army",
  "The Dungeon of Deadlines",
  "Awakening Protocol",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { userId } = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get last 7 days of daily logs
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const { data: logs } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("log_date", weekAgo)
      .order("log_date", { ascending: true });

    // Get completed quests this week
    const { data: completedQuests } = await supabase
      .from("quests")
      .select("title, quest_type, category, xp_reward")
      .eq("user_id", userId)
      .eq("status", "done")
      .gte("completed_at", new Date(Date.now() - 7 * 86400000).toISOString());

    // Get active boss quests
    const { data: bosses } = await supabase
      .from("quests")
      .select("title, boss_name")
      .eq("user_id", userId)
      .eq("quest_type", "boss")
      .eq("status", "active");

    // Analyze patterns
    const totalXP = (logs || []).reduce((sum: number, l: any) => sum + (l.xp_earned || 0), 0);
    const totalFocus = (logs || []).reduce((sum: number, l: any) => sum + (l.focus_minutes || 0), 0);
    const completedCount = completedQuests?.length || 0;
    const bossCount = completedQuests?.filter((q: any) => q.quest_type === "boss").length || 0;
    const dominantDebuffs = (logs || [])
      .map((l: any) => l.dominant_debuff)
      .filter(Boolean);
    const riskPattern = dominantDebuffs.length >= 4 ? dominantDebuffs[0] : null;

    // Generate arc
    const arcTitle = ARC_NAMES[Math.floor(Math.random() * ARC_NAMES.length)];
    const mainBoss = bosses?.[0]?.boss_name || bosses?.[0]?.title || "The Week Ahead";
    const majorWin = completedQuests?.[0]?.title || null;

    const summary = [
      `This week you earned ${totalXP} XP across ${completedCount} completed quests.`,
      totalFocus > 0 ? `You spent ${totalFocus} minutes in deep focus.` : null,
      bossCount > 0 ? `You defeated ${bossCount} boss quest${bossCount > 1 ? "s" : ""}.` : null,
      riskPattern ? `Watch out: "${riskPattern}" appeared frequently.` : null,
    ].filter(Boolean).join(" ");

    const supportHabits = [
      "Start each day with a 3-min Ignite sprint",
      "Check in with your state before choosing tasks",
      totalFocus < 60 ? "Try at least one 25-min Dungeon session" : "Keep up the focus sessions",
    ];

    // Save the arc
    const { data: arc } = await supabase.from("weekly_arcs").insert({
      user_id: userId,
      week_start: weekAgo,
      title: arcTitle,
      summary,
      major_win: majorWin,
      main_boss_defeated: bossCount > 0 ? completedQuests?.find((q: any) => q.quest_type === "boss")?.title : null,
      risk_pattern: riskPattern,
    }).select().single();

    return new Response(
      JSON.stringify({ title: arcTitle, summary, mainBoss, supportHabits, arcId: arc?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
