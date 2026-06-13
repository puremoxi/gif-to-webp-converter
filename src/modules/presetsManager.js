export const DEFAULT_PRESET = {
  name: 'Default',
  outputFolderMode: 'source',
  outputFormat: 'webp',
  quality: 90,
  compressionLevel: 6,
  loop: true,
  keepAlpha: false,
  fastMode: false,
  lossless: false,
  mixed: false,
  maxWidthEnabled: true,
  resizeWidth: 1200,
  noChangeDimensions: false,
  maxHeightEnabled: false,
  maxHeight: 1080,
  targetSizeEnabled: false,
  targetSizeKB: 200,
  maxFps: 24,
  maxDurationSec: 3600,
};

async function apiError(res, fallback) {
  let detail = `HTTP ${res.status}`;
  try { const body = await res.json(); if (body?.error) detail = body.error; } catch {}
  return new Error(`${fallback}: ${detail}`);
}

export async function listPresets() {
  const res = await fetch('/api/presets');
  if (!res.ok) throw await apiError(res, 'Failed to load presets');
  return res.json();
}

export async function savePreset(name, settings) {
  const res = await fetch('/api/presets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, settings }),
  });
  if (!res.ok) throw await apiError(res, 'Failed to save preset');
  return res.json();
}

export async function deletePreset(name) {
  const res = await fetch(`/api/presets/${encodeURIComponent(name)}`, { method: 'DELETE' });
  if (!res.ok) throw await apiError(res, 'Failed to delete preset');
  return res.json();
}

function setSlider(sliderId, valueId, value) {
  const slider = document.getElementById(sliderId);
  const valueEl = document.getElementById(valueId);
  if (slider) slider.value = String(value);
  if (valueEl) valueEl.value = String(value);
}

function setSelect(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = String(value);
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function setCheckbox(id, checked, triggerChange = false) {
  const el = document.getElementById(id);
  if (!el) return;
  el.checked = Boolean(checked);
  if (triggerChange) el.dispatchEvent(new Event('change', { bubbles: true }));
}

export function applyPreset(settings) {
  // Format first — its change event locks/unlocks lossless, mixed, loop for AVIF
  setSelect('output-folder-mode', settings.outputFolderMode ?? 'source');
  setSelect('output-format', settings.outputFormat ?? 'webp');

  setSlider('quality', 'quality-value', settings.quality ?? 90);
  setSlider('compression-level', 'compression-level-value', settings.compressionLevel ?? 6);
  setSlider('anim-max-fps', 'anim-max-fps-value', settings.maxFps ?? 24);
  setSlider('anim-max-duration', 'anim-max-duration-value', settings.maxDurationSec ?? 3600);

  // Checkboxes that trigger UI visibility sync
  setCheckbox('lossless-toggle', settings.lossless ?? false, true);
  setCheckbox('mixed-toggle', settings.mixed ?? false, true);
  setCheckbox('loop-toggle', settings.loop ?? true);
  setCheckbox('keep-alpha-toggle', settings.keepAlpha ?? false);
  setCheckbox('fast-mode-toggle',  settings.fastMode  ?? false);

  // Dimensions — ncd must change before dependent toggles
  setCheckbox('no-change-dimensions-toggle', settings.noChangeDimensions ?? false, true);
  setCheckbox('max-width-toggle', settings.maxWidthEnabled ?? true, true);
  setCheckbox('max-height-toggle', settings.maxHeightEnabled ?? false, true);
  setCheckbox('target-size-toggle', settings.targetSizeEnabled ?? false, true);

  setSlider('resize-width', 'resize-width-value', settings.resizeWidth ?? 1200);
  setSlider('resize-height', 'resize-height-value', settings.maxHeight ?? 1080);
  setSlider('target-size-kb', 'target-size-value', settings.targetSizeKB ?? 200);
}
