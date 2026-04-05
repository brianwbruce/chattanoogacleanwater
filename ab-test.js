// A/B Test Variant Assignment
// Variant A: First Name + Last Name + Email
// Variant B: First Name + Last Name + Phone
// Variant C: First Name + Last Name + Email + Phone

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

function assignVariant() {
  let variant = getCookie('ccw_variant');

  if (!variant || !['A', 'B', 'C'].includes(variant)) {
    const rand = Math.random();
    variant = rand < 0.333 ? 'A' : rand < 0.666 ? 'B' : 'C';
    setCookie('ccw_variant', variant, 30);
  }

  return variant;
}

function applyVariant(variant) {
  const emailGroup = document.getElementById('email-group');
  const phoneGroup = document.getElementById('phone-group');
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('phone');
  const variantField = document.getElementById('variant-field');

  if (!emailGroup || !phoneGroup || !variantField) return;

  variantField.value = variant;

  switch (variant) {
    case 'A': // Email only
      emailGroup.classList.remove('hidden');
      phoneGroup.classList.add('hidden');
      emailInput.required = true;
      phoneInput.required = false;
      phoneInput.value = '';
      break;

    case 'B': // Phone only
      emailGroup.classList.add('hidden');
      phoneGroup.classList.remove('hidden');
      emailInput.required = false;
      phoneInput.required = true;
      emailInput.value = '';
      break;

    case 'C': // Both
      emailGroup.classList.remove('hidden');
      phoneGroup.classList.remove('hidden');
      emailInput.required = true;
      phoneInput.required = true;
      break;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const variant = assignVariant();
  applyVariant(variant);
});
