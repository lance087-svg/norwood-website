(function () {
  'use strict';
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return;
  const endpoint = document.currentScript.dataset.endpoint;
  const $ = id => document.getElementById(id);
  const panel = $('contact-dialog'), form = $('catalog-inquiry-form');
  const send = $('inquiry-send'), close = $('contact-close');
  let product = null, requestId = null, busy = false;
  document.querySelectorAll('.catalog-text').forEach(link => { link.textContent = 'Request info about this door →'; });
  function resetStatus() { $('inquiry-error').hidden = true; $('inquiry-success').hidden = true; }
  function showError(text) { $('inquiry-error').textContent = text; $('inquiry-error').hidden = false; }
  close.addEventListener('click', () => { if (!busy) panel.close(); });
  panel.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="tel:"],a[href^="sms:"]');
    if (!link || !panel.showModal) return;
    event.preventDefault();
    resetStatus();
    const sms = link.getAttribute('href').startsWith('sms:');
    $('contact-number').hidden = sms;
    form.hidden = !sms;
    $('contact-title').textContent = sms ? 'Request info about this door' : 'Contact Norwood Supply';
    if (sms) {
      const card = link.closest('.catalog-card');
      const next = card ? { name: card.querySelector('h3').textContent.trim(), url: 'https://www.norwoodsupply.com/catalog.html#' + card.id } : { name: 'Help choosing a door', url: 'https://www.norwoodsupply.com/catalog.html' };
      if (!product || product.url !== next.url) { requestId = null; $('inquiry-message').value = 'Is this door available?'; }
      product = next;
      $('inquiry-product').value = product.name + '\n' + product.url;
    }
    panel.showModal();
  });
  form.addEventListener('input', () => { if (!busy) requestId = null; });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    resetStatus();
    const name = $('inquiry-name').value.trim(), contact = $('inquiry-contact').value.trim();
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
    const digits = contact.replace(/\D/g, '');
    const validPhone = /^[+\d().\s-]+$/.test(contact) && (digits.length === 10 || (digits.length === 11 && digits.startsWith('1')));
    if (!name || (!validEmail && !validPhone)) { showError('Please enter your name and a valid phone number or email so we can reply.'); return; }
    if (!endpoint || !/^https:\/\//.test(endpoint)) { showError('Online inquiries are temporarily unavailable. Please call (904) 768-6818. Your details have not been sent.'); return; }
    if (!product) { showError('Please select a door and try again.'); return; }
    requestId = requestId || crypto.randomUUID();
    const payload = { action: 'catalog_inquiry', requestId, name, contact, product, message: $('inquiry-message').value.trim(), website: $('inquiry-website').value };
    busy = true; send.disabled = true; close.disabled = true; send.textContent = 'Sending…';
    // Lock inputs to keep retries and the receipt tied to the exact submitted request.
    const fields = Array.from(form.querySelectorAll('input,textarea'));
    fields.forEach(field => { field.disabled = true; });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal });
      const receipt = await response.json();
      if (!response.ok || receipt.received !== true || receipt.requestId !== requestId) throw new Error('Unconfirmed submission');
      form.hidden = true;
      $('inquiry-success').textContent = 'Your inquiry has been received. Norwood will contact you at ' + contact + '. Reference: ' + requestId;
      $('inquiry-success').hidden = false;
    } catch (_) {
      showError('We could not confirm receipt. Your details are still here. Please try again or call (904) 768-6818.');
    } finally {
      clearTimeout(timer); busy = false; send.disabled = false; close.disabled = false;
      fields.forEach(field => { field.disabled = false; });
      send.textContent = 'Send Inquiry';
    }
  });
})();
