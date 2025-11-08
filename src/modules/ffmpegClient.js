let ffmpegInstance=null;
const FF=()=>window?.FFmpeg?.FFmpeg;
async function waitForFF(timeoutMs=12000){ const t0=Date.now(); while(Date.now()-t0<timeoutMs){ if(FF()) return true; await new Promise(r=>setTimeout(r,100)); } return false; }
// Minimal fetchFile polyfill (inputs)
async function polyfillFetchFile(src){ if(src instanceof Blob){ const buf=await src.arrayBuffer(); return new Uint8Array(buf);} if(typeof src==='string'||src instanceof URL){ const res=await fetch(src); if(!res.ok) throw new Error('fetchFile: HTTP '+res.status); const buf=await res.arrayBuffer(); return new Uint8Array(buf);} throw new Error('fetchFile: unsupported input'); }
async function fetchWithProgress(url,onPct){ const r=await fetch(url); if(!r.ok) throw new Error(`Fetch failed: ${r.status} ${r.statusText}`); const total=Number(r.headers.get('content-length'))||0; if(!r.body||!r.body.getReader||!total){ const b=await r.blob(); onPct&&onPct(100); return b; } const rd=r.body.getReader(); const chunks=[]; let loaded=0; while(true){ const {done,value}=await rd.read(); if(done) break; chunks.push(value); loaded+=value.byteLength; onPct&&onPct((loaded/total)*100);} return new Blob(chunks,{type:r.headers.get('content-type')||'application/octet-stream'}); }
export async function initFFmpeg(opts={}){
  const ok=await waitForFF(12000); if(!ok) throw new Error('FFmpeg library not available (vendor/ffmpeg/ffmpeg.js missing?)');
  const ffmpeg=new (FF())();
  const base="./vendor/ffmpeg"; const files=["ffmpeg-core.js","ffmpeg-core.wasm","ffmpeg-core.worker.js"];
  opts.onStart&&opts.onStart();
  const blobs=[]; for(let i=0;i<files.length;i++){ const label=files[i], url=`${base}/${label}`; opts.onFileStep&&opts.onFileStep(i+1,files.length,label); const b=await fetchWithProgress(url,(pct)=>opts.onProgress&&opts.onProgress(pct,i+1,files.length,label)); blobs.push(b); opts.onProgress&&opts.onProgress(100,i+1,files.length,label); }
  const [jsb,wasmb,workb]=blobs; const coreURL=URL.createObjectURL(jsb), wasmURL=URL.createObjectURL(wasmb), workerURL=URL.createObjectURL(workb);
  try{ await ffmpeg.load({coreURL, wasmURL, workerURL}); opts.onStatus&&opts.onStatus('Converter ready.'); } finally { opts.onDone&&opts.onDone(); URL.revokeObjectURL(coreURL); URL.revokeObjectURL(wasmURL); URL.revokeObjectURL(workerURL); }
  ffmpeg.fetchFile=polyfillFetchFile; return (ffmpegInstance=ffmpeg);
}
export async function convertToWebP(ffmpeg,file,settings,onProgress){
  const input=file.name, output=input.replace(/\.gif$/i,'.webp'); await ffmpeg.writeFile(input, await ffmpeg.fetchFile(file));
  const args=['-i',input,'-c:v','libwebp']; if(Number.isFinite(settings.compressionLevel)) args.push('-compression_level',String(settings.compressionLevel)); if(settings.lossless) args.push('-lossless','1'); else args.push('-qscale',String(settings.quality)); args.push('-loop', settings.loop?'0':'-1'); if(settings.still) args.push('-preset','picture'); args.push(output);
  const smooth=(r)=>Math.max(.05,Math.min(.99,.05+r*.94)); const h=({progress})=>{ onProgress&&onProgress(smooth(progress)); };
  ffmpeg.on('progress',h); try{ await ffmpeg.exec(args); } finally { try{ ffmpeg.off('progress',h);}catch{} }
  const data=await ffmpeg.readFile(output); try{ await ffmpeg.deleteFile(input);}catch{}; try{ await ffmpeg.deleteFile(output);}catch{};
  return {name:output, blob:new Blob([data.buffer],{type:'image/webp'})};
}