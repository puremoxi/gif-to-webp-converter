// /src/ui-extensions.js

// Center headers & setup collapsibles
function setupCollapsible(buttonId, bodyId, defaultExpanded) {
  const btn = document.getElementById(buttonId);
  const body = document.getElementById(bodyId);
  if (!btn || !body) return;
  try { btn.classList.add('w-full', 'text-center', 'justify-center'); } catch {}
  const setExpanded = (on) => {
    btn.setAttribute('aria-expanded', on ? 'true' : 'false');
    if (on) body.removeAttribute('hidden'); else body.setAttribute('hidden', '');
  };
  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    setExpanded(!expanded);
  });
  setExpanded(!!defaultExpanded);
}

document.addEventListener('DOMContentLoaded', () => {
  setupCollapsible('processing-queue-toggle', 'processing-queue-body', true);
  setupCollapsible('advanced-toggle', 'advanced-body', false);
});

function findMetaLine(queueItemEl) { return queueItemEl.querySelector('[id^="meta-file-"]'); }
function findInfoBoxFromMeta(metaEl) { return metaEl?.parentElement || null; }
function findStatusEl(queueItemEl) { return queueItemEl.querySelector('[id^="status-file-"]'); }
function findActionsEl(queueItemEl) { return queueItemEl.querySelector('[id^="actions-file-"]'); }

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

function injectResolutionIntoMeta(metaEl, w, h) {
  if (!metaEl) return;
  const original = (metaEl.textContent || '').trim();
  const resText = `${w}×${h}`;
  const hasResFront = /^\d+\s*×\s*\d+/.test(original);
  const rest = hasResFront ? original.replace(/^\d+\s*×\s*\d+\s*•\s*/, '') : original;
  metaEl.textContent = `${resText} • ${rest}`;
}

function formatMB(bytes) {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`.replace(/\.00 MB$/, ' MB');
}
function writeSizeLine(infoBoxEl, text) {
  if (!infoBoxEl) return;
  const line = Array.from(infoBoxEl.querySelectorAll('.text-slate-400.text-sm'))
    .find(el => !(el.id && el.id.startsWith('meta-file-')));
  if (line) line.textContent = text;
}

async function populateResolutionUI(queueItemEl, file) {
  try {
    const metaEl = findMetaLine(queueItemEl);
    if (!metaEl) return;
    const { w, h } = await getGifResolution(file);
    injectResolutionIntoMeta(metaEl, w, h);
    queueItemEl.dataset.width = w;
    queueItemEl.dataset.height = h;
  } catch {}
}

async function populateFileSizeUI(queueItemEl, file) {
  const metaEl = findMetaLine(queueItemEl);
  const infoBox = findInfoBoxFromMeta(metaEl);
  if (infoBox) writeSizeLine(infoBox, formatMB(file?.size ?? 0));
}

function writeSizeSummaryByEls(queueItemEl, gifBytes, webpBytes) {
  const metaEl = findMetaLine(queueItemEl);
  const infoBox = findInfoBoxFromMeta(metaEl);
  if (!infoBox) return;
  const gifMB = formatMB(gifBytes);
  const webpMB = formatMB(webpBytes);
  const reduction = gifBytes > 0 ? Math.max(0, (1 - (webpBytes / gifBytes)) * 100) : 0;
  const perc = `${reduction.toFixed(1)}% reduction`.replace(/^0\.0% reduction$/, '0% reduction');
  writeSizeLine(infoBox, `${gifMB} | ${webpMB} | ${perc}`);
}

// --------- Remove control placed where Download appears ---------
function renderRemoveLink(queueItemEl, id, onRemove, label) {
  const actionsEl = findActionsEl(queueItemEl);
  if (!actionsEl || queueItemEl.querySelector('.remove-link')) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  // Exact match of Download style per request
  btn.className = 'remove-link text-blue-400 font-semibold hover:underline mr-3';
  btn.textContent = label || 'Remove';
  btn.addEventListener('click', () => {
    queueItemEl.style.display = 'none';
    try { onRemove && onRemove(id); } catch {}
  });

  actionsEl.appendChild(btn);
}

function hideAllRemoveLinks() {
  document.querySelectorAll('.remove-link').forEach(el => {
    el.style.display = 'none';
  });
}

// ---- Per-file Download filename: append _MMDDYYYY_HHMM ----
function tsNow() {
  const d = new Date();
  const pad = (n)=> String(n).padStart(2,'0');
  const MM = pad(d.getMonth()+1);
  const DD = pad(d.getDate());
  const YYYY = d.getFullYear();
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${MM}${DD}${YYYY}_${hh}${mm}`; // no seconds
}

function updatePerFileDownloadName(queueItemEl, finalName) {
  const actionsEl = findActionsEl(queueItemEl);
  if (!actionsEl) return;

  const targetName = (() => {
    const dot = (finalName || '').lastIndexOf('.');
    const base = dot >= 0 ? finalName.slice(0, dot) : (finalName || 'converted');
    return `${base}_${tsNow()}.webp`;
  })();

  // Anchor might be injected slightly after conversion; poll briefly
  let tries = 0;
  const poll = setInterval(() => {
    const a = actionsEl.querySelector('a[download]');
    if (a) {
      a.setAttribute('download', targetName);
      clearInterval(poll);
    } else if (++tries > 40) { // ~2s @ 50ms
      clearInterval(poll);
    }
  }, 50);
}


// Aggregate timers (Processing Queue)
const batchTiming = { start: null, pending: 0 };
function markBatchStart(totalCount) {
  batchTiming.start = performance.now();
  batchTiming.pending = Number(totalCount) || 0;
  const ag = document.getElementById('aggregate-time');
  if (ag) ag.textContent='';
}
function markBatchOneDone() {
  if (batchTiming.pending > 0) batchTiming.pending -= 1;
  if (batchTiming.pending === 0 && batchTiming.start != null) {
    const elapsed = performance.now() - batchTiming.start;
    const totalSeconds = Math.max(0, Math.floor(elapsed/1000));
    const minutes = Math.floor(totalSeconds/60);
    const seconds = totalSeconds%60;
    const minuteLabel = minutes === 1 ? 'minute' : 'minutes';

    const ag = document.getElementById('aggregate-time');
    if (ag) ag.textContent = `Files converted in ${minutes} ${minuteLabel} ${seconds} seconds`;

    batchTiming.start = null;
  }
}

window.UIExt = {
  populateResolutionUI,
  populateFileSizeUI,
  writeSizeSummaryByEls,
  renderRemoveLink,
  hideAllRemoveLinks,
  markBatchStart,
  markBatchOneDone,
  updatePerFileDownloadName,
};
