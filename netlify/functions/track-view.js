// Track page views in Supabase (public, no auth required)
export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { page, referrer, variant } = await req.json();

    if (!page) {
      return new Response(JSON.stringify({ error: 'Page required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Netlify.env.get('SUPABASE_URL');
    const SUPABASE_KEY = Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY');

    await fetch(`${SUPABASE_URL}/rest/v1/page_views`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page,
        referrer: referrer || null,
        variant: variant || null,
      }),
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    // Don't let tracking errors cause issues
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
