import { bannerCtl, pct } from './ui.js';
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
  if (!crossOriginIsolated) console.warn('[ffmpeg] crossOriginIsolated=false; start COOP/COEP server: node server.cjs');
  return ffmpeg;
}
export async function convertToWebP(ffmpeg,file,settings,onProgress){
  const originalName = String(file?.name || 'image');
  const outputName = originalName.replace(/\.[^.]+$/i,'.webp');
  const extMatch = originalName.match(/(\.[^.]+)$/i);
  const inputExt = extMatch ? extMatch[1] : '.bin';
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const inputFs = `in-${token}${inputExt}`;
  const outputFs = `out-${token}.webp`;

  await ffmpeg.writeFile(inputFs, await ffmpeg.fetchFile(file));
  const args=['-y','-i',inputFs,'-c:v','libwebp'];
  if (settings.resizeEnabled && Number.isFinite(settings.resizeWidth) && settings.resizeWidth > 0) {
    const maxWidth = Math.floor(settings.resizeWidth);
    args.push('-vf', `scale=min(iw\\,${maxWidth}):-2`);
  }
  if(Number.isFinite(settings.compressionLevel)) args.push('-compression_level',String(settings.compressionLevel));
  if(settings.lossless) args.push('-lossless','1'); else args.push('-qscale',String(settings.quality));
  if(settings.still){
    args.push('-frames:v','1','-preset','picture');
  } else {
    args.push('-loop', settings.loop?'0':'-1');
  }
  args.push(outputFs);
  const smooth=(r)=>Math.max(.05,Math.min(.99,.05+r*.94));
  const h=({progress})=>{ onProgress&&onProgress(smooth(progress)); };
  ffmpeg.on('progress',h);
  try{ await ffmpeg.exec(args); } finally { try{ ffmpeg.off('progress',h);}catch{} }
  const data=await ffmpeg.readFile(outputFs);
  try{ await ffmpeg.deleteFile(inputFs);}catch{}
  try{ await ffmpeg.deleteFile(outputFs);}catch{}
  return {name:outputName, blob:new Blob([data.buffer],{type:'image/webp'})};
}
