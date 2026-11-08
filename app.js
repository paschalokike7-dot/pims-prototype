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

function renderReceive(message) {
  const options = '<option value="">Choose product</option>' + PRODUCTS.map(p =>
    '<option value="' + p.id + '">' + esc(p.generic + ' ' + p.strength) + '</option>').join('');

  const recent = MOVEMENTS.slice(-8).reverse().map(m => {
    const b = BATCHES.find(b => b.id === m.batchId);
    return '<tr><td>' + esc(m.at) + '</td><td>' + esc(m.type) + '</td><td>' +
      esc(productName(b.productId)) + '</td><td>' + esc(b.batchNo) + '</td><td>' +
      (DIRECTION[m.type] > 0 ? '+' : '-') + m.qty + '</td><td>' + esc(m.reason) +
      '</td><td>' + esc(m.actor) + '</td></tr>';
  }).join('');

  app.innerHTML =
    '<h2>Receive stock</h2>' + (message || '') + '<div id="msg"></div>' +
    '<div class="card"><form id="rf" class="form" novalidate>' +
    '<label>Product<select name="product">' + options + '</select></label>' +
    '<label>Batch number<input name="batchNo" type="text"></label>' +
    '<label>Expiry date<input name="expiry" type="date"></label>' +
    '<label>Quantity received<input name="qty" type="number" min="1" step="1"></label>' +
    '<label>Supplier / PO reference<input name="reference" type="text"></label>' +
    '<label>Inspection outcome<select name="quality">' +
    '<option value="released">Accepted (released)</option>' +
    '<option value="quarantined">Hold for review (quarantined)</option></select></label>' +
    '<button type="submit" class="primary">Post receipt</button></form></div>' +
    '<div class="card" style="margin-top:1rem"><h3>Recent ledger movements</h3>' +
    '<table><thead><tr><th>Date</th><th>Type</th><th>Product</th><th>Batch</th><th>Qty</th><th>Reason</th><th>By</th></tr></thead><tbody>' +
    recent + '</tbody></table></div>';

  document.getElementById('rf').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    try {
      const b = receiveStock({
        productId: f.product.value,
        batchNo: f.batchNo.value,
        expiry: f.expiry.value,
        qty: Number(f.qty.value),
        reference: f.reference.value,
        quality: f.quality.value
      });
      renderReceive('<div class="msg msg-ok" role="status">Received ' + Number(f.qty.value) +
        ' units into batch ' + esc(b.batchNo) + '. Ledger updated.</div>');
    } catch (err) {
      document.getElementById('msg').innerHTML =
        '<div class="msg msg-err" role="alert">' + esc(err.message) + '</div>';
    }
  });
}

function errBox(text) {
  return '<div class="msg msg-err" role="alert">' + esc(text) + '</div>';
}

function renderFefo(message) {
  const options = '<option value="">Choose product</option>' + PRODUCTS.map(p =>
    '<option value="' + p.id + '">' + esc(p.generic + ' ' + p.strength) + '</option>').join('');

  const stockRows = BATCHES.slice()
    .sort((a, b) => a.productId.localeCompare(b.productId) || a.expiry.localeCompare(b.expiry))
    .map(b => {
      const st = expiryStatus(b.expiry);
      return '<tr><td>' + esc(productName(b.productId)) + '</td><td>' + esc(b.batchNo) + '</td><td>' +
        onHand(b.id) + '</td><td>' + esc(b.expiry) + '</td><td>' + badge(st.kind, st.label) +
        qualityBadge(b.quality) + '</td><td>' + (isAllocatable(b) ? 'Yes' : 'No') + '</td></tr>';
    }).join('');

  app.innerHTML =
    '<h2>Stock &amp; FEFO</h2>' + (message || '') + '<div id="msg"></div>' +
    '<div class="card"><form id="ff" class="form" novalidate>' +
    '<label>Product<select name="product">' + options + '</select></label>' +
    '<label>Quantity needed<input name="qty" type="number" min="1" step="1"></label>' +
    '<label>Order / customer reference<input name="reference" type="text"></label>' +
    '<button type="submit" class="primary">Suggest FEFO allocation</button></form>' +
    '<div id="result"></div></div>' +
    '<div class="card" style="margin-top:1rem"><h3>Stock by batch</h3>' +
    '<table><thead><tr><th>Product</th><th>Batch</th><th>On hand</th><th>Expiry</th><th>Status</th><th>Can be allocated</th></tr></thead><tbody>' +
    stockRows + '</tbody></table></div>';

  document.getElementById('ff').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    const msg = document.getElementById('msg');
    const result = document.getElementById('result');
    result.innerHTML = '';
    msg.innerHTML = '';
    const qty = Number(f.qty.value);
    const ref = f.reference.value.trim();
    if (!f.product.value) { msg.innerHTML = errBox('Choose a product.'); return; }
    if (!Number.isInteger(qty) || qty <= 0) { msg.innerHTML = errBox('Quantity must be a positive whole number.'); return; }
    if (!ref) { msg.innerHTML = errBox('Enter an order or customer reference.'); return; }

    const r = fefoAllocate(f.product.value, qty);
    let html = '';
    if (r.picks.length) {
      html += '<h3>Suggested allocation</h3><table><thead><tr><th>Batch</th><th>Expiry</th><th>Take</th></tr></thead><tbody>' +
        r.picks.map(p => '<tr><td>' + esc(p.batch.batchNo) + '</td><td>' + esc(p.batch.expiry) +
          '</td><td>' + p.qty + '</td></tr>').join('') + '</tbody></table>';
    }
    if (r.shortfall > 0) {
      html += '<div class="msg msg-warn" role="alert">Not enough eligible stock. Short by ' + r.shortfall +
        ' units. Expired, quarantined and blocked batches are excluded.</div>';
    } else {
      html += '<p><button id="confirm" class="primary">Confirm dispatch</button></p>';
    }
    result.innerHTML = html;

    const btn = document.getElementById('confirm');
    if (btn) {
      btn.addEventListener('click', () => {
        try {
          r.picks.forEach(p => postMovement({ type: 'issue', batchId: p.batch.id, qty: p.qty, reason: 'Dispatch: ' + ref }));
          renderFefo('<div class="msg msg-ok" role="status">Dispatched ' + qty + ' units. Ledger updated.</div>');
        } catch (err) {
          msg.innerHTML = errBox(err.message);
        }
      });
    }
  });
}

const VIEWS = {
  dashboard: renderDashboard,
  products: renderProducts,
  batches: renderBatches,
  receive: renderReceive,
  fefo: renderFefo
};
function show(view) {
  document.querySelectorAll('#nav button').forEach(b =>
    b.classList.toggle('active', b.dataset.view === view));
  VIEWS[view]();
}

document.getElementById('nav').addEventListener('click', e => {
  if (e.target.dataset.view) show(e.target.dataset.view);
});

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function loadFromDatabase() {
  const [p, b, m] = await Promise.all([
    db.from('products').select('*').order('sku'),
    db.from('batches').select('*'),
    db.from('inventory_movements').select('*').order('occurred_at')
  ]);
  for (const r of [p, b, m]) if (r.error) throw r.error;
  PRODUCTS.length = 0; BATCHES.length = 0; MOVEMENTS.length = 0;
  p.data.forEach(r => PRODUCTS.push({
    id: r.id, sku: r.sku, generic: r.generic_name,
    strength: r.strength || '', form: r.dosage_form || '', status: r.status }));
  b.data.forEach(r => BATCHES.push({
    id: r.id, productId: r.product_id, batchNo: r.batch_number,
    expiry: r.expiry_date, quality: r.quality_status }));
  m.data.forEach(r => MOVEMENTS.push({
    id: r.id, type: r.movement_type, batchId: r.batch_id, qty: r.quantity,
    reason: r.reason, actor: r.actor_id.slice(0, 8), at: r.occurred_at.slice(0, 10) }));
}

function renderLogin(message) {
  document.getElementById('nav').hidden = true;
  document.getElementById('logout').hidden = true;
  app.innerHTML =
    '<div class="card login"><h2>Sign in</h2>' + (message || '') +
    '<form id="lf" class="form" novalidate>' +
    '<label>Email<input name="email" type="email" autocomplete="username"></label>' +
    '<label>Password<input name="password" type="password" autocomplete="current-password"></label>' +
    '<button type="submit" class="primary">Sign in</button></form></div>';
  document.getElementById('lf').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const { error } = await db.auth.signInWithPassword({
      email: f.email.value.trim(), password: f.password.value });
    if (error) renderLogin(errBox('Sign-in failed: ' + error.message));
    else boot();
  });
}

async function boot() {
  const { data } = await db.auth.getSession();
  if (!data.session) { renderLogin(); return; }
  app.innerHTML = '<div class="card empty">Loading...</div>';
  try {
    await loadFromDatabase();
  } catch (err) {
    app.innerHTML = errBox('Could not load data: ' + err.message);
    return;
  }
  document.getElementById('nav').hidden = false;
  document.getElementById('logout').hidden = false;
  show('dashboard');
}

document.getElementById('logout').addEventListener('click', async () => {
  await db.auth.signOut();
  renderLogin();
});

boot();
