// /src/ui-extensions.js

// ---------- Utility: find queue item element by id ----------
function getItemElById(id) {
  let el = document.querySelector(`[data-id="${id}"]`);
  if (!el) el = document.getElementById(`item-${id}`);
  if (!el) el = document.querySelector(`[data-item-id="${id}"]`);
  return el;
}

// ---------- Collapsible: Generic helper ----------
function setupCollapsible(buttonId, bodyId, defaultExpanded=true) {
  const btn = document.getElementById(buttonId);
  const body = document.getElementById(bodyId);
  if (!btn || !body) return;
  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    if (expanded) body.setAttribute('hidden', '');
    else body.removeAttribute('hidden');
  });
  btn.setAttribute('aria-expanded', defaultExpanded ? 'true' : 'false');
  if (defaultExpanded) body.removeAttribute('hidden'); else body.setAttribute('hidden', '');
}

// ---------- Setup collapsibles for Processing Queue and Advanced ----------
document.addEventListener('DOMContentLoaded', () => {
  setupCollapsible('processing-queue-toggle', 'processing-queue-body', true);
  setupCollapsible('advanced-toggle', 'advanced-body', true);
});

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

// Ensure there is a .resolution span before .fps; create & insert if missing
function ensureResolutionSpan(queueItemEl) {
  let meta = queueItemEl.querySelector('.meta');
  if (!meta) {
    meta = document.createElement('div');
    meta.className = 'meta text-sm text-slate-300 flex gap-3';
    const thumb = queueItemEl.querySelector('.thumb');
    if (thumb && thumb.parentElement) {
      thumb.parentElement.insertBefore(meta, thumb.nextSibling);
    } else {
      queueItemEl.prepend(meta);
    }
  }
  let fps = meta.querySelector('.fps');
  let resEl = meta.querySelector('.resolution');
  if (!resEl) {
    resEl = document.createElement('span');
    resEl.className = 'resolution';
    resEl.textContent = '–×–';
    if (fps && fps.parentElement === meta) {
      meta.insertBefore(resEl, fps);
    } else {
      meta.insertBefore(resEl, meta.firstChild);
    }
  } else if (fps && resEl.compareDocumentPosition && (resEl.compareDocumentPosition(fps) & Node.DOCUMENT_POSITION_FOLLOWING) === 0) {
    meta.insertBefore(resEl, fps);
  }
  return resEl;
}

async function populateResolutionUI(queueItemEl, file) {
  const resEl = ensureResolutionSpan(queueItemEl);
  try {
    const { w, h } = await getGifResolution(file);
    if (resEl) resEl.textContent = `${w}×${h}`;
    queueItemEl.dataset.width = w;
    queueItemEl.dataset.height = h;
  } catch {
    if (resEl) resEl.textContent = '–×–';
  }
}

async function populateResolutionUIById(id, file) {
  const el = getItemElById(id);
  if (el) await populateResolutionUI(el, file);
}

// ---------- Per-file timers (NO-OP) ----------
function markFileStart(queueItemEl) { /* no-op */ }
function markFileStartById(id) { /* no-op */ }
function markFileComplete(queueItemEl, elapsedMs) { /* no-op */ }
function markFileCompleteById(id, elapsedMs) { /* no-op */ }

// ---------- Batch timers ----------
const batchTiming = { start: null, pending: 0 };

function formatMinutesSeconds(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `Converted in ${minutes} minutes ${seconds} seconds`;
}

function markBatchStart(totalCount) {
  batchTiming.start = performance.now();
  batchTiming.pending = Number(totalCount) || 0;
  const el = document.getElementById('batch-time');
  if (el) {
    el.textContent = '';
    el.classList.add('text-center');
  }
}

function markBatchOneDone() {
  if (batchTiming.pending > 0) batchTiming.pending -= 1;
  if (batchTiming.pending === 0 && batchTiming.start != null) {
    const elapsed = performance.now() - batchTiming.start;
    const el = document.getElementById('batch-time');
    if (el) el.textContent = formatMinutesSeconds(elapsed);
    batchTiming.start = null;
  }
}

// Expose helpers
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
