// Poll for new chat messages since a given timestamp
export default async (req) => {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('session_id');
    const since = url.searchParams.get('since') || '1970-01-01T00:00:00Z';

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'session_id required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Netlify.env.get('SUPABASE_URL');
    const SUPABASE_KEY = Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Fetch session status and new messages in parallel
    const [sessionRes, msgRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/chat_sessions?id=eq.${sessionId}&select=status`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      }),
      fetch(`${SUPABASE_URL}/rest/v1/chat_messages?session_id=eq.${sessionId}&created_at=gt.${since}&order=created_at.asc`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      }),
    ]);

    const sessions = await sessionRes.json();
    const messages = await msgRes.json();

    return new Response(JSON.stringify({
      status: sessions[0]?.status || 'closed',
      messages,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Chat poll error:', err);
    return new Response(JSON.stringify({ error: 'Poll failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
