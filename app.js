const app = document.getElementById('app');

function esc(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function productName(id) {
  const p = PRODUCTS.find(p => p.id === id);
  return p ? p.generic + ' ' + p.strength : id;
}

function badge(kind, label) {
  return '<span class="badge badge-' + kind + '">' + esc(label) + '</span>';
}

function daysText(days) {
  if (days < 0) return Math.abs(days) + ' days ago';
  if (days === 0) return 'today';
  return 'in ' + days + ' days';
}

function renderDashboard() {
  const stocked = BATCHES.filter(b => onHand(b.id) > 0);
  const units = BATCHES.reduce((s, b) => s + onHand(b.id), 0);
  const sellable = BATCHES.filter(isAllocatable).reduce((s, b) => s + onHand(b.id), 0);
  const expired = stocked.filter(b => expiryStatus(b.expiry).kind === 'expired');
  const critical = stocked.filter(b => expiryStatus(b.expiry).kind === 'critical');
  const quarantined = stocked.filter(b => b.quality === 'quarantined');
  const attention = stocked
    .filter(b => expiryStatus(b.expiry).kind !== 'healthy' || b.quality !== 'released')
    .sort((a, b) => a.expiry.localeCompare(b.expiry));

  const stat = (n, l) => '<div class="stat"><div class="n">' + n + '</div><div class="l">' + l + '</div></div>';

  const rows = attention.map(b => {
    const st = expiryStatus(b.expiry);
    const q = b.quality !== 'released' ? badge(b.quality, b.quality) : '';
    return '<tr><td>' + esc(productName(b.productId)) + '</td><td>' + esc(b.batchNo) + '</td><td>' +
      onHand(b.id) + '</td><td>' + esc(b.expiry) + ' (' + daysText(st.days) + ')</td><td>' +
      badge(st.kind, st.label) + q + '</td></tr>';
  }).join('');

  app.innerHTML =
    '<h2>Dashboard</h2><div class="stats">' +
    stat(PRODUCTS.length, 'Products') +
    stat(units, 'Units on hand (all)') +
    stat(sellable, 'Sellable units') +
    stat(expired.length, 'Expired batches in stock') +
    stat(critical.length, 'Critical (30 days or less)') +
    stat(quarantined.length, 'Quarantined batches') +
    '</div><div class="card"><h3>Needs attention</h3>' +
    (rows
      ? '<table><thead><tr><th>Product</th><th>Batch</th><th>On hand</th><th>Expiry</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table>'
      : '<div class="empty">Nothing needs attention.</div>') +
    '</div>';
}

function renderPlaceholder(name) {
  return function () { app.innerHTML = '<h2>' + name + '</h2><div class="card empty">Coming next.</div>'; };
}
function totalOnHand(productId) {
  return BATCHES
    .filter(b => b.productId === productId)
    .reduce((s, b) => s + onHand(b.id), 0);
}

function qualityBadge(q) {
  return badge(q === 'released' ? 'healthy' : q, q);
}

// Builds the search box and table once, then only redraws the rows,
// so the box keeps focus while you type.
function searchView(title, placeholder, headers, buildRows) {
  app.innerHTML =
    '<h2>' + title + '</h2><div class="card">' +
    '<input id="q" class="search" type="search" placeholder="' + placeholder + '" aria-label="Search">' +
    '<table><thead><tr>' + headers.map(h => '<th>' + h + '</th>').join('') +
    '</tr></thead><tbody id="rows"></tbody></table>' +
    '<div id="none" class="empty" hidden>No matches.</div></div>';
  const q = document.getElementById('q');
  const rowsEl = document.getElementById('rows');
  const none = document.getElementById('none');
  function update() {
    const html = buildRows(q.value.trim().toLowerCase());
    rowsEl.innerHTML = html;
    none.hidden = html !== '';
  }
  q.addEventListener('input', update);
  update();
}

function renderProducts() {
  searchView('Products', 'Search by name, SKU or form',
    ['SKU', 'Product', 'Form', 'On hand', 'Status'],
    term => PRODUCTS
      .filter(p => (p.generic + ' ' + p.strength + ' ' + p.sku + ' ' + p.form).toLowerCase().includes(term))
      .map(p => '<tr><td>' + esc(p.sku) + '</td><td>' + esc(p.generic + ' ' + p.strength) +
        '</td><td>' + esc(p.form) + '</td><td>' + totalOnHand(p.id) + '</td><td>' +
        badge(p.status === 'active' ? 'healthy' : 'near', p.status) + '</td></tr>')
      .join(''));
}

function renderBatches() {
  searchView('Batches', 'Search by product or batch number',
    ['Product', 'Batch', 'On hand', 'Expiry', 'Expiry status', 'Quality'],
    term => BATCHES
      .filter(b => (productName(b.productId) + ' ' + b.batchNo).toLowerCase().includes(term))
      .sort((a, b) => a.expiry.localeCompare(b.expiry))
      .map(b => {
        const st = expiryStatus(b.expiry);
        return '<tr><td>' + esc(productName(b.productId)) + '</td><td>' + esc(b.batchNo) +
          '</td><td>' + onHand(b.id) + '</td><td>' + esc(b.expiry) + ' (' + daysText(st.days) +
          ')</td><td>' + badge(st.kind, st.label) + '</td><td>' + qualityBadge(b.quality) + '</td></tr>';
      })
      .join(''));
}

const VIEWS = {
  dashboard: renderDashboard,
  products: renderProducts,
  batches: renderBatches,
  receive: renderPlaceholder('Receive stock'),
  fefo: renderPlaceholder('Stock & FEFO')
};

function show(view) {
  document.querySelectorAll('#nav button').forEach(b =>
    b.classList.toggle('active', b.dataset.view === view));
  VIEWS[view]();
}

document.getElementById('nav').addEventListener('click', e => {
  if (e.target.dataset.view) show(e.target.dataset.view);
});

show('dashboard');
