// ═══════════════════════════════════════════════════
// AI RESCUE — Edge Function
// Returns a tiny next action + fallback for stuck users
// FIX #12: This function was referenced but never created
// ═══════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  try {
    const { userId, failureState, overdueQuests } = await req.json()

    // In production, call your LLM here (e.g. Anthropic, OpenAI, Grok)
    // For now, return intelligent defaults based on failure state

    let tinyAction = 'Open your quest list and pick the smallest task.'
    let fallbackAction = 'Set a 2-minute timer. Do anything productive for 2 minutes.'
    let breathingPrompt = 'Close your eyes. Breathe in for 4 counts. Hold for 4. Out for 4. Repeat 3 times.'

    switch (failureState) {
      case 'frozen':
        tinyAction = 'Just open the app. That counts. Now tap one quest — any quest.'
        fallbackAction = 'Write one sentence about what you need to do. That\'s your first micro-step.'
        break
      case 'overwhelmed':
        tinyAction = 'Pick the easiest quest you see. Ignore everything else.'
        fallbackAction = 'Brain dump for 60 seconds — write everything down, then close the list.'
        breathingPrompt = 'You\'re carrying too much. Put it all down for 30 seconds. Breathe.'
        break
      case 'exhausted':
        tinyAction = 'Do one recovery task (shower, water, stretch). That earns XP too.'
        fallbackAction = 'Rest is not failure. Close the app and come back in 30 minutes.'
        breathingPrompt = 'Your energy bar is low. This is a recovery round, not a retreat.'
        break
      case 'distracted':
        tinyAction = 'Lock your phone for 3 minutes. When you unlock, start the top quest.'
        fallbackAction = 'Move to a different room or spot. Change of scenery resets focus.'
        break
      case 'anxious':
        tinyAction = 'Name the anxiety out loud. Then pick one quest that feels safe.'
        fallbackAction = 'Write down what\'s making you anxious. Separate it from your quest list.'
        breathingPrompt = 'Anxiety is a debuff, not a defeat. Ground yourself: 5 things you see, 4 you hear, 3 you touch.'
        break
    }

    // If there are overdue quests, suggest the easiest one
    if (overdueQuests && overdueQuests.length > 0) {
      tinyAction = `Start with "${overdueQuests[0]}" — it's overdue but still salvageable.`
    }

    return new Response(
      JSON.stringify({ tinyAction, fallbackAction, breathingPrompt }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        tinyAction: 'Pick the smallest quest on your list.',
        fallbackAction: 'Set a 2-minute timer and do anything.',
        breathingPrompt: 'Breathe in for 4, hold for 4, out for 4.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
