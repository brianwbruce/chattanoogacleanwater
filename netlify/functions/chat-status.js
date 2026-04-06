// Update chat session status (admin only)
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
    const { session_id, status } = await req.json();

    if (!session_id || !['active', 'closed', 'unavailable'].includes(status)) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Netlify.env.get('SUPABASE_URL');
    const SUPABASE_KEY = Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Determine the new status and system message
    let newStatus = status;
    let systemMessage = '';

    switch (status) {
      case 'active':
        systemMessage = 'Mark has joined the chat. How can I help you today?';
        break;
      case 'unavailable':
        newStatus = 'closed';
        systemMessage = "Mark is currently with another customer. You can schedule a callback at a time that works for you. Click the 'Schedule a Callback' button below.";
        break;
      case 'closed':
        systemMessage = 'Thanks for chatting with us! If you need anything else, feel free to start a new conversation anytime.';
        break;
    }

    // Update session status
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

    // Insert system message
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
