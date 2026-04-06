// Update chat session status OR Mark's availability (admin only)
export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const password = req.headers.get('X-Admin-Password');
  const ADMIN_PASSWORD = Netlify.env.get('ADMIN_PASSWORD');

  if (!password || password !== ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const SUPABASE_URL = Netlify.env.get('SUPABASE_URL');
    const SUPABASE_KEY = Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Handle availability toggle
    if (body.action === 'set_availability') {
      await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.mark_available`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: body.available ? 'true' : 'false' }),
      });

      return new Response(JSON.stringify({ success: true, available: body.available }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle get_availability
    if (body.action === 'get_availability') {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.mark_available&select=value`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      });
      const data = await res.json();
      const available = data[0]?.value === 'true';

      return new Response(JSON.stringify({ available }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle session status updates
    const { session_id, status } = body;

    if (!session_id || !['active', 'closed', 'unavailable'].includes(status)) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let newStatus = status;
    let systemMessage = '';

    switch (status) {
      case 'active':
        systemMessage = 'Mark has joined the chat. How can I help you today?';
        break;
      case 'unavailable':
        newStatus = 'closed';
        systemMessage = "Our team is currently working with other customers. Please choose a time for a callback and we'll reach out to you directly. Click the 'Schedule a Callback' button below.";
        break;
      case 'closed':
        systemMessage = 'Thanks for chatting with us! If you need anything else, feel free to start a new conversation anytime.';
        break;
    }

    await fetch(`${SUPABASE_URL}/rest/v1/chat_sessions?id=eq.${session_id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: newStatus,
        updated_at: new Date().toISOString(),
      }),
    });

    if (systemMessage) {
      await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id,
          role: status === 'active' ? 'mark' : 'ai',
          content: systemMessage,
        }),
      });
    }

    return new Response(JSON.stringify({ success: true, status: newStatus }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Chat status error:', err);
    return new Response(JSON.stringify({ error: 'Status update failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
