// List chat sessions for admin dashboard
// Returns: active/waiting sessions + recently closed (last 24h)
export default async (req) => {
  const password = req.headers.get('X-Admin-Password');
  const ADMIN_PASSWORD = Netlify.env.get('ADMIN_PASSWORD');

  if (!password || password !== ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const SUPABASE_URL = Netlify.env.get('SUPABASE_URL');
    const SUPABASE_KEY = Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const since24h = new Date(Date.now() - 86400000).toISOString();

    // Get waiting + active, recently closed, and AI-only sessions (last 24h)
    const [activeRes, recentRes, aiRes] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/chat_sessions?status=in.(waiting,active)&order=updated_at.desc`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
          },
        }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/chat_sessions?status=eq.closed&updated_at=gte.${since24h}&order=updated_at.desc&limit=20`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
          },
        }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/chat_sessions?status=eq.ai&updated_at=gte.${since24h}&order=updated_at.desc&limit=20`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
          },
        }
      ),
    ]);

    const activeSessions = await activeRes.json();
    const recentSessions = await recentRes.json();
    const aiSessions = await aiRes.json();

    const allSessions = [...activeSessions, ...recentSessions, ...aiSessions];

    // Get latest message for each session
    const enriched = await Promise.all(
      allSessions.map(async (s) => {
        const msgRes = await fetch(
          `${SUPABASE_URL}/rest/v1/chat_messages?session_id=eq.${s.id}&order=created_at.desc&limit=1`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
            },
          }
        );
        const msgs = await msgRes.json();
        return {
          ...s,
          last_message: msgs[0]?.content || '',
          last_role: msgs[0]?.role || '',
        };
      })
    );

    return new Response(JSON.stringify(enriched), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Chat sessions error:', err);
    return new Response(JSON.stringify({ error: 'Failed to fetch sessions' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
