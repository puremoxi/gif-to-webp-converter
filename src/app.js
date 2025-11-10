import { setupUI, setPlaceholderThumbnail, setItemThumbnail, setItemMeta, setItemResolution, setItemError } from './modules/ui.js';
import { initFFmpeg, convertToWebP } from './modules/ffmpegClient.js';
import { createConversionQueue } from './modules/queueManager.js';
import { getGifInfo } from './modules/gifInfo.js';

const dropzone=document.getElementById('dropzone'); const fileInput=document.getElementById('fileInput');
const startBtn=document.getElementById('start-button'); const clearBtn=document.getElementById('clear-button'); const zipBtn=document.getElementById('download-all'); const status=document.getElementById('converter-status');
let ffmpeg=null, ffmpegReady=false, queued=0; const converted=[];

(async () => {
  try{
    const r = await fetch('/vendor/css/tailwind.css', { cache: 'no-store' });
    if(!r.ok){ document.getElementById('tw-banner')?.classList.remove('hidden'); console.warn('[css] vendor/css/tailwind.css not found'); }
    else{
      const text = await r.text();
      if(/Build me via: npm run build:css/i.test(text) || text.trim().length < 64){
        document.getElementById('tw-banner')?.classList.remove('hidden');
        console.warn('[css] vendor/css/tailwind.css appears to be a placeholder; run npm run build:css');
      }
    }
  }catch{ document.getElementById('tw-banner')?.classList.remove('hidden'); }
})();

setupUI(dropzone,fileInput);
function getSettings(){
  return {
    quality: Number(document.getElementById('quality').value) || 90,
    compressionLevel: Number(document.getElementById('compression-level').value) || 6,
    loop: document.getElementById('loop-toggle').checked,
    still: document.getElementById('still-toggle').checked,
    lossless: document.getElementById('lossless-toggle').checked,
    mixed: document.getElementById('mixed-toggle').checked,
  }
}
function updateStart(){
  startBtn.disabled = (queued === 0) || !ffmpegReady || queue.isProcessing();
  startBtn.textContent = queue.isProcessing() ? 'Processing...' : 'Start Conversion';
}
async function processFile(file, { id, onProgress, settings }) {
  const out = await convertToWebP(ffmpeg, file, settings, (r) => onProgress(r));
  return { ...out, id };
}

const queue = createConversionQueue(processFile);
(async ()_=>{
  try{
    ffmpeg = await initFFmpeg();
    ffmpegReady=true; status.textContent='Converter ready. Please add files.';
  }catch(e){
    console.error(e); status.textContent='Failed to load FFmpeg. Please reload.';
  }
  updateStart();
})();

dropzone.addEventListener('drop', e => handleFiles(e.dataTransfer.files));
fileInput.addEventListener('change', e => handleFiles(e.target.files));
async function handleFiles(files){
  const items = await queue.add(Array.from(files));
  queued += items.length; updateStart();
  for(const it of items){
    setPlaceholderThumbnail(it.id);
    try{
      const info = await getGifInfo(it.file);
      setItemMeta(it.id, info);
    }catch{}
    try{ // Get resolution
      const img=new Image(), url=URL.createObjectURL(it.file); await new Promise((rs,rj)=>{ img.onload=rs; img.onerror=rj; img.src=url; }); const {naturalWidth:w, naturalHeight:h}=img; setItemResolution(it.id,w,h);
      const c=document.createElement('canvas'); c.width=w; c.height=h; c.getContext('2d').drawImage(img,0,0,w,h); URL.revokeObjectURL(url);
      const blob=await new Promise(res=>c.toBlob(res,'image/png')); if(blob) setItemThumbnail(it.id,URL.createObjectURL(blob));
    }catch{}
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
  status.textContent='Processing...';
  const totalStartTime = performance.now();
  const JSZip = await getJSZip();
  await queue.run(()=>getSettings(), f=>converted.push(f));
  const totalDuration = (performance.now() - totalStartTime) / 1000;
  zipBtn.disabled=converted.length === 0; updateStart();
  status.textContent = `Converted ${converted.length} file(s) in ${totalDuration.toFixed(2)}s.`;
});
document.getElementById('clear-button').addEventListener('click', ()=>{
  queue.clear(); queued=0; updateStart(); status.textContent='Converter ready. Please add files.'; converted.length=0; zipBtn.disabled=true;
});
document.getElementById('download-all').addEventListener('click', async ()=>{
  if(!converted.length) return;
  const JSZip = await getJSZip();
  const zip=new JSZip(); for(const f of converted){ zip.file(f.name, await f.blob.arrayBuffer()); }
  const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='converted-webp.zip'; a.click(); a.remove(); URL.revokeObjectURL(url);
});