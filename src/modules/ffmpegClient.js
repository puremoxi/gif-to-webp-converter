import { FFmpeg, fetchFile as libFetchFile } from '/vendor/ffmpeg/ffmpeg.min.js';
let _ffmpeg=null;
const $=s=>document.querySelector(s);
function show(){ $('#loader-banner').classList.remove('hidden'); }
function hide(){ $('#loader-banner').classList.add('hidden'); }
function setFile(t){ $('#loader-file').textContent=t; }
function setCount(n,t){ $('#loader-count').textContent=`${n} / ${t} complete`; }
function setBar(p){ $('#loader-bar').style.width=`${Math.max(0,Math.min(100,p))}%`; }
$('#loader-close').onclick=()=>hide();

async function fetchWithProgress(u,on){ const r=await fetch(u,{cache:'no-store'}); if(!r.ok) throw new Error('Fetch failed: '+u);
  const total=+r.headers.get('content-length')||0; if(!r.body||!r.body.getReader||!total){ const b=await r.blob(); on&&on(100); return b; }
  const rd=r.body.getReader(); const chunks=[]; let loaded=0;
  while(true){ const {done,value}=await rd.read(); if(done)break; chunks.push(value); loaded+=value.byteLength; on&&on(loaded/total*100); }
  return new Blob(chunks,{type:r.headers.get('content-type')||'application/octet-stream'});
}

export function getFFmpeg(){ return _ffmpeg; }

export async function initFFmpeg(){
  const ffmpeg=new FFmpeg();
  const base='/vendor/ffmpeg';
  const files=['ffmpeg-core.js','ffmpeg-core.wasm','ffmpeg-core.worker.js'];
  show(); let done=0; const blobs=[];
  for(const f of files){ setFile(f); setBar(0); const b=await fetchWithProgress(`${base}/${f}`,p=>setBar(p)); blobs.push(b); done++; setCount(done,files.length); }
  const [jsb,wasmb,workb]=blobs;
  const coreURL=URL.createObjectURL(jsb), wasmURL=URL.createObjectURL(wasmb), workerURL=URL.createObjectURL(workb);
  try{
    await ffmpeg.load({ coreURL, wasmURL, workerURL });
  } finally {
    hide(); URL.revokeObjectURL(coreURL); URL.revokeObjectURL(wasmURL); URL.revokeObjectURL(workerURL);
  }
  ffmpeg.fetchFile = libFetchFile;
  window.__ffmpegReady=true; _ffmpeg=ffmpeg; return ffmpeg;
}

export async function convertToWebP(ffmpeg,file,settings={},onProgress){
  const input=file.name, output=input.replace(/\.gif$/i,'.webp');
  ffmpeg.on('progress',({progress})=> onProgress && onProgress(progress));
  await ffmpeg.writeFile(input, await ffmpeg.fetchFile(file));
  const args=['-i',input,'-c:v','libwebp','-loop','0',output];
  await ffmpeg.exec(args);
  const data=await ffmpeg.readFile(output);
  try{await ffmpeg.deleteFile(input);}catch{}; try{await ffmpeg.deleteFile(output);}catch{};
  return {name:output, blob:new Blob([data.buffer],{type:'image/webp'})};
}
