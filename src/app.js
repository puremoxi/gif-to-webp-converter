import { setupUI, setPlaceholderThumbnail, setItemThumbnail, setItemMeta } from './modules/ui.js';
import { initFFmpeg, convertToWebP } from './modules/ffmpegClient.js';
import { createConversionQueue } from './modules/queueManager.js';
import { getGifInfo } from './modules/gifInfo.js';

const dropzone=document.getElementById('dropzone'); const fileInput=document.getElementById('fileInput');
const startBtn=document.getElementById('start-button'); const clearBtn=document.getElementById('clear-button'); const zipBtn=document.getElementById('download-all'); const status=document.getElementById('converter-status');
let ffmpeg=null, ffmpegReady=false, queued=0; const converted=[];

// --- Small functional update: warn if Tailwind CSS missing/placeholder
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
// --------------------------------------------------------------------

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
async function handle(files){
  const items=await queue.add(files); queued+=items.length; updateStart();
  for(const it of items){
    setPlaceholderThumbnail(it.id);
    getGifInfo(it.file).then(info=>setItemMeta(it.id,info)).catch(()=>{});
    try{
      const url=URL.createObjectURL(it.file); const img=new Image(); img.src=url; await img.decode();
      const size=128; const ratio=(img.width||1)/(img.height||1); const w=Math.min(size,img.width||size); const h=Math.round(w/ratio);
      const c=document.createElement('canvas'); c.width=w; c.height=h; c.getContext('2d').drawImage(img,0,0,w,h); URL.revokeObjectURL(url);
      const blob=await new Promise(res=>c.toBlob(res,'image/png')); if(blob) setItemThumbnail(it.id,URL.createObjectURL(blob));
    }catch{}
  }
}
startBtn.addEventListener('click', async ()=>{
  startBtn.disabled=true;
  const { default: JSZip } = await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm');
  await queue.run(()=>getSettings(), f=>converted.push(f));
  zipBtn.disabled=false; updateStart();
});
document.getElementById('clear-button').addEventListener('click', ()=>{
  queue.clear(); queued=0; updateStart(); status.textContent='Converter ready. Please add files.'; converted.length=0; zipBtn.disabled=true;
});
document.getElementById('download-all').addEventListener('click', async ()=>{
  if(!converted.length) return;
  const { default: JSZip } = await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm');
  const zip=new JSZip(); for(const f of converted){ zip.file(f.name, await f.blob.arrayBuffer()); }
  const blob=await zip.generateAsync({type:'blob'}); const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download='converted_webp_files.zip'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
});
