const SKUS = [
  'CI-E','CM-E','JEZ-1',
  'LHS-1','LHS-1D','LHS-1E','LHS-2','LHS-2E',
  'LMS-1','LMS-1D','LMS-1E','LMS-2','LMS-2E',
  'LSP-1D','LSP-2',
  'MGS-1','MGS-1C','MGS-1S'
];

const SIZE_LABELS = { '1kg': '1 kg bags', '5kg': '5 kg bags', '20kg': '20 kg buckets' };

let inventory  = {};   // { SKU: { id, stock_1kg, stock_5kg, stock_20kg } }
let selectedSKU  = null;
let selectedSize = '1kg';
let deductQty    = 1;

const skuSelect   = document.getElementById('sku-select');
const sizeCard    = document.getElementById('size-card');
const stockCard   = document.getElementById('stock-card');
const deductCard  = document.getElementById('deduct-card');
const confirmBtn  = document.getElementById('confirm-btn');
const stockDisplay = document.getElementById('stock-display');
const stockUnit   = document.getElementById('stock-unit');
const qtyValue    = document.getElementById('qty-value');
const qtyMinus    = document.getElementById('qty-minus');
const qtyPlus     = document.getElementById('qty-plus');
const toast       = document.getElementById('toast');

// Populate SKU dropdown
SKUS.forEach(sku => {
  const opt = document.createElement('option');
  opt.value = sku;
  opt.textContent = sku;
  skuSelect.appendChild(opt);
});

// ── Airtable helpers ────────────────────────────────────────────────────────

function airtableURL(recordId = '') {
  const base = `https://api.airtable.com/v0/${CONFIG.BASE_ID}/${encodeURIComponent(CONFIG.TABLE_NAME)}`;
  return recordId ? `${base}/${recordId}` : base;
}

function airtableHeaders() {
  return {
    Authorization: `Bearer ${CONFIG.API_KEY}`,
    'Content-Type': 'application/json'
  };
}

async function loadInventory() {
  try {
    const res  = await fetch(airtableURL() + '?pageSize=100', { headers: airtableHeaders() });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    data.records.forEach(r => {
      inventory[r.fields.SKU] = {
        id:         r.id,
        stock_1kg:  r.fields.Stock_1kg  ?? 0,
        stock_5kg:  r.fields.Stock_5kg  ?? 0,
        stock_20kg: r.fields.Stock_20kg ?? 0
      };
    });
  } catch (err) {
    showToast('⚠ Could not load inventory — check config.js');
    console.error(err);
  }
}

async function patchStock(recordId, fieldName, newValue) {
  const res = await fetch(airtableURL(recordId), {
    method:  'PATCH',
    headers: airtableHeaders(),
    body: JSON.stringify({ fields: { [fieldName]: newValue } })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

// ── UI helpers ──────────────────────────────────────────────────────────────

function getStock() {
  if (!selectedSKU || !inventory[selectedSKU]) return null;
  return inventory[selectedSKU][`stock_${selectedSize}`] ?? 0;
}

function updateStockDisplay() {
  const stock = getStock();
  if (stock === null) return;

  stockDisplay.textContent = stock;
  stockDisplay.className   = 'stock-display';
  if (stock === 0)    stockDisplay.classList.add('empty');
  else if (stock <= 5) stockDisplay.classList.add('low');

  stockUnit.textContent = SIZE_LABELS[selectedSize];

  deductQty = 1;
  qtyValue.textContent = 1;
  syncQtyButtons(stock);
  confirmBtn.disabled = stock === 0;
}

function syncQtyButtons(stock) {
  qtyMinus.disabled = deductQty <= 1;
  qtyPlus.disabled  = deductQty >= stock;
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── Event listeners ─────────────────────────────────────────────────────────

skuSelect.addEventListener('change', () => {
  selectedSKU = skuSelect.value || null;
  const show  = !!selectedSKU;
  sizeCard.hidden   = !show;
  stockCard.hidden  = !show;
  deductCard.hidden = !show;
  confirmBtn.hidden = !show;
  if (show) updateStockDisplay();
});

document.querySelectorAll('.toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedSize = btn.dataset.size;
    updateStockDisplay();
  });
});

qtyMinus.addEventListener('click', () => {
  if (deductQty > 1) {
    deductQty--;
    qtyValue.textContent = deductQty;
    syncQtyButtons(getStock());
  }
});

qtyPlus.addEventListener('click', () => {
  const stock = getStock();
  if (deductQty < stock) {
    deductQty++;
    qtyValue.textContent = deductQty;
    syncQtyButtons(stock);
  }
});

confirmBtn.addEventListener('click', async () => {
  const stock     = getStock();
  const newStock  = Math.max(0, stock - deductQty);
  const record    = inventory[selectedSKU];
  const fieldName = `Stock_${selectedSize}`;

  confirmBtn.disabled    = true;
  confirmBtn.textContent = 'SAVING...';

  try {
    await patchStock(record.id, fieldName, newStock);
    inventory[selectedSKU][`stock_${selectedSize}`] = newStock;
    updateStockDisplay();
    showToast(`✓ ${deductQty} × ${selectedSKU} ${selectedSize} deducted`);
  } catch (err) {
    showToast('⚠ Save failed — try again');
    console.error(err);
  }

  confirmBtn.disabled    = false;
  confirmBtn.textContent = 'CONFIRM';
});

// ── Init ─────────────────────────────────────────────────────────────────────
loadInventory();
