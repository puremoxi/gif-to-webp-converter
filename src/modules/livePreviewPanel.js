// Before/after slider UI for the Live Preview panel + estimated size label.
// Pure DOM rendering — all encode/debounce/cancellation logic lives in previewController.js.

let dragging = false;
let clipPercent = 50;
let currentAfterUrl = null;
let currentBeforeUrl = null;

function els() {
  return {
    empty: document.getElementById('live-preview-empty'),
    stage: document.getElementById('live-preview-stage'),
    before: document.getElementById('live-preview-before'),
    afterWrap: document.getElementById('live-preview-after-wrap'),
    after: document.getElementById('live-preview-after'),
    handle: document.getElementById('live-preview-handle'),
    status: document.getElementById('live-preview-status'),
    sizeLabel: document.getElementById('live-preview-size-label'),
    defaultNotice: document.getElementById('live-preview-default-notice'),
  };
}

function applyClip(percent) {
  clipPercent = Math.max(0, Math.min(100, percent));
  const { afterWrap, handle } = els();
  // Crop the compressed layer away from the left so Original (before) shows left of the
  // handle and Preview (after) shows right of it — matches the fixed corner labels.
  if (afterWrap) afterWrap.style.clipPath = `inset(0 0 0 ${clipPercent}%)`;
  if (handle) handle.style.left = `${clipPercent}%`;
}

function revoke(url) {
  if (url) { try { URL.revokeObjectURL(url); } catch {} }
}

export function initLivePreviewPanel() {
  const { stage, handle } = els();
  if (!stage || !handle) return;
  applyClip(50);

  function percentFromClientX(clientX) {
    const rect = stage.getBoundingClientRect();
    if (!rect.width) return clipPercent;
    return Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
  }
  function onPointerMove(e) {
    if (!dragging) return;
    applyClip(percentFromClientX(e.clientX));
  }
  function onPointerUp(e) {
    if (!dragging) return;
    dragging = false;
    try { handle.releasePointerCapture(e.pointerId); } catch {}
  }
  handle.addEventListener('pointerdown', (e) => {
    dragging = true;
    try { handle.setPointerCapture(e.pointerId); } catch {}
    applyClip(percentFromClientX(e.clientX));
    e.preventDefault();
  });
  handle.addEventListener('pointermove', onPointerMove);
  handle.addEventListener('pointerup', onPointerUp);
  handle.addEventListener('pointercancel', onPointerUp);
  // Clicking anywhere else on the stage jumps the divider there.
  stage.addEventListener('pointerdown', (e) => {
    if (e.target === handle || handle.contains(e.target)) return;
    applyClip(percentFromClientX(e.clientX));
  });
}

export function renderPreviewState(state) {
  const { empty, stage, before, after, status, sizeLabel, defaultNotice } = els();
  if (!empty || !stage) return;

  if (!state || state.status === 'empty') {
    empty.hidden = false; empty.style.display = 'block';
    stage.hidden = true; stage.style.display = 'none';
    return;
  }

  empty.hidden = true; empty.style.display = 'none';
  stage.hidden = false; stage.style.display = 'block';
  if (defaultNotice) defaultNotice.style.display = state.isDefault ? 'block' : 'none';

  if (state.subjectFile && before && before.dataset.subjectId !== String(state.subjectId)) {
    revoke(currentBeforeUrl);
    currentBeforeUrl = URL.createObjectURL(state.subjectFile);
    before.src = currentBeforeUrl;
    before.dataset.subjectId = String(state.subjectId);
  }

  if (state.status === 'loading') {
    if (status) { status.textContent = 'Encoding preview…'; status.style.display = 'block'; }
    return;
  }

  if (state.status === 'error') {
    if (status) { status.textContent = `Preview unavailable: ${state.error || 'encode failed'}`; status.style.display = 'block'; }
    if (sizeLabel) sizeLabel.innerHTML = '';
    return;
  }

  if (state.status === 'ready' && state.result?.blob) {
    if (status) status.style.display = 'none';
    revoke(currentAfterUrl);
    currentAfterUrl = URL.createObjectURL(state.result.blob);
    if (after) after.src = currentAfterUrl;
    if (sizeLabel) {
      const kb = (state.result.blob.size / 1024).toFixed(1);
      const origBytes = state.originalSize || 0;
      let pctText = '';
      if (origBytes > 0) {
        const change = (1 - state.result.blob.size / origBytes) * 100;
        pctText = change >= 0
          ? `(\u2193 ${change.toFixed(0)}% from original)`
          : `(\u2191 ${Math.abs(change).toFixed(0)}% from original)`;
      }
      sizeLabel.innerHTML = `
        <div>Estimate: ${kb} KB${pctText ? ` <span style="font-size:11px;color:#64748b;">${pctText}</span>` : ''}</div>
        <div style="font-size:11px;color:#64748b;margin-top:2px;">(actual output may vary slightly)</div>
      `;
    }
  }
}
