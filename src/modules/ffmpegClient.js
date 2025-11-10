import { bannerCtl, pct } from './ui.js';

let ffmpegInstance=null;

const FF = () => window?.FFmpeg?.FFmpeg || window?.FFmpegWASM?.FFmpeg;
const FF_fetchFile = () => window?.FFmpegUtil?.fetchFile || window?.FFmpegWASM?.fetchFile;

async function waitForFF(timeoutMs=20000){
  const start=Date.now();
  while(Date.now()-start<timeoutMs){
    if(FF() && FF_fetchFile()) return true;
    await new Promise(r=>setTimeout(r,100));
  }
  return false;
}

async function fetchWithProgress(url, onPct){
  const r=await fetch(url, { cache:'no-store' });
  if(!r.ok) throw new Error(`Fetch failed: ${r.status} ${r.statusText}`);
  const total = Number(r.headers.get('content-length')) || 0;
  if(!r.body || !r.body.getReader || !total){
    const b=await r.blob();
    onPct && onPct(100);
    return b;
  }
  const rd=r.body.getReader(); const chunks=[]; let loaded=0;
  while(true){
    const {done, value}=await rd.read();
    if(done) break;
    chunks.push(value);
    loaded+=value.byteLength;
    onPct && onPct((loaded/total)*100);
  }
  return new Blob(chunks, { type: r.headers.get('content-type') || 'application/octet-stream' });
}

export async function initFFmpeg(){
  const ok = await waitForFF(20000);
  if(!ok) throw new Error('FFmpeg library not available: window.FFmpeg did not load. Check vendor/ffmpeg/ffmpeg.js and script order.');

  const FFClass = FF();
  const ffmpeg = new FFClass();

  const base = '/vendor/ffmpeg';
  const files = ['ffmpeg-core.js','ffmpeg-core.wasm','ffmpeg-core.worker.js'];
  bannerCtl.show();

  const blobs = [];
  for(let i=0;i<files.length;i++){
    const label=files[i];
    bannerCtl.step(i+1, files.length, label);
    const b = await fetchWithProgress(`${base}/${label}`, (p)=>pct(p));
    blobs.push(b);
    pct(100);
  }

  const [coreJS, wasm, worker] = blobs;
  const coreURL = URL.createObjectURL(coreJS);
  const wasmURL = URL.createObjectURL(wasm);
  const workerURL = URL.createObjectURL(worker);

  try{
    await ffmpeg.load({ coreURL, wasmURL, workerURL });
  } finally {
    URL.revokeObjectURL(coreURL);
    URL.revokeObjectURL(wasmURL);
    URL.revokeObjectURL(workerURL);
    bannerCtl.hide();
  }

  ffmpeg.fetchFile = FF_fetchFile() || (async function polyfillFetchFile(src){
    if(src instanceof Blob){
      const buf=await src.arrayBuffer(); return new Uint8Array(buf);
    }
    if(typeof src==='string' || src instanceof URL){
      const res=await fetch(src); if(!res.ok) throw new Error('fetchFile: HTTP '+res.status);
      const buf=await res.arrayBuffer(); return new Uint8Array(buf);
    }
    throw new Error('fetchFile: unsupported input');
  });

  ffmpegInstance = ffmpeg;
  return ffmpegInstance;
}

export async function convertToWebP(ffmpeg,file,settings,onProgress){
  const input=file.name;
  const output=input.replace(/\.gif$/i,'.webp');

  await ffmpeg.writeFile(input, await ffmpeg.fetchFile(file));

  const args=['-i',input,'-c:v','libwebp'];
  if(Number.isFinite(settings.compressionLevel)) args.push('-compression_level',String(settings.compressionLevel));
  if(settings.lossless) args.push('-lossless','1');
  else args.push('-qscale', String(settings.quality));
  args.push('-loop', settings.loop ? '0' : '-1');
  if(settings.still) args.push('-preset','picture');
  args.push(output);

  const smooth=(r)=>Math.max(.05,Math.min(.99,.05+r*.94));
  const h=({progress})=>{ onProgress && onProgress(smooth(progress)); };
  ffmpeg.on('progress', h);
  try{
    await ffmpeg.exec(args);
  } finally {
    try{ ffmpeg.off('progress', h); }catch{}
  }

  const data=await ffmpeg.readFile(output);
  try{ await ffmpeg.deleteFile(input);}catch{}
  try{ await ffmpeg.deleteFile(output);}catch{}

  return { name: output, blob: new Blob([data.buffer], { type:'image/webp' }) };
}
