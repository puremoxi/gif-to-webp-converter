import { setupUI, getSettings, setPlaceholderThumbnail, setItemThumbnail, setItemMeta, showBanner, hideBanner, setBannerFileStep, updateBannerProgress } from './modules/ui.js';
import { initFFmpeg, convertToWebP } from './modules/ffmpegClient.js';
import { createConversionQueue } from './modules/queueManager.js';
import { getGifInfo } from './modules/gifInfo.js';

let ffmpeg=null, ffmpegReady=false, queued=0; const converted=[];
const dropzone=document.getElementById('dropzone'); const fileInput=document.getElementById('fileInput');
const startBtn=document.getElementById('start-button'); const clearBtn=document.getElementById('clear-button'); const zipBtn=document.getElementById('download-all'); const status=document.getElementById('converter-status');

setupUI(dropzone,fileInput);
function updateStart(){ startBtn.disabled = !(ffmpegReady && queued>0); }

(async()=>{
  try{
    ffmpeg=await initFFmpeg({
      onStart: ()=>{ showBanner(); },
      onFileStep: (step,total,label)=>setBannerFileStep(step,total,label),
      onProgress: (pct)=>updateBannerProgress(pct),
      onStatus: (msg)=>{ status.textContent=msg||'Converter ready.'; },
      onDone: ()=>{ hideBanner(); status.textContent='Converter ready. Please add files.'; }
    });
    ffmpegReady=true; updateStart();
  }catch(e){ console.error(e); status.textContent='Error loading converter engine. Please refresh.'; }
})();

const queue=createConversionQueue(async (file,ctx)=> convertToWebP(ffmpeg,file,ctx.settings,ctx.onProgress));

dropzone.addEventListener('drop', async e=>{ const files=Array.from(e.dataTransfer.files); await handle(files); });
['dragenter','dragover','dragleave'].forEach(n=>{ dropzone.addEventListener(n,e=>e.preventDefault()); document.body.addEventListener(n,e=>e.preventDefault()); });
dropzone.addEventListener('click',()=>fileInput.click());
fileInput.addEventListener('change', async ()=>{ const files=Array.from(fileInput.files); await handle(files); });

async function handle(files){
  const items=await queue.add(files); queued+=items.length; updateStart();
  for(const it of items){
    setPlaceholderThumbnail(it.id);
    getGifInfo(it.file).then(info=>setItemMeta(it.id,info)).catch(()=>{});
    // Quick canvas thumb (no FFmpeg dependency)
    try{
      const url=URL.createObjectURL(it.file); const img=new Image(); img.src=url; await img.decode();
      const size=128; const ratio=(img.width||1)/(img.height||1); const w=Math.min(size,img.width||size); const h=Math.round(w/ratio);
      const c=document.createElement('canvas'); c.width=w; c.height=h; c.getContext('2d').drawImage(img,0,0,w,h); URL.revokeObjectURL(url);
      const blob=await new Promise(res=>c.toBlob(res,'image/png')); if(blob) setItemThumbnail(it.id,URL.createObjectURL(blob));
    }catch{ /* keep placeholder */ }
  }
}

startBtn.addEventListener('click', async ()=>{
  startBtn.disabled=true;
  await queue.run(()=>getSettings(), f=>converted.push(f));
  zipBtn.disabled=false; updateStart();
});
clearBtn.addEventListener('click', ()=>{ queue.clear(); queued=0; updateStart(); status.textContent='Converter ready. Please add files.'; converted.length=0; zipBtn.disabled=true; });
zipBtn.addEventListener('click', async ()=>{
  if(!converted.length) return;
  const zip=new JSZip(); for(const f of converted){ zip.file(f.name, await f.blob.arrayBuffer()); }
  const blob=await zip.generateAsync({type:'blob'}); const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download='converted_webp_files.zip'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
});
