// /src/ui-extensions.js

// ---------- Utility: find queue item element by id ----------
function getItemElById(id) {
  // Try common selectors used by many UIs
  let el = document.querySelector(`[data-id="${id}"]`);
  if (!el) el = document.getElementById(`item-${id}`);
  if (!el) {
    // Fallback: an element marked with data-item-id
    el = document.querySelector(`[data-item-id="${id}"]`);
  }
  return el;
}

// ---------- Collapsible: Processing Queue ----------
(function setupProcessingQueueToggle () {
  const btn = document.getElementById('processing-queue-toggle');
  const body = document.getElementById('processing-queue-body');
  if (!btn || !body) return;
  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    if (expanded) body.setAttribute('hidden', '');
    else body.removeAttribute('hidden');
  });
  // Default visible
  btn.setAttribute('aria-expanded', 'true');
  body.removeAttribute('hidden');
})();

// ---------- Duration formatting ----------
function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const msPart = Math.floor(ms % 1000).toString().padStart(3, '0');
  const base = h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    : `${m}:${String(s).padStart(2,'0')}`;
  return `${base}.${msPart}`;
}

// ---------- Resolution helpers ----------
async function getGifResolution(fileOrBlob) {
  const url = URL.createObjectURL(fileOrBlob);
  try {
    const img = new Image();
    const dims = await new Promise((resolve, reject) => {
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = reject;
      img.src = url;
    });
    return dims;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Populate a .resolution span inside a queue item element
async function populateResolutionUI(queueItemEl, file) {
  try {
    const { w, h } = await getGifResolution(file);
    const resEl = queueItemEl.querySelector('.resolution');
    if (resEl) resEl.textContent = `${w}×${h}`;
    queueItemEl.dataset.width = w;
    queueItemEl.dataset.height = h;
  } catch {
    const resEl = queueItemEl.querySelector('.resolution');
    if (resEl) resEl.textContent = '–×–';
  }
}

async function populateResolutionUIById(id, file) {
  const el = getItemElById(id);
  if (el) await populateResolutionUI(el, file);
}

// ---------- Per-file timers ----------
function markFileStart(queueItemEl) {
  queueItemEl.dataset.tStart = String(performance.now());
}

function markFileStartById(id) {
  const el = getItemElById(id);
  if (el) markFileStart(el);
}

function markFileComplete(queueItemEl, elapsedMs) {
  const statusEl = queueItemEl.querySelector('.status') || queueItemEl;
  const line = document.createElement('div');
  line.className = 'convert-time text-sm text-slate-300';
  const ms = typeof elapsedMs === 'number' ? elapsedMs : (performance.now() - Number(queueItemEl.dataset.tStart||performance.now()));
  line.textContent = `Converted in ${formatDuration(ms)}`;
  statusEl.appendChild(line);
}

function markFileCompleteById(id, elapsedMs) {
  const el = getItemElById(id);
  if (el) markFileComplete(el, elapsedMs);
}

// ---------- Batch timers ----------
const batchTiming = { start: null, pending: 0 };

function markBatchStart(totalCount) {
  batchTiming.start = performance.now();
  batchTiming.pending = Number(totalCount) || 0;
  const el = document.getElementById('batch-time');
  if (el) el.textContent = '';
}

function markBatchOneDone() {
  if (batchTiming.pending > 0) batchTiming.pending -= 1;
  if (batchTiming.pending === 0 && batchTiming.start != null) {
    const elapsed = performance.now() - batchTiming.start;
    const el = document.getElementById('batch-time');
    if (el) el.textContent = `Converted all files in ${formatDuration(elapsed)}`;
    batchTiming.start = null;
  }
}

// Expose helpers for app.js:
window.UIExt = {
  populateResolutionUI,
  populateResolutionUIById,
  markFileStart,
  markFileStartById,
  markFileComplete,
  markFileCompleteById,
  markBatchStart,
  markBatchOneDone,
};
