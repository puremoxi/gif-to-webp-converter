import { bannerCtl } from './ui.js';

const FF=()=>window?.FFmpeg?.FFmpeg;
function detectFFmpegGlobal(){
  const g=window.FFmpeg;
  if(!g) return { ok:false, reason:'window.FFmpeg missing (UMD did not execute)' };
  if(typeof g.FFmpeg==='function') return { ok:true, Ctor:g.FFmpeg };
  if(typeof g.createFFmpeg==='function') return { ok:false, reason:'legacy UMD (createFFmpeg) — wrong build' };
  return { ok:false, reason:'Unexpected UMD shape' };
}
async function waitForFF(timeoutMs=12000){
  const t0=Date.now();
  while(Date.now()-t0<timeoutMs){
    const d=detectFFmpegGlobal();
    if(d.ok) return d;
    await new Promise(r=>setTimeout(r,100));
  }
  return detectFFmpegGlobal();
}

// Minimal fetchFile for inputs
async function fetchFilePoly(src){
  if(src instanceof Blob){ const buf=await src.arrayBuffer(); return new Uint8Array(buf); }
  if(typeof src==='string'||src instanceof URL){ const res=await fetch(src); if(!res.ok) throw new Error('fetchFile: HTTP '+res.status); const buf=await res.arrayBuffer(); return new Uint8Array(buf); }
  throw new Error('fetchFile: unsupported input');
}

async function fetchWithProgress(url,onPct){
  const r=await fetch(url,{cache:'no-store'});
  if(!r.ok) throw new Error(`Fetch failed: ${r.status} ${r.statusText}`);
  const total=Number(r.headers.get('content-length'))||0;
  if(!r.body||!r.body.getReader||!total){
    const b=await r.blob(); onPct&&onPct(100); return b;
  }
  const rd=r.body.getReader(); const chunks=[]; let loaded=0;
  while(true){
    const {done,value}=await rd.read(); if(done) break;
    chunks.push(value); loaded+=value.byteLength; onPct&&onPct((loaded/total)*100);
  }
  return new Blob(chunks,{type:r.headers.get('content-type')||'application/octet-stream'});
}

export async function initFFmpeg(opts={}){
  const d=await waitForFF(12000);
  if(!d.ok) throw new Error(`FFmpeg library not available: ${d.reason}. Check vendor/ffmpeg/ffmpeg.js and script order.`);
  const ffmpeg=new d.Ctor();

  const base="./vendor/ffmpeg";
  const files=["ffmpeg-core.js","ffmpeg-core.wasm","ffmpeg-core.worker.js"];

  bannerCtl.show();
  for(let i=0;i<files.length;i++){
    const label=files[i];
    bannerCtl.step(i+1, files.length, label);
    const blob=await fetchWithProgress(`${base}/${label}`, (pct)=>bannerCtl.pct(pct));
    const url=URL.createObjectURL(blob);
    if(label.endsWith('.js')) ffmpeg._coreURL=url;
    else if(label.endsWith('.wasm')) ffmpeg._wasmURL=url;
    else if(label.endsWith('.worker.js')) ffmpeg._workerURL=url;
  }

  try{
    await ffmpeg.load({ coreURL: ffmpeg._coreURL, wasmURL: ffmpeg._wasmURL, workerURL: ffmpeg._workerURL });
  } finally {
    bannerCtl.pct(100);
    setTimeout(()=>bannerCtl.hide(), 400);
    if(ffmpeg._coreURL) URL.revokeObjectURL(ffmpeg._coreURL);
    if(ffmpeg._wasmURL) URL.revokeObjectURL(ffmpeg._wasmURL);
    if(ffmpeg._workerURL) URL.revokeObjectURL(ffmpeg._workerURL);
  }

  ffmpeg.fetchFile=fetchFilePoly;
  return ffmpeg;
}

export async function convertToWebP(ffmpeg,file,settings,onProgress){
  const input=file.name, output=input.replace(/\.gif$/i,'.webp');
  await ffmpeg.writeFile(input, await ffmpeg.fetchFile(file));
  const args=['-i',input,'-c:v','libwebp'];
  if(Number.isFinite(settings.compressionLevel)) args.push('-compression_level',String(settings.compressionLevel));
  if(settings.lossless) args.push('-lossless','1'); else args.push('-qscale',String(settings.quality));
  args.push('-loop', settings.loop?'0':'-1');
  if(settings.still) args.push('-preset','picture');
  args.push(output);

  const smooth=(r)=>Math.max(.05,Math.min(.99,.05+r*.94));
  const h=({progress})=>{ onProgress&&onProgress(smooth(progress)); };
  ffmpeg.on('progress',h);
  try{ await ffmpeg.exec(args); } finally { try{ ffmpeg.off('progress',h);}catch{} }
  const data=await ffmpeg.readFile(output);
  try{ await ffmpeg.deleteFile(input);}catch{}; try{ await ffmpeg.deleteFile(output);}catch{};
  return {name:output, blob:new Blob([data.buffer],{type:'image/webp'})};
}
