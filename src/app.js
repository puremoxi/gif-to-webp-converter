import { setupUI, setPlaceholderThumbnail, setItemThumbnail, setItemMeta } from './modules/ui.js';
import { initFFmpeg, convertToWebP } from './modules/ffmpegClient.js';
import { createConversionQueue } from './modules/queueManager.js';
import { getGifInfo } from './modules/gifInfo.js';

const dropzone=document.getElementById('dropzone'); const fileInput=document.getElementById('fileInput');
const startBtn=document.getElementById('start-button'); const clearBtn=document.getElementById('clear-button'); const zipBtn=document.getElementById('download-all'); const status=document.getElementById('converter-status');
let ffmpeg=null, ffmpegReady=false, queued=0; const converted=[];

const removedIds = new Set();
const fileToId = new WeakMap();

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

status.textContent='Ready. Please add files.';

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
    ffmpegReady=true; status.textContent='Ready. Please add files.'; updateStart();
  }catch(e){ console.error(e); status.textContent='Error loading converter engine. Ensure vendor/ffmpeg contains loader chunks and core-mt UMD; use node server.cjs.'; }
})();

const queue=createConversionQueue(async (file,ctx)=> {
  const id = fileToId.get(file);
  if (removedIds.has(id)) {
    return { skipped: true, blob: null, name: null };
  }
  const out = await convertToWebP(ffmpeg,file,ctx.settings,ctx.onProgress);
  converted.push(out);
  try {
    const el = await waitForItemEl(id, 1500);
    if (el && window.UIExt?.writeSizeSummaryByEls) {
      window.UIExt.writeSizeSummaryByEls(el, file.size, out.blob.size);
    }
    // ensure per-file Download link has timestamped filename
    if (el && window.UIExt?.updatePerFileDownloadName) {
      // out.name should be the final filename (.webp). We'll use that as base.
      window.UIExt.updatePerFileDownloadName(el, out.name || (file.name.replace(/\.[^.]+$/, '') + '.webp'));
    }
  } catch {}
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
    fileToId.set(it.file, it.id);
    setPlaceholderThumbnail(it.id);

    try {
      const el = await waitForItemEl(it.id, 1500);
      if (el && window.UIExt?.renderRemoveLink) {
        window.UIExt.renderRemoveLink(el, it.id, (id) => {
          removedIds.add(id);
          queued = Math.max(0, queued - 1);
          updateStart();
        });
      }
      if (el && window.UIExt?.populateFileSizeUI) window.UIExt.populateFileSizeUI(el, it.file);
      if (el && window.UIExt?.populateResolutionUI) await window.UIExt.populateResolutionUI(el, it.file);
    } catch {}

    getGifInfo(it.file)
      .then(async info => {
        setItemMeta(it.id, info);
        try {
          const el = await waitForItemEl(it.id, 1500);
          if (el && window.UIExt?.populateResolutionUI) await window.UIExt.populateResolutionUI(el, it.file);
        } catch {}
      })
      .catch(()=>{});

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
  if (window.UIExt?.hideAllRemoveLinks) window.UIExt.hideAllRemoveLinks();
  if (window.UIExt?.markBatchStart) window.UIExt.markBatchStart(queued);
  const JSZip = await getJSZip();
  await queue.run(()=>getSettings(), ()=>{ if (window.UIExt?.markBatchOneDone) window.UIExt.markBatchOneDone(); });
  zipBtn.disabled=false; updateStart();
});

document.getElementById('clear-button').addEventListener('click', ()=>{
  queue.clear(); queued=0; removedIds.clear(); updateStart(); status.textContent='Ready. Please add files.'; converted.length=0; zipBtn.disabled=true;
  const ag = document.getElementById('aggregate-time');
  if (ag) ag.textContent = '';
});

document.getElementById('download-all').addEventListener('click', async ()=>{
  if(!converted.length) return;
  const JSZip = await getJSZip();
  const zip=new JSZip(); for(const f of converted){ if (f?.blob) zip.file(f.name, await f.blob.arrayBuffer()); }
  const blob=await zip.generateAsync({type:'blob'}); const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=`converted_webp_files_${formatTimestamp()}.zip`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
});
