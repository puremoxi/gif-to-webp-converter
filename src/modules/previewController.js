// Orchestrates live-preview encodes: debounces settings changes, cancels stale
// in-flight requests via a monotonic requestId, and tracks the active preview subject.
// When no queue item is selected, falls back to a bundled default still so users can
// immediately see the before/after slider working against the current settings.
import { encodePreview, initPreviewEngines } from './previewClient.js';
import { log } from './logger.js';

const DEBOUNCE_MS = 250;
const DEFAULT_IMAGE_URL = '/images/live-preview-default.png';
const DEFAULT_SUBJECT_ID = '__default__';

let getSettingsFn = null;
let onStateChange = null;

let subjectFile = null; // real queued file selected by the user; null when none
let subjectId = null;

let defaultFile = null; // fetched once; used as the subject when subjectFile is null
let defaultFileLoadPromise = null;

let requestId = 0;
let debounceTimer = null;

function effectiveFile() { return subjectFile || defaultFile; }
function effectiveId() { return subjectFile ? subjectId : (defaultFile ? DEFAULT_SUBJECT_ID : null); }
function isDefaultActive() { return !subjectFile && !!defaultFile; }

function emit(status, extra = {}) {
  onStateChange?.({
    status,
    subjectId: effectiveId(),
    subjectFile: effectiveFile(),
    isDefault: isDefaultActive(),
    ...extra,
  });
}

async function loadDefaultImage() {
  if (defaultFileLoadPromise) return defaultFileLoadPromise;
  defaultFileLoadPromise = fetch(DEFAULT_IMAGE_URL)
    .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.blob(); })
    .then((blob) => { defaultFile = new File([blob], 'live-preview-default.png', { type: blob.type || 'image/png' }); return defaultFile; })
    .catch((err) => {
      log(`Live preview default image failed to load: ${err?.message || err}`, 'warn');
      defaultFile = null;
      throw err;
    });
  return defaultFileLoadPromise;
}

export function initPreviewController({ getSettings, onUpdate }) {
  getSettingsFn = getSettings;
  onStateChange = onUpdate;
  initPreviewEngines().catch(() => {});
  emit('empty');
  loadDefaultImage().then(() => schedule(0)).catch(() => {});
}

// Real subject only — null means "no queue item selected" (default image may still be showing).
export function getPreviewSubjectId() {
  return subjectId;
}

function invalidateInFlight() {
  requestId++;
}

export function setPreviewSubject(file, id) {
  subjectFile = file;
  subjectId = id;
  invalidateInFlight();
  schedule(0);
}

// No-op if the removed item isn't the current subject — avoids clobbering an
// unrelated in-flight preview when other queue items are removed. Falls back to
// the default image automatically once the real subject is cleared.
export function clearPreviewSubjectIfMatches(id) {
  if (id !== subjectId) return false;
  subjectFile = null;
  subjectId = null;
  invalidateInFlight();
  schedule(0);
  return true;
}

export function requestPreviewUpdate() {
  schedule(DEBOUNCE_MS);
}

function schedule(delay) {
  if (!effectiveFile()) { emit('empty'); return; }
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runPreview, delay);
}

async function runPreview() {
  const file = effectiveFile();
  if (!file) { emit('empty'); return; }
  const myRequestId = ++requestId;
  emit('loading');
  try {
    const settings = getSettingsFn ? getSettingsFn() : {};
    const result = await encodePreview(file, settings);
    if (myRequestId !== requestId) return; // superseded — discard stale result
    emit('ready', { result, originalSize: file.size });
  } catch (err) {
    if (myRequestId !== requestId) return;
    log(`Live preview encode failed: ${err?.message || err}`, 'warn');
    emit('error', { error: err?.message || String(err) });
  }
}
