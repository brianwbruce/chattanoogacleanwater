// Escalate chat to Mark — creates lead, updates session, sends Twilio SMS
export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { session_id, first_name, phone } = await req.json();

    if (!session_id || !first_name || !phone) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Netlify.env.get('SUPABASE_URL');
    const SUPABASE_KEY = Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const CALENDLY_URL = Netlify.env.get('CALENDLY_URL') || 'https://calendly.com';

    // Check if Mark is available
    const availRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.mark_available&select=value`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    });
    const availData = await availRes.json();
    const markAvailable = availData[0]?.value === 'true';

    // Create lead (variant 'B' since we have phone number)
    const leadRes = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        first_name,
        last_name: '',
        phone,
        variant: 'B',
        status: 'New',
        notes: 'Lead from chat escalation',
      }),
    });

    if (!leadRes.ok) {
      console.error('Lead creation failed:', await leadRes.text());
    }

    const leads = await leadRes.json();
    const leadId = Array.isArray(leads) && leads[0] ? leads[0].id : null;

    if (!markAvailable) {
      // Mark is away — skip waiting, go straight to callback
      await fetch(`${SUPABASE_URL}/rest/v1/chat_sessions?id=eq.${session_id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_name: first_name,
          user_phone: phone,
          lead_id: leadId,
          status: 'closed',
          updated_at: new Date().toISOString(),
        }),
      });

      await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id,
          role: 'ai',
          content: "Our team is currently working with other customers. Please choose a time for a callback and we'll reach out to you directly. Click the 'Schedule a Callback' button below.",
        }),
      });

      return new Response(JSON.stringify({ success: true, status: 'closed' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Mark is available — set to waiting and notify
    await fetch(`${SUPABASE_URL}/rest/v1/chat_sessions?id=eq.${session_id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_name: first_name,
        user_phone: phone,
        lead_id: leadId,
        status: 'waiting',
        updated_at: new Date().toISOString(),
      }),
    });

    await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id,
        role: 'ai',
        content: "I've notified our local water quality specialist. They'll join this chat shortly. Feel free to keep typing — they'll see your messages when they connect.",
      }),
    });

    // Send Twilio SMS (fire-and-forget)
    try {
      const TWILIO_SID = Netlify.env.get('TWILIO_ACCOUNT_SID');
      const TWILIO_TOKEN = Netlify.env.get('TWILIO_AUTH_TOKEN');
      const TWILIO_FROM = Netlify.env.get('TWILIO_FROM_NUMBER');
      const MARK_PHONE = Netlify.env.get('MARK_PHONE_NUMBER');

      if (TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM && MARK_PHONE) {
        const auth = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`);
        await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: MARK_PHONE,
            From: TWILIO_FROM,
            Body: `New chat request from ${first_name} (${phone}) on Chattanooga Clean Water. Log in to the admin dashboard to respond.`,
          }).toString(),
        });
      }
    } catch (smsErr) {
      console.error('Twilio SMS error:', smsErr);
    }

    return new Response(JSON.stringify({ success: true, status: 'waiting' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Escalation error:', err);
    return new Response(JSON.stringify({ error: 'Escalation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
