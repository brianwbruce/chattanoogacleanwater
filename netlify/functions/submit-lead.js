// Submit a new lead to Supabase
export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { first_name, last_name, email, phone, variant } = await req.json();

    // Validate required fields
    if (!first_name || !last_name || !['A', 'B', 'C'].includes(variant)) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Variant-specific validation
    if (variant === 'A' && !email) {
      return new Response(JSON.stringify({ error: 'Email required for variant A' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (variant === 'B' && !phone) {
      return new Response(JSON.stringify({ error: 'Phone required for variant B' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (variant === 'C' && (!email || !phone)) {
      return new Response(JSON.stringify({ error: 'Email and phone required for variant C' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Netlify.env.get('SUPABASE_URL');
    const SUPABASE_KEY = Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const res = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        first_name,
        last_name,
        email: email || null,
        phone: phone || null,
        variant,
        status: 'New',
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Supabase error:', err);
      return new Response(JSON.stringify({ error: 'Failed to save lead' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Function error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
