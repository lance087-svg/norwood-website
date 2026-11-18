const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
const catalog = read('catalog.html');
const home = read('index.html');
const schemas = html => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
const products = schemas(catalog)[0].itemListElement;
const card = id => catalog.match(new RegExp('<article id="' + id + '"[\\s\\S]*?<\\/article>'))[0];

test('featured prices and construction agree with catalog structured data', () => {
  for (const [id, price] of [['door-19', '135'], ['door-14', '215'], ['door-12', '229']]) {
    const product = products.find(p => p['@id'].endsWith('#' + id));
    assert.equal(product.offers.price, price);
    assert(card(id).includes('<div class="catalog-price">$' + price + '</div>'));
    for (const html of [home, catalog]) {
      const feature = html.match(/<section class="door-values"[\s\S]*?<\/section>/)[0];
      assert(feature.includes('#' + id));
      assert(feature.includes('$' + price));
    }
  }
  for (const id of ['door-14', 'door-15', 'door-18', 'door-19', 'door-20']) {
    const product = products.find(p => p['@id'].endsWith('#' + id));
    assert.match(product.description, /solid wood frame/i);
    assert.match(product.description, /MDF panels/);
    assert(card(id).includes(product.description));
  }
  assert(!catalog.includes('$239'));
  assert(!catalog.includes('all wood primed'));
  assert.match(card('door-12'), /Fiberglass/);
});

test('FAQ gives accurate materials, matching schema and a construction-details link', () => {
  const faq = schemas(home).find(s => s['@type'] === 'FAQPage');
  const answer = faq.mainEntity.find(q => q.name === 'Are your interior wood doors solid?').acceptedAnswer.text;
  assert.match(answer, /solid wood frame \(stiles and rails\) with MDF panels/);
  assert(home.includes(answer));
  assert(home.includes('href="catalog.html#shaker-construction"'));
  assert(catalog.includes('id="shaker-construction"'));
  assert(catalog.includes('medium-density fiberboard'));
  assert(catalog.includes('not made entirely of solid wood'));
});

test('featured links resolve and calls remain separate from texts', () => {
  for (const html of [home, catalog]) {
    for (const m of html.matchAll(/href="(?:catalog\.html)?#(door-\d+|shaker-construction)"/g)) {
      assert(catalog.includes('id="' + m[1] + '"'));
    }
    for (const m of html.matchAll(/href="(tel|sms):([^"?]+)[^"]*"/g)) {
      const number = m[2].replace(/\D/g, '');
      assert.equal(number, m[1] === 'tel' ? '9047686818' : '9044035261');
    }
    assert(!html.includes('9042386383'));
    assert(html.includes('door-values.css?v=20261118'));
  }
  assert(read('door-values.css').includes('@media (max-width: 760px)'));
});
