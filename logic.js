const THRESHOLDS = { critical: 30, near: 90 }; // days

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  return Math.round((d - today) / 86400000);
}

function expiryStatus(dateStr) {
  const days = daysUntil(dateStr);
  if (days < 0) return { kind: 'expired', label: 'Expired', days };
  if (days <= THRESHOLDS.critical) return { kind: 'critical', label: 'Critical', days };
  if (days <= THRESHOLDS.near) return { kind: 'near', label: 'Near expiry', days };
  return { kind: 'healthy', label: 'Healthy', days };
}

// Quantity is never stored: it is always calculated from the ledger.
function onHand(batchId) {
  return MOVEMENTS
    .filter(m => m.batchId === batchId)
    .reduce((sum, m) => sum + DIRECTION[m.type] * m.qty, 0);
}

function isAllocatable(batch) {
  return batch.quality === 'released' && daysUntil(batch.expiry) >= 0 && onHand(batch.id) > 0;
}

// FEFO: earliest expiry first, ties broken by batch id.
function fefoAllocate(productId, qtyNeeded) {
  const eligible = BATCHES
    .filter(b => b.productId === productId && isAllocatable(b))
    .sort((a, b) => a.expiry.localeCompare(b.expiry) || a.id.localeCompare(b.id));
  const picks = [];
  let remaining = qtyNeeded;
  for (const b of eligible) {
    if (remaining <= 0) break;
    const take = Math.min(onHand(b.id), remaining);
    picks.push({ batch: b, qty: take });
    remaining -= take;
  }
  return { picks, shortfall: remaining };
}

function postMovement({ type, batchId, qty, reason }) {
  if (!DIRECTION[type]) throw new Error('Unknown movement type');
  if (!Number.isInteger(qty) || qty <= 0) throw new Error('Quantity must be a positive whole number');
  if (!reason || !reason.trim()) throw new Error('A reason is required');
  if (DIRECTION[type] < 0 && qty > onHand(batchId)) {
    throw new Error('Not enough stock. Negative stock is not allowed.');
  }
  MOVEMENTS.push({
    id: 'M' + (MOVEMENTS.length + 1),
    type, batchId, qty,
    reason: reason.trim(),
    actor: 'demo',
    at: new Date().toISOString().slice(0, 10)
  });
}
