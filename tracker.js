// Lightweight page view tracker — sends to Supabase via Netlify function
// Fire-and-forget, non-blocking

(function() {
  // Get variant cookie if it exists
  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  try {
    fetch('/.netlify/functions/track-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page: window.location.pathname,
        referrer: document.referrer || null,
        variant: getCookie('ccw_variant') || null,
      }),
    });
  } catch (_) {
    // Silently fail — tracking should never break the site
  }
})();
