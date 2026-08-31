// /src/ui-extensions.js
import { initLivePreviewPanel } from './modules/livePreviewPanel.js';

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
  setupCollapsible('diagnostics-toggle', 'diagnostics-body', false);
  setupCollapsible('live-preview-toggle', 'live-preview-body', true);
  initLivePreviewPanel();

  const diagToggle = document.getElementById('diag-toggle');
  const diagToggleLabel = document.getElementById('diag-toggle-label');
  const syncDiagToggleColor = () => {
    if (!diagToggleLabel || !diagToggle) return;
    diagToggleLabel.style.color = diagToggle.checked ? '#64748b' : '#475569';
  };
  diagToggle?.addEventListener('change', syncDiagToggleColor);
  syncDiagToggleColor();

  // Diag log clear / copy
  document.getElementById('diag-clear')?.addEventListener('click', () => {
    const log = document.getElementById('diag-log');
    if (!log) return;
    log.innerHTML = '<div id="diag-placeholder" style="color:#64748b;font-style:italic">Log cleared.</div>';
  });
  document.getElementById('diag-copy')?.addEventListener('click', () => {
    const log = document.getElementById('diag-log');
    if (!log) return;
    const text = Array.from(log.querySelectorAll('div:not(#diag-placeholder)'))
      .map(el => el.textContent).join('\n');
    navigator.clipboard.writeText(text).catch(() => {});
  });

  // Diagnostics log resize handle (drag to resize)
  const diagLog    = document.getElementById('diag-log');
  const diagHandle = document.getElementById('diag-resize-handle');
  if (diagLog && diagHandle) {
    const setHandleBg = (active) => {
      diagHandle.style.background = active ? '#263548' : '#1e293b';
    };
    diagHandle.addEventListener('mouseenter', () => setHandleBg(true));
    diagHandle.addEventListener('mouseleave', () => setHandleBg(false));
    diagHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const startY = e.clientY;
      const startH = diagLog.offsetHeight;
      setHandleBg(true);
      const onMove = (ev) => {
        const newH = Math.max(128, startH + (ev.clientY - startY));
        diagLog.style.height = newH + 'px';
      };
      const onUp = () => {
        setHandleBg(false);
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  // Header info icon tooltip
  const infoIcon    = document.getElementById('info-icon');
  const infoTooltip = document.getElementById('info-tooltip');
  if (infoIcon && infoTooltip) {
    infoIcon.addEventListener('mouseenter', () => { infoTooltip.style.display = 'block'; });
    infoIcon.addEventListener('mouseleave', () => { infoTooltip.style.display = 'none'; });
  }

  // Generic form field info icon tooltips (Advanced section)
  document.querySelectorAll('.form-info-icon').forEach(icon => {
    const tooltip = icon.querySelector('.form-info-tooltip');
    if (!tooltip) return;
    icon.addEventListener('mouseenter', () => { tooltip.style.display = 'block'; });
    icon.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
  });

  // Action button hover: tint border only, skip when disabled
  function addActionHover(id, hoverColor) {
    const btn = document.getElementById(id);
    if (!btn) return;
    const baseBackground = btn.style.background || '';
    btn.addEventListener('mouseenter', () => {
      if (btn.disabled) return;
      btn.style.background = 'rgba(71,85,105,0.85)';
      btn.style.borderColor = hoverColor;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = baseBackground;
      btn.style.borderColor = '#475569';
    });
  }
  addActionHover('start-button',  '#2563eb');
  addActionHover('clear-button',  '#dc2626');
  addActionHover('download-all',  '#10b981');
  addActionHover('diag-clear',  '#dc2626');
  addActionHover('diag-copy',  '#2563eb');
});

function findMetaLine(queueItemEl) {
  return queueItemEl.querySelector('[id^="meta-"]') || queueItemEl.querySelector('[id^="meta-file-"]');
}
function findInfoBoxFromMeta(metaEl) { return metaEl?.parentElement || null; }
function findStatusEl(queueItemEl) {
  return queueItemEl.querySelector('[id^="status-"]') || queueItemEl.querySelector('[id^="status-file-"]');
}
function findActionsEl(queueItemEl) {
  return queueItemEl.querySelector('[id^="actions-"]') || queueItemEl.querySelector('[id^="actions-file-"]');
}

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
function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function writeSizeLine(infoBoxEl, text, htmlSuffix = '') {
  if (!infoBoxEl) return;
  const line = Array.from(infoBoxEl.querySelectorAll('.text-slate-400.text-sm'))
    .find(el => !(el.id && el.id.startsWith('meta-file-')));
  if (!line) return;
  if (htmlSuffix) { line.innerHTML = escapeHtml(text) + htmlSuffix; }
  else { line.textContent = text; }
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
  const gifMB  = formatMB(gifBytes);
  const webpMB = formatMB(webpBytes);
  const ratio  = gifBytes > 0 ? (1 - (webpBytes / gifBytes)) * 100 : 0;
  let percHtml;
  if      (ratio >  0.05) percHtml = `&#8595; ${ratio.toFixed(1)}%`;
  else if (ratio < -0.05) percHtml = `<span style="color:#fb923c">&#8593; ${Math.abs(ratio).toFixed(1)}% larger</span>`;
  else                    percHtml = `&#8776; 0%`;
  writeSizeLine(infoBox, `${gifMB} | ${webpMB} | `, percHtml);
}

// --------- Remove control placed where Download appears ---------
function styleQueueIconButton(el) {
  el.style.width = '17.5px';
  el.style.height = '17.5px';
  el.style.borderRadius = '5px';
  el.style.display = 'inline-flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.padding = '0';
  el.style.margin = '0';
  el.style.cursor = 'pointer';
  el.style.boxSizing = 'border-box';
  el.style.verticalAlign = 'middle';
}

function removeIconSvg() {
  return '<svg width="11.25" height="11.25" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M3 3l6 6M9 3 3 9" stroke="#cbd5e1" stroke-width="1.8" stroke-linecap="round"/></svg>';
}

function renderRemoveLink(queueItemEl, id, onRemove, label) {
  const actionsEl = findActionsEl(queueItemEl);
  if (!actionsEl) return;
  const existing = queueItemEl.querySelector('.remove-link');
  if (existing) {
    existing.className = 'remove-link';
    existing.innerHTML = removeIconSvg();
    existing.title = label || 'Remove';
    existing.setAttribute('aria-label', label || 'Remove');
    styleQueueIconButton(existing);
    existing.style.background = '#1e293b';
    existing.style.border = '1px solid #475569';
    return;
  }

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'remove-link';
  btn.innerHTML = removeIconSvg();
  btn.title = label || 'Remove';
  btn.setAttribute('aria-label', label || 'Remove');
  styleQueueIconButton(btn);
  btn.style.background = '#1e293b';
  btn.style.border = '1px solid #475569';
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
    const ext = dot >= 0 ? finalName.slice(dot) : '.webp';
    return `${base}_${tsNow()}${ext}`;
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
