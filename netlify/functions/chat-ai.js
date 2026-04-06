// AI Chatbot — answers water quality questions via Claude API
const SYSTEM_PROMPT = `You are a friendly, helpful water quality assistant for Chattanooga Clean Water (chattanoogacleanwater.com). You help Chattanooga, Tennessee homeowners understand their tap water quality.

RULES:
- Keep responses to 2-3 sentences. Be conversational and concise.
- Never use markdown formatting (no **, ##, bullet points). Just plain text.
- Never make medical or health claims. Use phrases like "many homeowners find" or "studies suggest."
- When users seem interested in solutions, guide them toward getting a free consultation by saying something like "Want to find out exactly what's in your water? You can request a free consultation right on our site."
- If a user wants to talk to a real person, tell them to click the "Talk to a real person" link below the chat input.
- Politely decline off-topic questions. Say something like "I'm best at answering questions about water quality in the Chattanooga area. Is there anything about your water I can help with?"
- Never mention any specific company, brand, or product by name.
- You serve the Chattanooga, TN and Hamilton County area.

KNOWLEDGE BASE — Chattanooga Water Quality Facts:

SOURCE: Chattanooga's drinking water comes from the Tennessee River, treated at the Citico Water Treatment Plant operated by Tennessee American Water. It serves approximately 190,000 people.

TREATMENT: The water goes through coagulation, sedimentation, filtration, and chlorine disinfection before distribution.

CONTAMINANTS DETECTED (EWG data, 2014-2024):
The following contaminants have been detected in Chattanooga's water. All are within EPA legal limits but many exceed stricter EWG health guidelines:
- Total Trihalomethanes (TTHMs): 42.8 ppb detected (EPA limit: 80 ppb, EWG guideline: 0.15 ppb — exceeds health guideline by 285x). These are disinfection byproducts formed when chlorine reacts with organic matter.
- Haloacetic Acids (HAA5): 21.7 ppb detected (EPA limit: 60 ppb, EWG guideline: 0.1 ppb — exceeds by 217x). Another group of disinfection byproducts.
- Haloacetic Acids (HAA9): 27.5 ppb detected. A broader measurement of haloacetic acids.
- Chloroform: 31.8 ppb detected (EWG guideline: 0.4 ppb — exceeds by 80x). A specific trihalomethane.
- Bromodichloromethane: 6.34 ppb detected (EWG guideline: 0.06 ppb — exceeds by 106x).
- Dibromochloromethane: 1.04 ppb detected (EWG guideline: 0.1 ppb — exceeds by 10x).
- Chromium (hexavalent): 0.0838 ppb detected (EWG guideline: 0.02 ppb — exceeds by 4.2x).
- Nitrate: 0.357 ppm detected (EPA limit: 10 ppm, EWG guideline: 0.14 ppm — exceeds by 2.5x).
- Radium (combined): 0.61 pCi/L detected (EPA limit: 5 pCi/L, EWG guideline: 0.05 pCi/L — exceeds by 12x).
- Total contaminants detected: 18. Of those, 9 exceed EWG health guidelines.

OTHER DETECTED (within guidelines): 1,4-Dioxane, Aluminum, Chlorate, Fluoride (0.697 ppm), Manganese, PFBS, PFBA, Strontium, Vanadium.

COMPLIANCE: As of the latest EPA assessment (April-June 2024), Chattanooga's water is in compliance with federal drinking water standards. However, legal limits haven't been updated in almost 20 years and don't reflect the latest health research.

HARD WATER: Chattanooga's water is moderately hard to hard (approximately 7-10+ grains per gallon) due to the limestone geology of the Tennessee Valley. This causes scale buildup on fixtures, appliances, and pipes, and can leave skin and hair feeling dry.

INFRASTRUCTURE: Water travels from the treatment plant through miles of distribution pipes, many of which are decades old. Lead and copper can leach from aging pipes and household plumbing. Older Chattanooga homes are at higher risk.

SOLUTIONS: Whole-home water treatment systems can address these issues. Options include water softeners (for hard water), carbon filtration (for chlorine and taste), reverse osmosis (for comprehensive contaminant removal), and multi-stage systems that combine approaches. Systems range from about $2,500 for basic filtration to $25,000 for premium whole-home purification, with financing often available.

The first step is always a professional in-home water test to see exactly what's in the water at a specific address.`;

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { session_id, message } = await req.json();

    if (!message || message.length > 2000) {
      return new Response(JSON.stringify({ error: 'Invalid message' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Netlify.env.get('SUPABASE_URL');
    const SUPABASE_KEY = Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const ANTHROPIC_API_KEY = Netlify.env.get('ANTHROPIC_API_KEY');

    let currentSessionId = session_id;

    // Create session if none exists
    if (!currentSessionId) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/chat_sessions`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({ status: 'ai' }),
      });
      const sessions = await res.json();
      currentSessionId = sessions[0].id;
    }

    // Check session status
    const sessionRes = await fetch(
      `${SUPABASE_URL}/rest/v1/chat_sessions?id=eq.${currentSessionId}&select=status`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    const sessionData = await sessionRes.json();

    if (!sessionData.length) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const sessionStatus = sessionData[0].status;

    // Store user message
    await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: currentSessionId,
        role: 'user',
        content: message,
      }),
    });

    // If session is waiting or active, don't call AI
    if (sessionStatus === 'waiting') {
      return new Response(JSON.stringify({
        session_id: currentSessionId,
        reply: "Mark has been notified and will join shortly. Feel free to keep typing — he'll see your messages when he connects.",
        status: sessionStatus,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (sessionStatus === 'active') {
      return new Response(JSON.stringify({
        session_id: currentSessionId,
        reply: null,
        status: sessionStatus,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch conversation history (last 20 messages)
    const histRes = await fetch(
      `${SUPABASE_URL}/rest/v1/chat_messages?session_id=eq.${currentSessionId}&order=created_at.asc&limit=20`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    const history = await histRes.json();

    // Check message cap
    if (history.length > 50) {
      const capReply = "We've had a great conversation! For more detailed answers, I'd recommend requesting a free consultation on our site. A local specialist can answer all your questions in person.";
      await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: currentSessionId,
          role: 'ai',
          content: capReply,
        }),
      });
      return new Response(JSON.stringify({
        session_id: currentSessionId,
        reply: capReply,
        status: 'ai',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Build Claude messages
    const claudeMessages = history
      .filter(m => m.role === 'user' || m.role === 'ai')
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }));

    // Call Claude API
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: claudeMessages,
      }),
    });

    if (!aiRes.ok) {
      const err = await aiRes.text();
      console.error('Claude API error:', err);
      throw new Error('AI response failed');
    }

    const aiData = await aiRes.json();
    const reply = aiData.content[0].text;

    // Store AI response
    await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: currentSessionId,
        role: 'ai',
        content: reply,
      }),
    });

    return new Response(JSON.stringify({
      session_id: currentSessionId,
      reply,
      status: 'ai',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Chat AI error:', err);
    return new Response(JSON.stringify({
      error: 'Something went wrong. Please try again.',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
