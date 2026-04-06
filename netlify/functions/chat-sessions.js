// List active chat sessions for admin dashboard
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

    // Get non-closed sessions
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/chat_sessions?status=neq.closed&order=updated_at.desc`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const sessions = await res.json();

    // Get latest message for each session
    const enriched = await Promise.all(
      sessions.map(async (s) => {
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
