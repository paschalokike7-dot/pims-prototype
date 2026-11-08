// PIMS demo data. Dates are relative to today so the demo never goes stale.
function daysFromToday(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const PRODUCTS = [
  { id: 'P1', sku: 'PARA-500', generic: 'Paracetamol', strength: '500 mg', form: 'Tablet', status: 'active' },
  { id: 'P2', sku: 'AMOX-500', generic: 'Amoxicillin', strength: '500 mg', form: 'Capsule', status: 'active' },
  { id: 'P3', sku: 'ORS-SAC', generic: 'Oral Rehydration Salts', strength: '20.5 g', form: 'Sachet', status: 'active' },
  { id: 'P4', sku: 'IBU-400', generic: 'Ibuprofen', strength: '400 mg', form: 'Tablet', status: 'active' }
];

const BATCHES = [
  { id: 'B1', productId: 'P1', batchNo: 'PC2401', expiry: daysFromToday(-15), quality: 'released' },
  { id: 'B2', productId: 'P1', batchNo: 'PC2506', expiry: daysFromToday(20), quality: 'released' },
  { id: 'B3', productId: 'P1', batchNo: 'PC2602', expiry: daysFromToday(300), quality: 'released' },
  { id: 'B4', productId: 'P2', batchNo: 'AM2511', expiry: daysFromToday(75), quality: 'released' },
  { id: 'B5', productId: 'P2', batchNo: 'AM2603', expiry: daysFromToday(400), quality: 'quarantined' },
  { id: 'B6', productId: 'P3', batchNo: 'OR2509', expiry: daysFromToday(200), quality: 'released' },
  { id: 'B7', productId: 'P4', batchNo: 'IB2512', expiry: daysFromToday(45), quality: 'released' }
];

// Ledger: the only place quantities live. Quantities are always positive;
// the movement type decides the direction (spec section 9.4).
const DIRECTION = { receipt: 1, issue: -1, return: 1, writeoff: -1 };

const MOVEMENTS = [
  { id: 'M1', type: 'receipt', batchId: 'B1', qty: 40,  reason: 'Opening balance', actor: 'demo', at: daysFromToday(-60) },
  { id: 'M2', type: 'receipt', batchId: 'B2', qty: 120, reason: 'Opening balance', actor: 'demo', at: daysFromToday(-40) },
  { id: 'M3', type: 'receipt', batchId: 'B3', qty: 200, reason: 'Opening balance', actor: 'demo', at: daysFromToday(-10) },
  { id: 'M4', type: 'issue',   batchId: 'B2', qty: 30,  reason: 'Sale',            actor: 'demo', at: daysFromToday(-5) },
  { id: 'M5', type: 'receipt', batchId: 'B4', qty: 80,  reason: 'Opening balance', actor: 'demo', at: daysFromToday(-30) },
  { id: 'M6', type: 'receipt', batchId: 'B5', qty: 60,  reason: 'Opening balance', actor: 'demo', at: daysFromToday(-3) },
  { id: 'M7', type: 'receipt', batchId: 'B6', qty: 150, reason: 'Opening balance', actor: 'demo', at: daysFromToday(-20) },
  { id: 'M8', type: 'receipt', batchId: 'B7', qty: 25,  reason: 'Opening balance', actor: 'demo', at: daysFromToday(-15) },
  { id: 'M9', type: 'issue',   batchId: 'B7', qty: 5,   reason: 'Sale',            actor: 'demo', at: daysFromToday(-2) }
];
