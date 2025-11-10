
import { setupUI, setPlaceholderThumbnail, setItemThumbnail, setItemMeta, wireSaveButtons } from './modules/ui.js';
import { initFFmpeg, convertToWebP } from './modules/ffmpegClient.js';
import { createConversionQueue } from './modules/queueManager.js';
import { getGifInfo } from './modules/gifInfo.js';

const dropzone=document.getElementById('dropzone');
const fileInput=document.getElementById('fileInput');
const startBtn=document.getElementById('start-button');
const clearBtn=document.getElementById('clear-button');
const zipBtn=document.getElementById('download-all');
const status=document.getElementById('converter-status');

let ffmpeg=null, ffmpegReady=false, queued=0;
const converted=[];

// Tailwind self-host check
(async () => {
  try{
    const r = await fetch('/vendor/css/tailwind.css', { cache: 'no-store' });
    if(!r.ok){ document.getElementById('tw-banner')?.classList.remove('hidden'); }
    else{
      const text = await r.text();
      if(/Built by: npm run build:css/i.test(text) || text.trim().length < 64){
        document.getElementById('tw-banner')?.classList.remove('hidden');
      }
    }
  }catch{
    document.getElementById('tw-banner')?.classList.remove('hidden');
  }
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
    ffmpegReady=true;
    status.textContent='Converter ready. Please add files.';
    updateStart();
  }catch(e){
    console.error(e);
    status.textContent='Error loading converter engine. Ensure vendor/ffmpeg contains loader chunks and core-mt UMD; use node server.cjs.';
  }
})();

const queue=createConversionQueue(async (file,ctx)=> convertToWebP(ffmpeg,file,ctx.settings,ctx.onProgress));

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

async function getDimensions(file){
  return new Promise((resolve)=>{
    try{
      const url=URL.createObjectURL(file);
      const img=new Image();
      img.onload=()=>{
        const w=img.naturalWidth||img.width; const h=img.naturalHeight||img.height;
        URL.revokeObjectURL(url);
        resolve({width:w,height:h});
      };
      img.onerror=()=>{
        URL.revokeObjectURL(url);
        resolve({width:0,height:0});
      };
      img.src=url;
    }catch{
      resolve({width:0,height:0});
    }
  });
}

async function handle(files){
  const items=await queue.add(files);
  queued+=items.length; updateStart();

  for(const it of items){
    setPlaceholderThumbnail(it.id);

    Promise.allSettled([ getGifInfo(it.file), getDimensions(it.file) ]).then(results=>{
      const info = results[0].status==='fulfilled' ? results[0].value : {frames:0,animated:false,fps:0};
      const dim  = results[1].status==='fulfilled' ? results[1].value : {width:0,height:0};
      setItemMeta(it.id, { ...info, ...dim });
    });

    try{
      const url=URL.createObjectURL(it.file);
      const img=new Image(); img.src=url;
      await img.decode();
      const size=128;
      const ratio=(img.width||1)/(img.height||1);
      const w=Math.min(size,img.width||size);
      const h=Math.round(w/ratio);
      const c=document.createElement('canvas'); c.width=w; c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      URL.revokeObjectURL(url);
      const blob=await new Promise(res=>c.toBlob(res,'image/png'));
      if(blob) setItemThumbnail(it.id,URL.createObjectURL(blob));
    }catch{}
  }
}

async function getJSZip(){
  try {
    const mod = await import('/vendor/jszip.mjs');
    return mod.default;
  } catch (e) {
    alert('JSZip not found. See README: place jszip.min.js at vendor/jszip and keep vendor/jszip.mjs.');
    throw e;
  }
}

async function saveFileWithPicker(blob, suggestedName){
  if ('showSaveFilePicker' in window) {
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [{ description: 'WebP Image', accept: { 'image/webp': ['.webp'] } }]
    });
    const ws = await handle.createWritable();
    await ws.write(blob); await ws.close(); return true;
  }
  return false;
}
async function saveZipWithPicker(blob, suggestedName){
  if ('showSaveFilePicker' in window) {
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [{ description: 'ZIP Archive', accept: { 'application/zip': ['.zip'] } }]
    });
    const ws = await handle.createWritable();
    await ws.write(blob); await ws.close(); return true;
  }
  return false;
}

startBtn.addEventListener('click', async ()=>{
  startBtn.disabled=true;
  await queue.run(()=>getSettings(), f=>converted.push(f));
  for(const f of converted){
    wireSaveButtons(f.id, f.blob, f.name, saveFileWithPicker);
  }
  zipBtn.disabled = converted.length === 0;
  updateStart();
});

clearBtn.addEventListener('click', ()=>{
  queue.clear(); queued=0; updateStart();
  status.textContent='Converter ready. Please add files.';
  converted.length=0; zipBtn.disabled=true;
});

zipBtn.addEventListener('click', async ()=>{
  if(!converted.length) return;
  const JSZip = await getJSZip();
  const zip=new JSZip();
  for(const f of converted){
    zip.file(f.name, await f.blob.arrayBuffer());
  }
  const blob=await zip.generateAsync({type:'blob'});
  const ok = await saveZipWithPicker(blob, 'converted_webp_files.zip');
  if (!ok) {
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='converted_webp_files.zip';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
});
