// Get analytics data from Supabase (password-protected)
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

    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get('days') || '30', 10);
    const since = new Date(Date.now() - days * 86400000).toISOString();

    // Fetch page views and leads in parallel
    const [pvRes, leadsRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/page_views?created_at=gte.${since}&order=created_at.asc`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      }),
      fetch(`${SUPABASE_URL}/rest/v1/leads?created_at=gte.${since}&order=created_at.asc`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      }),
    ]);

    if (!pvRes.ok || !leadsRes.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch analytics' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const pageViews = await pvRes.json();
    const leads = await leadsRes.json();

    // Aggregate page views by day
    const viewsByDay = {};
    const viewsByPage = {};
    const viewsByVariant = { A: 0, B: 0, C: 0 };

    pageViews.forEach(pv => {
      const day = pv.created_at.slice(0, 10);
      viewsByDay[day] = (viewsByDay[day] || 0) + 1;

      viewsByPage[pv.page] = (viewsByPage[pv.page] || 0) + 1;

      if (pv.variant && viewsByVariant.hasOwnProperty(pv.variant)) {
        viewsByVariant[pv.variant]++;
      }
    });

    // Aggregate leads by day
    const leadsByDay = {};
    const leadsByVariant = { A: 0, B: 0, C: 0 };

    leads.forEach(l => {
      const day = l.created_at.slice(0, 10);
      leadsByDay[day] = (leadsByDay[day] || 0) + 1;

      if (l.variant && leadsByVariant.hasOwnProperty(l.variant)) {
        leadsByVariant[l.variant]++;
      }
    });

    // Sort top pages
    const topPages = Object.entries(viewsByPage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([page, count]) => ({ page, count }));

    return new Response(JSON.stringify({
      totalViews: pageViews.length,
      totalLeads: leads.length,
      viewsByDay,
      leadsByDay,
      topPages,
      viewsByVariant,
      leadsByVariant,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Analytics error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
