import { setupUI, setPlaceholderThumbnail, setItemThumbnail, setItemMeta } from './modules/ui.js';
import { initFFmpeg, convertToWebP } from './modules/ffmpegClient.js';
import { createConversionQueue } from './modules/queueManager.js';
import { getGifInfo } from './modules/gifInfo.js';

const dropzone=document.getElementById('dropzone'); const fileInput=document.getElementById('fileInput');
const startBtn=document.getElementById('start-button'); const clearBtn=document.getElementById('clear-button'); const zipBtn=document.getElementById('download-all'); const status=document.getElementById('converter-status');
let ffmpeg=null, ffmpegReady=false, queued=0; const converted=[];

// Map originals to UI ids for timing + resolution
const fileToId = new WeakMap();

// Attempt to find the queue item's DOM node with several selector strategies, retrying briefly.
async function waitForItemEl(id, timeout=1200) {
  const start = performance.now();
  const sel = (id) => [
    `[data-id="${id}"]`,
    `#item-${id}`,
    `#queue-item-${id}`,
    `#result-${id}`,
    `[data-item-id="${id}"]`,
    `[data-key="${id}"]`,
    `.queue-item[data-id="${id}"]`
  ];
  while (performance.now() - start < timeout) {
    for (const s of sel(id)) {
      const el = document.querySelector(s);
      if (el) return el;
    }
    await new Promise(r => setTimeout(r, 50));
  }
  return null;
}

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
    quality: parseInt(document.getElementById('quality').value,10)||90,
    compressionLevel: parseInt(document.getElementById('compression-level').value,10)||6,
    loop: document.getElementById('loop-toggle').checked,
    still: document.getElementById('still-toggle').checked,
    lossless: document.getElementById('lossless-toggle').checked,
    mixed: document.getElementById('mixed-toggle').checked
  };
}
function updateStart(){ startBtn.disabled = !(ffmpegReady && queued>0); }
(async()=>{
  try{
    ffmpeg=await initFFmpeg();
    ffmpegReady=true; status.textContent='Converter ready. Please add files.'; updateStart();
  }catch(e){ console.error(e); status.textContent='Error loading converter engine. Ensure vendor/ffmpeg contains loader chunks and core-mt UMD; use node server.cjs.'; }
})();

// Wrap conversion so we can time per-file and update UI around it
const queue=createConversionQueue(async (file,ctx)=> {
  const id = fileToId.get(file);
  if (id!=null && window.UIExt?.markFileStartById) window.UIExt.markFileStartById(id);
  const t0 = performance.now();
  const out = await convertToWebP(ffmpeg,file,ctx.settings,ctx.onProgress);
  const elapsed = performance.now() - t0;
  if (id!=null && window.UIExt?.markFileCompleteById) window.UIExt.markFileCompleteById(id, elapsed);
  return out;
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
  const items=await queue.add(files); queued+=items.length; updateStart();
  for(const it of items){
    // Map file to id so our conversion wrapper can locate its UI
    fileToId.set(it.file, it.id);

    setPlaceholderThumbnail(it.id);

    // Populate resolution in UI (closest to thumbnail, before FPS)
    try {
      const el = await waitForItemEl(it.id, 1500);
      if (el && window.UIExt?.populateResolutionUI) {
        await window.UIExt.populateResolutionUI(el, it.file);
      } else if (window.UIExt?.populateResolutionUIById) {
        await window.UIExt.populateResolutionUIById(it.id, it.file);
      }
    } catch {}

    // Existing metadata (fps/duration/etc) via gifInfo -> ui module; leave as-is
    getGifInfo(it.file).then(info=>setItemMeta(it.id,info)).catch(()=>{});

    // Build a small PNG thumb
    try{
      const url=URL.createObjectURL(it.file); const img=new Image(); img.src=url; await img.decode();
      const size=128; const ratio=(img.width||1)/(img.height||1); const w=Math.min(size,img.width||size); const h=Math.round(w/ratio);
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
  // Batch timer start (aggregate)
  if (window.UIExt?.markBatchStart) window.UIExt.markBatchStart(queued);
  const JSZip = await getJSZip();
  await queue.run(()=>getSettings(), f=>{ converted.push(f); if (window.UIExt?.markBatchOneDone) window.UIExt.markBatchOneDone(); });
  zipBtn.disabled=false; updateStart();
});

document.getElementById('clear-button').addEventListener('click', ()=>{
  queue.clear(); queued=0; updateStart(); status.textContent='Converter ready. Please add files.'; converted.length=0; zipBtn.disabled=true;
});

document.getElementById('download-all').addEventListener('click', async ()=>{
  if(!converted.length) return;
  const JSZip = await getJSZip();
  const zip=new JSZip(); for(const f of converted){ zip.file(f.name, await f.blob.arrayBuffer()); }
  const blob=await zip.generateAsync({type:'blob'}); const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download='converted_webp_files.zip'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
});
