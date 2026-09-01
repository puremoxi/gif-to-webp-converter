import { setupUI, setPlaceholderThumbnail, setItemThumbnail, setItemMeta } from './modules/ui.js';
import { initFFmpeg, convertToWebP, decodeToPng } from './modules/ffmpegClient.js';
import { convertToAvif, hasAvifEngineFiles, initAvifEngine } from './modules/avifClient.js';
import { log, logAlways } from './modules/logger.js';
import { createConversionQueue } from './modules/queueManager.js';
import { getMediaInfo } from './modules/mediaInfo.js';
import { rasterizeSvg } from './modules/svgRasterizer.js';
import { isHeicFile, decodeHeicToBlob, hasHeicEngineFiles } from './modules/heicClient.js';
import { listPresets, savePreset, deletePreset, applyPreset, DEFAULT_PRESET } from './modules/presetsManager.js';
import { initPreviewController, setPreviewSubject, clearPreviewSubjectIfMatches, getPreviewSubjectId, requestPreviewUpdate } from './modules/previewController.js';
import { renderPreviewState } from './modules/livePreviewPanel.js';

const dropzone=document.getElementById('dropzone'); const fileInput=document.getElementById('fileInput');
const startBtn=document.getElementById('start-button'); const clearBtn=document.getElementById('clear-button'); const zipBtn=document.getElementById('download-all'); const status=document.getElementById('converter-status');
let webpFfmpeg=null, ffmpegReady=false, queued=0; const converted=new Map();
const enabledActionTextColor = '#94a3b8';
const disabledActionTextColor = '#64748b';
const WEBP_CORE_BASE = '/vendor/ffmpeg';
const AVIF_ENGINE_BASE = '/vendor/jsquash-avif';

const removedIds = new Set();
const fileToId = new WeakMap();
const queuedDurations = new Map(); // id → duration in seconds
const queuedWidths    = new Map(); // id → source width in pixels
const stillFiles = new Map(); // id → File, insertion-ordered; only still (non-animated) queue items

function highlightPreviewSelection(id) {
  document.querySelectorAll('.queue-card-preview-selected').forEach(el => el.classList.remove('queue-card-preview-selected'));
  const el = id != null ? document.getElementById(`item-${id}`) : null;
  if (el) el.classList.add('queue-card-preview-selected');
}

function selectNextPreviewSubject() {
  const next = stillFiles.entries().next().value;
  if (next) { setPreviewSubject(next[1], next[0]); highlightPreviewSelection(next[0]); }
  else { highlightPreviewSelection(null); }
}

function syncMaxDurationField() {
  const slider = document.getElementById('anim-max-duration');
  const input  = document.getElementById('anim-max-duration-value');
  if (!slider || !input) return;
  const val = queuedDurations.size > 0
    ? Math.ceil(Math.max(...queuedDurations.values()))
    : 3600;
  slider.value = String(val);
  input.value  = String(val);
}

function syncMaxWidthField() {
  const slider = document.getElementById('resize-width');
  const input  = document.getElementById('resize-width-value');
  if (!slider || !input) return;
  const val = queuedWidths.size > 0
    ? Math.max(...queuedWidths.values())
    : 1200;
  slider.value = String(val);
  input.value  = String(val);
}
let outputDirectoryHandle = null;
let avifEngineAvailable = false;
let avifLoadingPromise = null;

function formatTimestamp(d=new Date()) {
  const pad = (n)=> String(n).padStart(2,'0');
  const MM = pad(d.getMonth()+1);
  const DD = pad(d.getDate());
  const YYYY = d.getFullYear();
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${MM}${DD}${YYYY}_${hh}${mm}${ss}`;
}

function getOutputExtension(name) {
  const match = String(name || '').match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : 'webp';
}

async function saveConvertedBlob(blob, filename, settings) {
  if (settings.outputFolderMode === 'select' && outputDirectoryHandle) {
    const fileHandle = await outputDirectoryHandle.getFileHandle(filename, { create: true });
    const stream = await fileHandle.createWritable();
    await stream.write(blob);
    await stream.close();
    return { method: 'folder', filename };
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return { method: 'downloads', filename };
}

async function waitForItemEl(id, timeout=1500) {
  const start = performance.now();
  const sels = [
    `[data-id="${id}"]`, `#item-${id}`, `#queue-item-${id}`, `#result-${id}`,
    `[data-item-id="${id}"]`, `[data-key="${id}"]`, `#meta-${id}`
  ];
  while (performance.now() - start < timeout) {
    for (const s of sels) { const el = document.querySelector(s); if (el) return el; }
    await new Promise(r => setTimeout(r, 50));
  }
  return null;
}

function removeFromQueue(id){
  removedIds.add(id);
  queue.remove(id);
  converted.delete(id);
  queuedDurations.delete(id);
  syncMaxDurationField();
  queuedWidths.delete(id);
  syncMaxWidthField();
  stillFiles.delete(id);
  if (clearPreviewSubjectIfMatches(id)) selectNextPreviewSubject();
  const el = document.getElementById(`item-${id}`);
  if (el) el.remove();
  queued = Math.max(0, queued - 1);
  updateControls();
}

status.textContent='Ready. Please add files.';

setupUI(dropzone,fileInput);

initPreviewController({ getSettings, onUpdate: renderPreviewState });
document.getElementById('advanced-body')?.addEventListener('input', requestPreviewUpdate);
document.getElementById('advanced-body')?.addEventListener('change', requestPreviewUpdate);

async function initPresets() {
  const select = document.getElementById('preset-select');
  const saveBtn = document.getElementById('preset-save');
  const deleteBtn = document.getElementById('preset-delete');
  const resetBtn = document.getElementById('preset-reset');
  if (!select || !saveBtn || !deleteBtn || !resetBtn) return;

  let presets = [];

  function syncDeleteBtn() {
    const isDefault = select.value === '__default__';
    deleteBtn.disabled = isDefault;
    deleteBtn.style.color = isDefault ? '#64748b' : '#94a3b8';
  }

  async function refreshPresets(activeName) {
    try { presets = await listPresets(); } catch { presets = []; }
    select.innerHTML = '<option value="__default__">Default</option>';
    for (const p of presets) {
      const opt = document.createElement('option');
      opt.value = p.name;
      opt.textContent = p.name;
      select.appendChild(opt);
    }
    if (activeName) select.value = activeName;
    syncDeleteBtn();
  }

  select.addEventListener('change', () => {
    if (select.value === '__default__') {
      applyPreset(DEFAULT_PRESET);
    } else {
      const p = presets.find(p => p.name === select.value);
      if (p) applyPreset(p);
    }
    syncDeleteBtn();
  });

  saveBtn.addEventListener('click', async () => {
    const currentName = select.value === '__default__' ? '' : select.value;
    const name = window.prompt('Save preset as:', currentName || 'My Preset');
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    if (trimmed.toLowerCase() === 'default') { alert('Cannot overwrite the Default preset.'); return; }
    try {
      logAlways(`Saving preset: "${trimmed}"`, 'info');
      await savePreset(trimmed, getSettings());
      logAlways(`Preset saved: "${trimmed}"`, 'ok');
      await refreshPresets(trimmed);
    } catch (e) {
      const msg = e?.message || String(e);
      logAlways(`Preset save failed: ${msg}`, 'error');
      alert('Failed to save preset: ' + msg);
    }
  });

  deleteBtn.addEventListener('click', async () => {
    const name = select.value;
    if (name === '__default__') return;
    if (!confirm(`Delete preset "${name}"?`)) return;
    try {
      logAlways(`Deleting preset: "${name}"`, 'info');
      await deletePreset(name);
      logAlways(`Preset deleted: "${name}"`, 'ok');
      await refreshPresets('__default__');
      applyPreset(DEFAULT_PRESET);
    } catch (e) {
      const msg = e?.message || String(e);
      logAlways(`Preset delete failed: ${msg}`, 'error');
      alert('Failed to delete preset: ' + msg);
    }
  });

  resetBtn.addEventListener('click', () => {
    select.value = '__default__';
    syncDeleteBtn();
    applyPreset(DEFAULT_PRESET);
  });

  await refreshPresets();
}

initPresets().catch(() => {});
function syncOutputFormatAvailability() {
  const select = document.getElementById('output-format');
  const avifOption = select?.querySelector('option[value="avif"]');
  if (!select || !avifOption) return;
  avifOption.disabled = !avifEngineAvailable;
  avifOption.textContent = avifEngineAvailable ? 'AVIF' : 'AVIF (install engine)';
  if (!avifEngineAvailable && select.value === 'avif') {
    select.value = 'webp';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }
  updateControls();
}
function getSettings(){
  const maxWidthEnabled = document.getElementById('max-width-toggle')?.checked ?? true;
  const resizeWidthRaw = parseInt(document.getElementById('resize-width')?.value, 10);
  const resizeWidth = Number.isFinite(resizeWidthRaw) && resizeWidthRaw > 0 ? resizeWidthRaw : null;
  const maxHeightEnabled = document.getElementById('max-height-toggle')?.checked ?? false;
  const maxHeightRaw = parseInt(document.getElementById('resize-height')?.value, 10);
  const maxHeight = Number.isFinite(maxHeightRaw) && maxHeightRaw > 0 ? maxHeightRaw : null;
  const targetSizeEnabled = document.getElementById('target-size-toggle')?.checked ?? false;
  const targetSizeKBRaw = parseInt(document.getElementById('target-size-kb')?.value, 10);
  const targetSizeKB = Number.isFinite(targetSizeKBRaw) && targetSizeKBRaw > 0 ? targetSizeKBRaw : null;
  return {
    outputFolderMode: document.getElementById('output-folder-mode')?.value || 'source',
    outputFormat: document.getElementById('output-format')?.value || 'webp',
    quality: parseInt(document.getElementById('quality').value,10)||90,
    compressionLevel: parseInt(document.getElementById('compression-level').value,10)||6,
    loop: document.getElementById('loop-toggle').checked,
    keepAlpha: document.getElementById('keep-alpha-toggle')?.checked ?? true,
    fastMode:  document.getElementById('fast-mode-toggle')?.checked ?? false,
    execTimeoutSec: parseInt(document.getElementById('exec-timeout-sec')?.value, 10) || 0,
    lossless: document.getElementById('lossless-toggle').checked,
    mixed: document.getElementById('mixed-toggle').checked,
    maxWidthEnabled,
    resizeWidth,
    noChangeDimensions: document.getElementById('no-change-dimensions-toggle')?.checked ?? false,
    maxHeightEnabled,
    maxHeight,
    targetSizeEnabled,
    targetSizeKB,
    maxFps:         parseInt(document.getElementById('anim-max-fps')?.value,      10) || 24,
    maxDurationSec: parseInt(document.getElementById('anim-max-duration')?.value,  10) || 3600,
  };
}
function syncActionButtonColor(btn) {
  if (!btn) return;
  btn.style.color = btn.disabled ? disabledActionTextColor : enabledActionTextColor;
}
function updateControls(){
  const selectedFormat = document.getElementById('output-format')?.value || 'webp';
  const formatReady = selectedFormat !== 'avif' || avifEngineAvailable;
  startBtn.disabled = !(ffmpegReady && formatReady && queued>0);
  clearBtn.disabled = queued === 0;
  zipBtn.disabled = converted.size === 0;
  [startBtn, clearBtn, zipBtn].forEach(syncActionButtonColor);
}
syncOutputFormatAvailability();

let skipCurrentRequested = false;
document.addEventListener('shrinkray:skip', () => {
  if (skipCurrentRequested) return;
  skipCurrentRequested = true;
  log('Skip requested — aborting current conversion…', 'warn');
  webpFfmpeg?.terminate?.();
});

async function getEngineForSettings(settings) {
  if (settings.outputFormat !== 'avif') return webpFfmpeg;
  if (!avifEngineAvailable) {
    throw new Error(`AVIF engine is not installed. Add the AVIF WASM encoder at ${AVIF_ENGINE_BASE}.`);
  }
  if (!avifLoadingPromise) {
    status.textContent = 'Loading AVIF engine...';
    avifLoadingPromise = initAvifEngine().then((engine) => {
      status.textContent = 'Ready. Please add files.';
      return engine;
    }).catch((err) => {
      avifEngineAvailable = false;
      syncOutputFormatAvailability();
      throw err;
    }).finally(() => {
      avifLoadingPromise = null;
      updateControls();
    });
  }
  return avifLoadingPromise;
}
(async()=>{
  try{
    webpFfmpeg=await initFFmpeg({ base: WEBP_CORE_BASE, label: 'WebP engine' });
    avifEngineAvailable = await hasAvifEngineFiles();
    if (avifEngineAvailable) {
      log(`AVIF engine files found at ${AVIF_ENGINE_BASE}. AVIF engine will load on first AVIF conversion.`, 'info');
    } else {
      log(`AVIF engine not installed at ${AVIF_ENGINE_BASE}; WebP engine remains active.`, 'warn');
    }
    const heicAvailable = await hasHeicEngineFiles();
    log(heicAvailable
      ? 'HEIC/HEIF decoder found. HEIC and HEIF inputs are supported.'
      : 'HEIC/HEIF decoder not found at /vendor/jsquash-heic; HEIC inputs will be rejected.',
      heicAvailable ? 'info' : 'warn');
    syncOutputFormatAvailability();
    ffmpegReady=true; status.textContent='Ready. Please add files.'; updateControls();
  }catch(e){ console.error(e); status.textContent='Error loading converter engine. Ensure vendor/ffmpeg contains loader chunks and core-mt UMD; use node server.cjs.'; }
})();
document.getElementById('output-format')?.addEventListener('change', updateControls);

const queue=createConversionQueue(async (file,ctx)=> {
  const id = fileToId.get(file);
  if (removedIds.has(id)) {
    log(`Skipped: ${file.name} (removed from queue)`, 'warn');
    return { skipped: true, blob: null, name: null };
  }
  log(`Converting: ${file.name}  (${(file.size/1024).toFixed(1)} KB)`, 'info');
  let convFile = file;
  const isSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);
  if (isSvg) {
    const s = ctx.settings;
    log(`Rasterizing SVG: ${file.name}`, 'info');
    const pngBlob = await rasterizeSvg(
      file,
      s.maxWidthEnabled && s.resizeWidth ? s.resizeWidth : null,
      s.maxHeightEnabled && s.maxHeight  ? s.maxHeight  : null
    );
    convFile = new File([pngBlob], file.name.replace(/\.svg$/i, '.png'), { type: 'image/png' });
  } else if (isHeicFile(file)) {
    const pngBlob = await decodeHeicToBlob(file);
    convFile = new File([pngBlob], file.name.replace(/\.heic$/i, '.png').replace(/\.heif$/i, '.png'), { type: 'image/png' });
  }
  // TGA and TIFF are not natively decodable by browsers (createImageBitmap fails),
  // so pre-decode to PNG via FFmpeg when the AVIF encoder will need them.
  const needsFfmpegPreDecode = ctx.settings.outputFormat === 'avif' &&
    (/\.(tiff?|tga|targa)$/i.test(convFile.name) || /^image\/(tiff|x-tiff|x-tga|x-targa)$/i.test(convFile.type));
  if (needsFfmpegPreDecode) {
    log(`Pre-decoding ${convFile.name} to PNG for AVIF encoder…`, 'info');
    if (!webpFfmpeg) webpFfmpeg = await initFFmpeg({ base: WEBP_CORE_BASE, label: 'WebP engine' });
    const engine = webpFfmpeg;
    const pngBlob = await decodeToPng(engine, convFile);
    convFile = new File([pngBlob], convFile.name.replace(/\.[^.]+$/i, '.png'), { type: 'image/png' });
  }
  let out;
  try {
    if (ctx.settings.outputFormat === 'avif') {
      await getEngineForSettings(ctx.settings);
      out = await convertToAvif(convFile, ctx.settings, ctx.onProgress);
    } else {
      const engine = await getEngineForSettings(ctx.settings);
      out = await convertToWebP(engine,convFile,ctx.settings,ctx.onProgress);
    }
  } catch(err) {
    const wasSkip = skipCurrentRequested;
    skipCurrentRequested = false;
    if (wasSkip) {
      err.wasSkipped = true;
      log(`Skipped: ${file.name}`, 'warn');
    } else {
      log(`Error: ${file.name} — ${err?.message || err}`, 'error');
    }
    if (err?.needsReinit) {
      log(`WebP engine ${wasSkip ? 'restarting after skip' : 'terminated after timeout'} — reinitializing for next file…`, 'warn');
      status.textContent = 'Restarting WebP engine…';
      try {
        webpFfmpeg = await initFFmpeg({ base: WEBP_CORE_BASE, label: 'WebP engine' });
        status.textContent = 'Ready. Please add files.';
        log('WebP engine reinitialized OK', 'ok');
      } catch (reinitErr) {
        log(`WebP engine reinit failed: ${reinitErr?.message}`, 'error');
        ffmpegReady = false;
        status.textContent = 'WebP engine failed to restart.';
        updateControls();
      }
    }
    throw err;
  }
  const reduction = file.size > 0 ? Math.max(0,(1-(out.blob.size/file.size))*100).toFixed(1) : '0.0';
  log(`Done: ${out.name}  ${(out.blob.size/1024).toFixed(1)} KB  (↓ ${reduction}%)`, 'success');
  // Auto-save immediately on conversion complete.
  try {
    const dot = out.name.lastIndexOf('.');
    const base = dot >= 0 ? out.name.slice(0, dot) : out.name;
    const autoName = `${base}_${formatTimestamp()}.${getOutputExtension(out.name)}`;
    const saved = await saveConvertedBlob(out.blob, autoName, ctx.settings);
    log(`${saved.method === 'folder' ? 'Saved' : 'Auto-downloaded'}: ${autoName}`, 'info');
  } catch(e) { log(`Auto-save failed: ${e?.message}`, 'warn'); }
  converted.set(id, out);
  try {
    const el = await waitForItemEl(id, 1500);
    if (el && window.UIExt?.writeSizeSummaryByEls) {
      window.UIExt.writeSizeSummaryByEls(el, file.size, out.blob.size);
    }
    // ensure per-file Download link has timestamped filename
    if (el && window.UIExt?.updatePerFileDownloadName) {
      // out.name should be the final filename. We'll use that as base.
      const fallbackExt = ctx.settings.outputFormat === 'avif' ? '.avif' : '.webp';
      window.UIExt.updatePerFileDownloadName(el, out.name || (file.name.replace(/\.[^.]+$/, '') + fallbackExt));
    }
    if (el && window.UIExt?.renderRemoveLink) {
      window.UIExt.renderRemoveLink(el, id, removeFromQueue, 'Remove from Queue');
    }
  } catch {}
  return out;
});

document.getElementById('output-folder-browse')?.addEventListener('click', async ()=>{
  const pathInput = document.getElementById('output-folder-path');
  if (!window.showDirectoryPicker) {
    alert('Folder selection is not supported by this browser. Converted files will use the browser download behavior.');
    return;
  }
  try {
    outputDirectoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    if (pathInput) pathInput.value = outputDirectoryHandle.name || 'Selected folder';
  } catch (e) {
    if (e?.name !== 'AbortError') alert(`Could not select folder: ${e?.message || e}`);
  }
});

fileInput.addEventListener('change', async ()=>{
  const files=Array.from(fileInput.files || []);
  if(files.length) await handle(files);
});
dropzone.addEventListener('drop', async e=>{
  e.preventDefault();
  const files=Array.from(e.dataTransfer?.files || []);
  if(files.length) await handle(files);
});
['dragenter','dragover','dragleave'].forEach(n=>{
  dropzone.addEventListener(n,e=>e.preventDefault());
  document.body.addEventListener(n,e=>e.preventDefault());
});

async function handle(files){
  const items=await queue.add(files); queued+=items.length; updateControls();
  for(const it of items){
    fileToId.set(it.file, it.id);
    setPlaceholderThumbnail(it.id);

    try {
      const el = await waitForItemEl(it.id, 1500);
      if (el && window.UIExt?.renderRemoveLink) {
        window.UIExt.renderRemoveLink(el, it.id, removeFromQueue, 'Remove');
      }
      if (el && window.UIExt?.populateFileSizeUI) window.UIExt.populateFileSizeUI(el, it.file);
      if (el && window.UIExt?.populateResolutionUI) await window.UIExt.populateResolutionUI(el, it.file);
      if (el) {
        el.style.cursor = 'pointer';
        el.title = 'Click to preview this file in Live Preview';
        el.addEventListener('click', (e) => {
          if (e.target.closest('a,button')) return; // don't hijack download/remove/skip clicks
          if (!stillFiles.has(it.id)) return; // only stills support live preview
          setPreviewSubject(it.file, it.id);
          highlightPreviewSelection(it.id);
        });
      }
    } catch {}

    getMediaInfo(it.file)
      .then(async info => {
        setItemMeta(it.id, info);
        if (info.duration != null && info.duration > 0) {
          queuedDurations.set(it.id, info.duration);
          syncMaxDurationField();
        }
        if (info.width != null && info.width > 0) {
          queuedWidths.set(it.id, info.width);
          syncMaxWidthField();
        }
        if (!info.animated) {
          stillFiles.set(it.id, it.file);
          if (getPreviewSubjectId() == null) {
            setPreviewSubject(it.file, it.id);
            highlightPreviewSelection(it.id);
          }
        }
        try {
          const el = await waitForItemEl(it.id, 1500);
          if (el && window.UIExt?.populateResolutionUI) await window.UIExt.populateResolutionUI(el, it.file);
        } catch {}
      })
      .catch(()=>{});

    const isVideo = /^video\//.test(it.file.type) || /\.(mp4|mov|webm)$/i.test(it.file.name);
    if (isVideo) {
      try {
        const url = URL.createObjectURL(it.file);
        const video = document.createElement('video');
        video.src = url; video.muted = true; video.playsInline = true;
        await new Promise(r => { video.addEventListener('loadeddata', r, { once: true }); video.load(); });
        video.currentTime = 0;
        await new Promise(r => { video.addEventListener('seeked', r, { once: true }); });
        const vw = video.videoWidth || 1; const vh = video.videoHeight || 1;
        const w = 128; const h = Math.round(128 * vh / vw);
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(video, 0, 0, w, h);
        URL.revokeObjectURL(url);
        const blob = await new Promise(res => c.toBlob(res, 'image/png'));
        if (blob) setItemThumbnail(it.id, URL.createObjectURL(blob));
      } catch {}
    } else {
      const url = URL.createObjectURL(it.file);
      let thumbnailSet = false;
      try {
        const img = new Image(); img.src = url; await img.decode();
        const size=128; const ratio=(img.width||1)/(img.height||1); const w=Math.min(size,img.width||size); const h=Math.round(w/ratio);
        const c=document.createElement('canvas'); c.width=w; c.height=h; c.getContext('2d').drawImage(img,0,0,w,h);
        const blob=await new Promise(res=>c.toBlob(res,'image/png')); if(blob){ setItemThumbnail(it.id,URL.createObjectURL(blob)); thumbnailSet=true; }
      } catch { /* browser cannot decode this format natively */ }
      finally { URL.revokeObjectURL(url); }
      if (!thumbnailSet) {
        const ext = (it.file.name.match(/\.([^.]+)$/)?.[1] || '???').toUpperCase().slice(0, 4);
        const c = document.createElement('canvas'); c.width = 128; c.height = 128;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#1e293b'; ctx.fillRect(0, 0, 128, 128);
        ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.strokeRect(4, 4, 120, 120);
        ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(ext, 64, 64);
        const blob = await new Promise(res => c.toBlob(res, 'image/png'));
        if (blob) setItemThumbnail(it.id, URL.createObjectURL(blob));
      }
    }
  }
}

async function getJSZip(){
  try {
    const mod = await import('/vendor/jszip.mjs');
    return mod.default;
  } catch (e) {
    console.error('[zip] JSZip missing. See README (self-hosted JSZip).', e);
    alert('JSZip not found. See README: place jszip.min.js at vendor/jszip and keep vendor/jszip.mjs.');
    throw e;
  }
}

startBtn.addEventListener('click', async ()=>{
  startBtn.disabled=true;
  if (window.UIExt?.hideAllRemoveLinks) window.UIExt.hideAllRemoveLinks();
  if (window.UIExt?.markBatchStart) window.UIExt.markBatchStart(queued);
  const s = getSettings();
  const flags = [
    s.lossless ? 'lossless' : `quality=${s.quality}`,
    `format=${s.outputFormat.toUpperCase()}`,
    `compression=${s.compressionLevel}`,
    s.maxWidthEnabled && s.resizeWidth  ? `maxW=${s.resizeWidth}`  : null,
    s.maxHeightEnabled && s.maxHeight   ? `maxH=${s.maxHeight}`    : null,
    s.targetSizeEnabled && s.targetSizeKB ? `targetSize=${s.targetSizeKB}KB` : null,
    s.noChangeDimensions ? 'no-resize' : null,
    s.still ? 'still' : 'animated',
    s.loop  ? 'loop'  : null,
    s.mixed ? 'mixed' : null,
  ].filter(Boolean);
  log(`--- Batch start: ${queued} file(s)  [${flags.join('  ')}] ---`, 'info');
  try {
    await queue.run(()=>getSettings(), ()=>{ if (window.UIExt?.markBatchOneDone) window.UIExt.markBatchOneDone(); });
  } finally {
    skipCurrentRequested = false;
    updateControls();
  }
});

document.getElementById('clear-button').addEventListener('click', ()=>{
  queue.clear(); queued=0; removedIds.clear(); converted.clear(); queuedDurations.clear(); syncMaxDurationField(); queuedWidths.clear(); syncMaxWidthField(); status.textContent='Ready. Please add files.'; updateControls();
  stillFiles.clear();
  const currentSubject = getPreviewSubjectId();
  if (currentSubject != null) clearPreviewSubjectIfMatches(currentSubject);
  highlightPreviewSelection(null);
  const ag = document.getElementById('aggregate-time');
  if (ag) ag.textContent = '';
});

document.getElementById('download-all').addEventListener('click', async ()=>{
  if(converted.size===0) return;
  const JSZip = await getJSZip();
  const zip=new JSZip(); for(const f of converted.values()){ if (f?.blob) zip.file(f.name, await f.blob.arrayBuffer()); }
  const blob=await zip.generateAsync({type:'blob'}); const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=`converted_webp_files_${formatTimestamp()}.zip`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
});
