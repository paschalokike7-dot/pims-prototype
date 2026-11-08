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

const VIEWS = {
  dashboard: renderDashboard,
  products: renderPlaceholder('Products'),
  batches: renderPlaceholder('Batches'),
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
