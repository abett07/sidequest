// ═══════════════════════════════════════════════════
// AI-BREAKDOWN — Decompose tasks into micro-steps
// Supabase Edge Function (Deno)
// ═══════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { taskText, difficulty, category, estimatedMinutes } = await req.json();

    // ── In production, call your LLM API (OpenAI, Anthropic, Grok, etc.) ──
    // const llmResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`, 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     model: 'gpt-4o-mini',
    //     messages: [{
    //       role: 'system',
    //       content: 'Break this task into 3-7 micro-steps. Each step should be completable in 2-10 minutes. Format: JSON array of { title: string, estimatedMinutes: number, isRequired: boolean }'
    //     }, {
    //       role: 'user',
    //       content: `Task: "${taskText}" (difficulty: ${difficulty}/5, category: ${category}, est. ${estimatedMinutes} min)`
    //     }],
    //   }),
    // });

    // ── Fallback: Rule-based decomposition ──
    const steps = generateSteps(taskText, difficulty || 3, estimatedMinutes || 30);

    return new Response(
      JSON.stringify({ steps, source: "rule_based" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateSteps(taskText: string, difficulty: number, minutes: number) {
  const lowerTask = taskText.toLowerCase();
  const stepCount = Math.max(3, Math.min(7, difficulty + 1));
  const minutesPerStep = Math.round(minutes / stepCount);

  // Pattern-based decomposition
  if (lowerTask.includes("report") || lowerTask.includes("document") || lowerTask.includes("write")) {
    return [
      { title: "Gather all source materials", estimatedMinutes: minutesPerStep, isRequired: true },
      { title: "Create outline / structure", estimatedMinutes: minutesPerStep, isRequired: true },
      { title: "Draft first section", estimatedMinutes: minutesPerStep, isRequired: true },
      { title: "Draft remaining sections", estimatedMinutes: minutesPerStep, isRequired: true },
      { title: "Add supporting data / visuals", estimatedMinutes: minutesPerStep, isRequired: false },
      { title: "Review and polish", estimatedMinutes: minutesPerStep, isRequired: true },
    ].slice(0, stepCount);
  }

  if (lowerTask.includes("study") || lowerTask.includes("read") || lowerTask.includes("chapter")) {
    return [
      { title: "Skim headings and key terms", estimatedMinutes: 3, isRequired: true },
      { title: "Read the material actively", estimatedMinutes: Math.round(minutes * 0.5), isRequired: true },
      { title: "Take notes on key concepts", estimatedMinutes: Math.round(minutes * 0.25), isRequired: false },
      { title: "Test yourself on the material", estimatedMinutes: Math.round(minutes * 0.25), isRequired: true },
    ];
  }

  if (lowerTask.includes("email") || lowerTask.includes("message") || lowerTask.includes("reply")) {
    return [
      { title: "Open the email / thread", estimatedMinutes: 1, isRequired: true },
      { title: "Identify the key ask or question", estimatedMinutes: 2, isRequired: true },
      { title: "Draft your response", estimatedMinutes: Math.round(minutes * 0.5), isRequired: true },
      { title: "Review and send", estimatedMinutes: 2, isRequired: true },
    ];
  }

  // Generic decomposition
  return [
    { title: `Open / start: ${taskText.slice(0, 40)}`, estimatedMinutes: 2, isRequired: true },
    { title: "Identify the first concrete action", estimatedMinutes: minutesPerStep, isRequired: true },
    ...Array.from({ length: stepCount - 3 }, (_, i) => ({
      title: `Work on part ${i + 2}`,
      estimatedMinutes: minutesPerStep,
      isRequired: i === 0,
    })),
    { title: "Final review and wrap up", estimatedMinutes: minutesPerStep, isRequired: true },
  ];
}
