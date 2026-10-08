(() => {
  const grid = document.querySelector('.catalog-grid');
  const original = [...grid.children];
  const dialog = document.getElementById('photo-dialog');
  original.forEach(card => {
    const img = card.querySelector('.catalog-image img');
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'photo-open';
    button.setAttribute('aria-label', 'Enlarge photo: ' + card.querySelector('h3').textContent);
    img.before(button); button.append(img);
    button.addEventListener('click', () => {
      document.getElementById('photo-title').textContent = card.querySelector('h3').textContent;
      const full = document.getElementById('photo-full'); full.src = img.src; full.alt = img.alt;
      document.getElementById('photo-details').textContent = card.querySelector('.catalog-price').textContent + '\n' + card.querySelector('.catalog-body p').textContent;
      dialog.showModal();
    });
  });
  document.getElementById('photo-close').onclick = () => dialog.close();
  document.getElementById('catalog-sort').onchange = event => {
    const ordered = original.slice();
    const price = c => Number(c.querySelector('.catalog-price').textContent.replace(/[^0-9.]/g, '')) || Infinity;
    if (event.target.value === 'low') ordered.sort((a,b) => price(a)-price(b));
    if (event.target.value === 'high') ordered.sort((a,b) => price(a) === Infinity ? 1 : price(b) === Infinity ? -1 : price(b)-price(a));
    if (event.target.value === 'name') ordered.sort((a,b) => a.querySelector('h3').textContent.localeCompare(b.querySelector('h3').textContent));
    ordered.forEach(card => grid.append(card));
  };
})();
