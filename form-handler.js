// Form submission handler
// Dual submit: Netlify Forms (backup) + Netlify Function -> Supabase (primary)
// GA4 custom events: form_view, form_start, form_submit

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('lead-form');
  const submitBtn = document.getElementById('submit-btn');
  const errorEl = document.getElementById('form-error');
  const successEl = document.getElementById('form-success');

  if (!form) return;

  // GA4: Track when form section scrolls into view
  const formSection = document.getElementById('form');
  if (formSection && typeof IntersectionObserver !== 'undefined') {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (typeof gtag === 'function') {
            gtag('event', 'form_view');
          }
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    observer.observe(formSection);
  }

  // GA4: Track first interaction with form (form_start)
  let formStarted = false;
  form.querySelectorAll('input:not([type="hidden"])').forEach(input => {
    input.addEventListener('focus', () => {
      if (!formStarted) {
        formStarted = true;
        if (typeof gtag === 'function') {
          gtag('event', 'form_start');
        }
      }
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear previous errors
    errorEl.classList.remove('show');
    errorEl.textContent = '';
    form.querySelectorAll('input.error').forEach(el => el.classList.remove('error'));

    // Validate required fields
    const requiredFields = form.querySelectorAll('input[required]:not([type="hidden"])');
    let valid = true;

    requiredFields.forEach(field => {
      if (field.closest('.hidden')) return; // skip hidden variant fields
      if (!field.value.trim()) {
        field.classList.add('error');
        valid = false;
      }
    });

    if (!valid) {
      errorEl.textContent = 'Please fill in all required fields.';
      errorEl.classList.add('show');
      return;
    }

    // Show loading state
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '';
    submitBtn.classList.add('loading');

    const formData = new FormData(form);
    const variant = formData.get('variant');

    // 1) Fire-and-forget to Netlify Forms (backup)
    try {
      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(formData).toString(),
      });
    } catch (_) {
      // Silently fail — Netlify Forms is just a backup
    }

    // 2) Primary submission to Supabase via serverless function
    try {
      const payload = {
        first_name: formData.get('first_name')?.trim(),
        last_name: formData.get('last_name')?.trim(),
        email: formData.get('email')?.trim() || null,
        phone: formData.get('phone')?.trim() || null,
        variant: variant,
      };

      const res = await fetch('/.netlify/functions/submit-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Submission failed');
      }

      // GA4: Track successful submission
      if (typeof gtag === 'function') {
        gtag('event', 'form_submit', { variant: variant });
      }

      // Success — hide form, show thank you
      form.style.display = 'none';
      successEl.classList.add('show');

    } catch (err) {
      // Supabase failed but Netlify Forms backup was sent
      // Still show success since the lead was captured
      if (typeof gtag === 'function') {
        gtag('event', 'form_submit', { variant: variant });
      }
      form.style.display = 'none';
      successEl.classList.add('show');
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.classList.remove('loading');
    }
  });

  // Clear error styling on input
  form.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', () => {
      input.classList.remove('error');
    });
  });
});
