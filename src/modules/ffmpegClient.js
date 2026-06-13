import { bannerCtl, pct } from './ui.js';
import { log, logAlways } from './logger.js';
function getFFGlobal(){
  const g = (window.FFmpeg || window.FFmpegWASM);
  if(!g) return { ok:false, reason:'FFmpeg global missing (FFmpeg/FFmpegWASM)' };
  if(typeof g.FFmpeg==='function') return { ok:true, Ctor:g.FFmpeg, g };
  if(typeof g.createFFmpeg==='function') return { ok:false, reason:'legacy UMD (createFFmpeg) — wrong build' };
  return { ok:false, reason:'Unexpected FFmpeg UMD shape' };
}
async function waitForFF(timeoutMs=12000){
  const t0=Date.now();
  while(Date.now()-t0<timeoutMs){
    const d=getFFGlobal();
    if(d.ok) return d;
    await new Promise(r=>setTimeout(r,100));
  }
  return getFFGlobal();
}
async function polyfillFetchFile(src){
  if(src instanceof Blob){ const buf=await src.arrayBuffer(); return new Uint8Array(buf); }
  if(typeof src==='string'||src instanceof URL){ const res=await fetch(src); if(!res.ok) throw new Error('fetchFile: HTTP '+res.status); const buf=await res.arrayBuffer(); return new Uint8Array(buf); }
  throw new Error('fetchFile: unsupported input');
}

export async function hasFFmpegCoreFiles(base="/vendor/ffmpeg") {
  const files = ['ffmpeg-core.js', 'ffmpeg-core.wasm', 'ffmpeg-core.worker.js'];
  try {
    const results = await Promise.all(files.map(async (file) => {
      const res = await fetch(`${base}/${file}`, { method: 'HEAD', cache: 'no-store' });
      return res.ok;
    }));
    return results.every(Boolean);
  } catch {
    return false;
  }
}

async function detectAvifEncodeSupport(ffmpeg) {
  const lines = [];
  const onLog = ({ message }) => { if (message) lines.push(String(message)); };
  try {
    ffmpeg.on('log', onLog);
    await ffmpeg.exec(['-hide_banner', '-encoders']);
  } catch {
    return false;
  } finally {
    try { ffmpeg.off('log', onLog); } catch {}
  }
  return /\b(libaom-av1|libsvtav1|librav1e)\b/.test(lines.join('\n'));
}

export async function initFFmpeg(opts={}){
  const d=await waitForFF(12000);
  const base = opts.base || "/vendor/ffmpeg";
  const label = opts.label || 'FFmpeg';
  const requireAvifEncoder = !!opts.requireAvifEncoder;
  if(!d.ok) throw new Error(`FFmpeg library not available: ${d.reason}. Check vendor/ffmpeg/ffmpeg.js and script order.`);
  const ffmpeg=new d.Ctor();
  const urls={ coreURL:`${base}/ffmpeg-core.js`, wasmURL:`${base}/ffmpeg-core.wasm`, workerURL:`${base}/ffmpeg-core.worker.js` };
  bannerCtl.show();
  try{
    bannerCtl.step(1,3,`${label}: ffmpeg-core.js`); pct(100);
    bannerCtl.step(2,3,`${label}: ffmpeg-core.wasm`); pct(100);
    bannerCtl.step(3,3,`${label}: ffmpeg-core.worker.js`); pct(0);
    await ffmpeg.load(urls); pct(100);
  } finally { setTimeout(()=>bannerCtl.hide(), 400); }
  const maybeFetchFile = (d.g && d.g.fetchFile) || null;
  ffmpeg.fetchFile = (typeof maybeFetchFile === 'function') ? maybeFetchFile : polyfillFetchFile;
  ffmpeg.coreBase = base;
  ffmpeg.coreLabel = label;
  ffmpeg.supportsAvifEncode = await detectAvifEncodeSupport(ffmpeg);
  if (requireAvifEncoder && !ffmpeg.supportsAvifEncode) {
    throw new Error(`${label} loaded from ${base}, but it does not include an AV1 encoder such as libaom-av1, libsvtav1, or librav1e.`);
  }
  if (!crossOriginIsolated) {
    console.warn('[ffmpeg] crossOriginIsolated=false; start COOP/COEP server: node server.cjs');
    logAlways('crossOriginIsolated=false — SharedArrayBuffer blocked. Run via: npm run serve  Conversions will hang without it.', 'error');
  } else {
    logAlways(`${label} loaded OK  (crossOriginIsolated=true)`, 'ok');
  }
  return ffmpeg;
}
export async function convertToWebP(ffmpeg,file,settings,onProgress){
  if(settings.targetSizeEnabled && settings.targetSizeKB > 0 && !(settings.outputFormat !== 'avif' && settings.lossless)){
    return _binarySearchQuality(ffmpeg,file,settings,onProgress);
  }
  return _convertImage(ffmpeg,file,settings,onProgress);
}

async function _binarySearchQuality(ffmpeg,file,settings,onProgress){
  const targetBytes = settings.targetSizeKB * 1024;
  const maxIter = 8;
  let lo = 1, hi = 100, best = null;
  log(`[target size] searching for ≤${settings.targetSizeKB} KB in up to ${maxIter} passes`, 'info');
  for(let i = 0; i < maxIter; i++){
    if(lo > hi) break;
    const mid = Math.round((lo + hi) / 2);
    const result = await _convertImage(ffmpeg,file,{...settings,quality:mid},
      (p)=>{ onProgress&&onProgress((i + p) / maxIter); });
    const kb = (result.blob.size/1024).toFixed(1);
    const hit = result.blob.size <= targetBytes;
    log(`[target size] pass ${i+1}: quality=${mid}  →  ${kb} KB  ${hit ? '✓ under target' : '✗ over target'}`, 'info');
    if(hit){ best = result; lo = mid + 1; }
    else { hi = mid - 1; }
  }
  if(!best){
    log(`[target size] could not fit under ${settings.targetSizeKB} KB — using quality=1`, 'warn');
    best = await _convertImage(ffmpeg,file,{...settings,quality:1},onProgress);
  }
  return best;
}

async function _convertImage(ffmpeg,file,settings,onProgress){
  try { return await _doConvertImage(ffmpeg,file,settings,onProgress); }
  catch(e) { _tagEngineDeadError(e); throw e; }
}
async function _doConvertImage(ffmpeg,file,settings,onProgress){
  const originalName = String(file?.name || 'image');
  const originalType = String(file?.type || '').toLowerCase();
  const isGifInput   = originalType === 'image/gif'  || /\.gif$/i.test(originalName);
  const isApngInput  = originalType === 'image/apng' || /\.apng$/i.test(originalName);
  const isVideoInput = /^video\//.test(originalType) || /\.(mp4|mov|webm)$/i.test(originalName);
  const isAnimatedInput = isGifInput || isApngInput || isVideoInput;
  let outputFormat = settings.outputFormat === 'avif' ? 'avif' : 'webp';
  if(outputFormat === 'avif' && !ffmpeg.supportsAvifEncode){
    throw new Error(`${ffmpeg.coreLabel || 'Selected FFmpeg core'} cannot encode AVIF. Use the isolated AVIF engine instead.`);
  }
  const shouldStillEncode = outputFormat === 'avif' || !isAnimatedInput;
  const outputName = originalName.replace(/\.[^.]+$/i,`.${outputFormat}`);
  const extMatch = originalName.match(/(\.[^.]+)$/i);
  const inputExt = extMatch ? extMatch[1] : '.bin';
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const inputFs = `in-${token}${inputExt}`;
  const outputFs = `out-${token}.${outputFormat}`;

  // Use file.size (always valid on File/Blob) for timeouts — fileBytes.length becomes 0
  // after writeFile transfers the ArrayBuffer to the Web Worker (detached buffer).
  const fileSizeBytes = file.size || 0;
  const fileMB = fileSizeBytes / (1024 * 1024);
  const writeLimitMs = Math.min(120000, 20000 + Math.ceil(fileMB) * 10000);
  // Scale exec timeout: animated 2 min; stills 90s base + 15s/MB, capped at 5 min.
  const execTimeoutMs = isAnimatedInput
    ? 300000
    : Math.min(300000, 90000 + Math.ceil(fileMB) * 15000);

  log(`Loading: ${originalName} → ${outputFormat}  (${(fileSizeBytes/1024).toFixed(1)} KB  |  write≤${writeLimitMs/1000}s  exec≤${execTimeoutMs/1000}s)`, 'info');
  const fileBytes = await ffmpeg.fetchFile(file);
  log(`Fetched ${(fileBytes.length/1024).toFixed(1)} KB into WASM memory`, 'info');

  const writeTimeoutErr = new Error(`ffmpeg writeFile timed out after ${writeLimitMs / 1000}s`);
  writeTimeoutErr.needsReinit = true;
  let writeTimerHandle;
  const writeTimeout = new Promise((_, reject) => {
    writeTimerHandle = setTimeout(() => { try { ffmpeg.terminate?.(); } catch {} reject(writeTimeoutErr); }, writeLimitMs);
  });
  try {
    await Promise.race([ffmpeg.writeFile(inputFs, fileBytes), writeTimeout]);
  } finally {
    clearTimeout(writeTimerHandle);
  }
  log(`Written to WASM FS as ${inputFs}`, 'info');
  const args=['-y','-threads','1'];
  if(isVideoInput && !shouldStillEncode) args.push('-t', String(settings.maxDurationSec ?? 10));
  args.push('-i',inputFs,'-c:v', outputFormat === 'avif' ? 'libaom-av1' : 'libwebp');

  const wCap = !settings.noChangeDimensions && settings.maxWidthEnabled && Number.isFinite(settings.resizeWidth) && settings.resizeWidth > 0 ? Math.floor(settings.resizeWidth) : null;
  const hCap = !settings.noChangeDimensions && settings.maxHeightEnabled && Number.isFinite(settings.maxHeight) && settings.maxHeight > 0 ? Math.floor(settings.maxHeight) : null;
  let vfFilter = null;
  if(wCap && hCap){
    vfFilter = `scale=${wCap}:${hCap}:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2`;
  } else if(wCap){
    vfFilter = `scale=${wCap}:-2:force_original_aspect_ratio=decrease`;
  } else if(hCap){
    vfFilter = `scale=-2:${hCap}:force_original_aspect_ratio=decrease`;
  }
  if(!settings.keepAlpha){
    vfFilter = vfFilter ? `${vfFilter},format=rgb24` : 'format=rgb24';
  }
  if(vfFilter) args.push('-vf', vfFilter);

  if(outputFormat === 'avif'){
    const crf = Math.round(63 - ((Number(settings.quality) || 90) * 0.63));
    args.push('-crf', String(Math.max(0, Math.min(63, crf))));
    if(Number.isFinite(settings.compressionLevel)) args.push('-cpu-used', String(Math.max(0, Math.min(8, 8 - Number(settings.compressionLevel)))));
  } else {
    if(Number.isFinite(settings.compressionLevel)) {
      const rawLevel = Number(settings.compressionLevel);
      // Fast Mode: use compression level 2 for maximum speed.
      // Safety cap: level 5-6 is brute-force in libwebp — exponentially slow in WASM.
      const effectiveLevel = settings.fastMode ? 2 : Math.min(rawLevel, 4);
      if (settings.fastMode) {
        log(`Fast Mode: compression_level=2, quality capped at 80`, 'info');
      } else if (rawLevel > 4) {
        log(`compression_level capped at 4 (requested ${rawLevel}; level 5-6 is impractically slow in WASM)`, 'warn');
      }
      args.push('-compression_level', String(effectiveLevel));
    }
    const effectiveQuality = settings.fastMode ? Math.min(Number(settings.quality) || 90, 80) : settings.quality;
    if(settings.lossless) args.push('-lossless','1'); else args.push('-q:v',String(effectiveQuality));
  }
  if(shouldStillEncode){
    args.push('-frames:v','1');
  } else {
    if(isVideoInput) args.push('-r', String(settings.maxFps ?? 15));
    args.push('-loop', settings.loop?'0':'-1');
  }
  args.push(outputFs);
  log('ffmpeg ' + args.join(' '), 'cmd');
  const smooth=(r)=>Math.max(.05,Math.min(.99,.05+r*.94));
  const h=({progress})=>{ onProgress&&onProgress(smooth(progress)); };
  const ffLines = [];
  const ffLog = ({ message }) => { if (message) ffLines.push(String(message)); };
  ffmpeg.on('progress',h);
  ffmpeg.on('log', ffLog);

  // For still images FFmpeg never fires progress events until the frame is done.
  // Drive the progress bar with elapsed-time estimates and log periodic heartbeats.
  let progressInterval = null;
  if (shouldStillEncode && onProgress) {
    const execStart = Date.now();
    progressInterval = setInterval(() => {
      const elapsedMs = Date.now() - execStart;
      const elapsedS  = Math.round(elapsedMs / 1000);
      // Ramp to 90% over the first 70% of the timeout window.
      onProgress(Math.min(0.90, elapsedMs / (execTimeoutMs * 0.70)));
      if (elapsedS > 0 && elapsedS % 10 === 0) {
        log(`Still encoding… ${elapsedS}s elapsed (limit ${execTimeoutMs/1000}s)`, 'info');
      }
    }, 1000);
  }
  const execTimeoutErr = new Error(`ffmpeg exec timed out after ${execTimeoutMs/1000}s`);
  execTimeoutErr.needsReinit = true;
  let execTimerHandle;
  const execTimeout = new Promise((_,reject) => {
    execTimerHandle = setTimeout(() => { try { ffmpeg.terminate?.(); } catch {} reject(execTimeoutErr); }, execTimeoutMs);
  });
  try{
    const ret = await Promise.race([ffmpeg.exec(args), execTimeout]);
    if(typeof ret === 'number' && ret !== 0) {
      const tail = ffLines.slice(-5).join(' | ');
      throw new Error(`ffmpeg exited with code ${ret}${tail ? ` — ${tail}` : ''}`);
    }
  } catch(execErr) {
    // Emit the last few lines of FFmpeg's own output to help diagnose failures
    if (ffLines.length) {
      const relevant = ffLines.filter(l => /error|invalid|unsupported|failed|no such/i.test(l));
      const tail = (relevant.length ? relevant : ffLines).slice(-6);
      tail.forEach(l => log(`  ffmpeg: ${l}`, 'ffmpeg'));
    }
    throw execErr;
  } finally {
    clearTimeout(execTimerHandle);
    if (progressInterval) clearInterval(progressInterval);
    try{ ffmpeg.off('progress',h);}catch{}
    try{ ffmpeg.off('log', ffLog);}catch{}
  }
  const data=await ffmpeg.readFile(outputFs);
  try{ await ffmpeg.deleteFile(inputFs);}catch{}
  try{ await ffmpeg.deleteFile(outputFs);}catch{}
  return {name:outputName, blob:new Blob([data.buffer],{type: outputFormat === 'avif' ? 'image/avif' : 'image/webp'})};
}

function _tagEngineDeadError(e) {
  const msg = String(e?.message || '');
  if (!e.needsReinit && (
    msg.includes('called FFmpeg.terminate') ||
    msg.includes('ffmpeg is not loaded') ||
    msg.includes('not loaded, call')
  )) {
    e.needsReinit = true;
  }
}
