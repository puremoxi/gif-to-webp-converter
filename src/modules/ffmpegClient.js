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
export async function initFFmpeg(opts={}){
  const d=await waitForFF(12000);
  if(!d.ok) throw new Error(`FFmpeg library not available: ${d.reason}. Check vendor/ffmpeg/ffmpeg.js and script order.`);
  const ffmpeg=new d.Ctor();
  const base="/vendor/ffmpeg";
  const urls={ coreURL:`${base}/ffmpeg-core.js`, wasmURL:`${base}/ffmpeg-core.wasm`, workerURL:`${base}/ffmpeg-core.worker.js` };
  bannerCtl.show();
  try{
    bannerCtl.step(1,3,'ffmpeg-core.js'); pct(100);
    bannerCtl.step(2,3,'ffmpeg-core.wasm'); pct(100);
    bannerCtl.step(3,3,'ffmpeg-core.worker.js'); pct(0);
    await ffmpeg.load(urls); pct(100);
  } finally { setTimeout(()=>bannerCtl.hide(), 400); }
  const maybeFetchFile = (d.g && d.g.fetchFile) || null;
  ffmpeg.fetchFile = (typeof maybeFetchFile === 'function') ? maybeFetchFile : polyfillFetchFile;
  if (!crossOriginIsolated) {
    console.warn('[ffmpeg] crossOriginIsolated=false; start COOP/COEP server: node server.cjs');
    logAlways('crossOriginIsolated=false — SharedArrayBuffer blocked. Run via: npm run serve  Conversions will hang without it.', 'error');
  } else {
    logAlways('FFmpeg loaded OK  (crossOriginIsolated=true)', 'ok');
  }
  return ffmpeg;
}
export async function convertToWebP(ffmpeg,file,settings,onProgress){
  if(settings.targetSizeEnabled && settings.targetSizeKB > 0 && !settings.lossless){
    return _binarySearchQuality(ffmpeg,file,settings,onProgress);
  }
  return _convertToWebP(ffmpeg,file,settings,onProgress);
}

async function _binarySearchQuality(ffmpeg,file,settings,onProgress){
  const targetBytes = settings.targetSizeKB * 1024;
  const maxIter = 8;
  let lo = 1, hi = 100, best = null;
  log(`[target size] searching for ≤${settings.targetSizeKB} KB in up to ${maxIter} passes`, 'info');
  for(let i = 0; i < maxIter; i++){
    if(lo > hi) break;
    const mid = Math.round((lo + hi) / 2);
    const result = await _convertToWebP(ffmpeg,file,{...settings,quality:mid},
      (p)=>{ onProgress&&onProgress((i + p) / maxIter); });
    const kb = (result.blob.size/1024).toFixed(1);
    const hit = result.blob.size <= targetBytes;
    log(`[target size] pass ${i+1}: quality=${mid}  →  ${kb} KB  ${hit ? '✓ under target' : '✗ over target'}`, 'info');
    if(hit){ best = result; lo = mid + 1; }
    else { hi = mid - 1; }
  }
  if(!best){
    log(`[target size] could not fit under ${settings.targetSizeKB} KB — using quality=1`, 'warn');
    best = await _convertToWebP(ffmpeg,file,{...settings,quality:1},onProgress);
  }
  return best;
}

async function _convertToWebP(ffmpeg,file,settings,onProgress){
  const originalName = String(file?.name || 'image');
  const originalType = String(file?.type || '').toLowerCase();
  const isGifInput = originalType === 'image/gif' || /\.gif$/i.test(originalName);
  const shouldStillEncode = !!settings.still || !isGifInput;
  const outputName = originalName.replace(/\.[^.]+$/i,'.webp');
  const extMatch = originalName.match(/(\.[^.]+)$/i);
  const inputExt = extMatch ? extMatch[1] : '.bin';
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const inputFs = `in-${token}${inputExt}`;
  const outputFs = `out-${token}.webp`;

  await ffmpeg.writeFile(inputFs, await ffmpeg.fetchFile(file));
  const args=['-y','-threads','1','-i',inputFs,'-c:v','libwebp'];

  const wCap = !settings.noChangeDimensions && settings.maxWidthEnabled && Number.isFinite(settings.resizeWidth) && settings.resizeWidth > 0 ? Math.floor(settings.resizeWidth) : null;
  const hCap = !settings.noChangeDimensions && settings.maxHeightEnabled && Number.isFinite(settings.maxHeight) && settings.maxHeight > 0 ? Math.floor(settings.maxHeight) : null;
  if(wCap && hCap){
    args.push('-vf', `scale=${wCap}:${hCap}:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2`);
  } else if(wCap){
    args.push('-vf', `scale=${wCap}:-2:force_original_aspect_ratio=decrease`);
  } else if(hCap){
    args.push('-vf', `scale=-2:${hCap}:force_original_aspect_ratio=decrease`);
  }

  if(Number.isFinite(settings.compressionLevel)) args.push('-compression_level',String(settings.compressionLevel));
  if(settings.lossless) args.push('-lossless','1'); else args.push('-qscale',String(settings.quality));
  if(shouldStillEncode){
    args.push('-frames:v','1','-preset','picture');
  } else {
    args.push('-loop', settings.loop?'0':'-1');
  }
  args.push(outputFs);
  log('ffmpeg ' + args.join(' '), 'cmd');
  const smooth=(r)=>Math.max(.05,Math.min(.99,.05+r*.94));
  const h=({progress})=>{ onProgress&&onProgress(smooth(progress)); };
  ffmpeg.on('progress',h);
  const execTimeout = new Promise((_,reject)=>setTimeout(()=>reject(new Error('ffmpeg exec timed out after 30s')),30000));
  try{
    const ret = await Promise.race([ffmpeg.exec(args), execTimeout]);
    if(typeof ret === 'number' && ret !== 0) throw new Error(`ffmpeg exited with code ${ret}`);
  } finally { try{ ffmpeg.off('progress',h);}catch{} }
  const data=await ffmpeg.readFile(outputFs);
  try{ await ffmpeg.deleteFile(inputFs);}catch{}
  try{ await ffmpeg.deleteFile(outputFs);}catch{}
  return {name:outputName, blob:new Blob([data.buffer],{type:'image/webp'})};
}
