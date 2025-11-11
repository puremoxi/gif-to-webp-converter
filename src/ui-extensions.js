// /src/ui-extensions.js

function setupCollapsible(buttonId, bodyId, defaultExpanded) {
  const btn = document.getElementById(buttonId);
  const body = document.getElementById(bodyId);
  if (!btn || !body) return;
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

// Aggregate timers (only Processing Queue display now)
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
  markBatchStart,
  markBatchOneDone,
};
