(() => {
  'use strict';
  const trigger = document.querySelector('[data-anniversary-open]');
  if (!trigger) return;

  const dialog = document.createElement('dialog');
  dialog.id = 'anniversary-thanks';
  dialog.className = 'ns-anniversary-dialog';
  dialog.setAttribute('aria-labelledby', 'anniversary-title');
  dialog.setAttribute('aria-describedby', 'anniversary-message');
  dialog.innerHTML = `
    <div class="ns-anniversary-content">
      <button class="ns-anniversary-close" type="button" aria-label="Close anniversary message" data-anniversary-close autofocus>&times;</button>
      <img src="/images/norwood-55-years.webp" alt="Celebrating 55 years, 1971–2026" width="156" height="156">
      <h2 id="anniversary-title">55 years. Thanks to you.</h2>
      <div id="anniversary-message">
        <p>Since 1971, Norwood Supply has been proud to serve Jacksonville homeowners, builders, and neighbors.</p>
        <p>As we celebrate 55 years, we’re grateful for every customer, every referral, and every visit through our doors. Your trust and support have made this milestone possible.</p>
        <p>Thank you for making us part of your homes, your projects, and this community. We look forward to serving you for years to come.</p>
      </div>
      <p class="ns-anniversary-signature">With gratitude,<br><strong>The Norwood Supply family</strong></p>
      <button class="ns-anniversary-done" type="button" data-anniversary-close>Continue browsing</button>
    </div>`;
  document.body.append(dialog);

  trigger.addEventListener('click', () => { if (!dialog.open) dialog.showModal(); });
  dialog.querySelectorAll('[data-anniversary-close]').forEach(button => {
    button.addEventListener('click', () => dialog.close());
  });
  // Close only on a full click outside the card, never while selecting its text.
  let pointerStartedOutside = false;
  const outsideCard = event => {
    const rect = dialog.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  };
  dialog.addEventListener('pointerdown', event => { pointerStartedOutside = event.target === dialog && outsideCard(event); });
  dialog.addEventListener('click', event => {
    if (pointerStartedOutside && event.target === dialog && outsideCard(event)) dialog.close();
    pointerStartedOutside = false;
  });
  dialog.addEventListener('close', () => trigger.focus({ preventScroll: true }));
})();
