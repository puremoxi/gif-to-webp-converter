import { convertToWebP, getFFmpeg } from './ffmpegClient.js';
import { readGifMeta } from './gifInfo.js';
let queue=[], processing=false;

export function setupUI(){
  const dz=document.getElementById('dropzone'); const fi=document.getElementById('fileInput');
  dz.addEventListener('click',()=>fi.click());
  ['dragenter','dragover','dragleave','drop'].forEach(e=>dz.addEventListener(e,ev=>ev.preventDefault()));
  dz.addEventListener('drop',e=>handleFiles(e.dataTransfer.files));
  fi.addEventListener('change',e=>handleFiles(e.target.files));
}

function handleFiles(files){
  const list=document.getElementById('file-list');
  for(const file of files){ if(file.type!=='image/gif') continue;
    const id='f-'+Math.random().toString(36).slice(2);
    const row=document.createElement('div'); row.id=id; row.className='bg-gray-800 border border-gray-700 rounded p-3';
    row.innerHTML=`<div class='flex items-center gap-3'>
      <div class='w-20 h-20 bg-gray-700 rounded overflow-hidden flex items-center justify-center'><img class='max-w-full max-h-full hidden' alt='thumb'></div>
      <div class='flex-1'>
        <div class='font-semibold text-sm truncate'>${file.name}</div>
        <div class='text-xs text-gray-400 space-x-3'>
          <span id='${id}-status'>Queued</span><span>|</span>
          <span id='${id}-res'>res: —</span><span>|</span>
          <span id='${id}-fps'>fps: —</span><span>|</span>
          <span id='${id}-frames'>frames: —</span>
        </div>
        <div class='w-full bg-gray-700 rounded h-1 mt-2'><div id='${id}-bar' class='bg-blue-500 h-1 rounded' style='width:0%'></div></div>
      </div>
      <div><a id='${id}-dl' class='hidden text-sm px-2 py-1 bg-green-600 rounded'>Download</a></div>
    </div>`;
    list.appendChild(row); queue.push({id,file,state:'queued'});
    const img=row.querySelector('img'); const url=URL.createObjectURL(file); img.src=url; img.onload=()=>img.classList.remove('hidden');
    readGifMeta(file).then(m=>{
      document.getElementById(id+'-res').textContent=(m.width&&m.height)?`${m.width}×${m.height}`:'res: —';
      document.getElementById(id+'-fps').textContent=`fps: ${m.fps??'—'}`;
      document.getElementById(id+'-frames').textContent=`frames: ${m.frames??'—'}`;
    }).catch(()=>{});
  }
  updateButtons();
}

export function wireStart(){
  document.getElementById('start-button').addEventListener('click', async ()=>{
    if(processing) return; processing=true; updateButtons();
    const ffmpeg=getFFmpeg();
    for(const item of queue){ if(item.state!=='queued') continue;
      const bar=document.getElementById(item.id+'-bar'); const stat=document.getElementById(item.id+'-status');
      stat.textContent='Processing…';
      try{
        const out=await convertToWebP(ffmpeg,item.file,{},p=>{bar.style.width=(p*100).toFixed(0)+'%';});
        stat.textContent='Converted';
        const a=document.getElementById(item.id+'-dl'); a.href=URL.createObjectURL(out.blob); a.download=out.name; a.classList.remove('hidden'); item.state='done';
      }catch(e){ console.error(e); stat.textContent='Error'; item.state='error'; }
      finally{ bar.style.width='100%'; }
    }
    processing=false; updateButtons();
  });
}

export function wireZip(){
  document.getElementById('zip-button').addEventListener('click', async ()=>{
    const path='/vendor/jszip/jszip.min.js';
    const ok=await fetch(path,{method:'HEAD'}).then(r=>r.ok).catch(()=>false);
    if(!ok){ alert('JSZip not found. See README.'); return; }
    await new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=path; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
    const JSZip=window.JSZip; const zip=new JSZip();
    const done=queue.filter(q=>q.state==='done'); if(!done.length){ alert('No converted files'); return; }
    for(const d of done){ const a=document.getElementById(d.id+'-dl'); const blob=await fetch(a.href).then(r=>r.blob()); zip.file(a.download||'file.webp', blob); }
    const zipBlob=await zip.generateAsync({type:'blob'}); const url=URL.createObjectURL(zipBlob); const a=document.createElement('a'); a.href=url; a.download='converted-webp.zip'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });
}

export function wireClear(){ document.getElementById('clear-button').addEventListener('click',()=>{ queue=[]; document.getElementById('file-list').innerHTML=''; updateButtons(); }); }

function updateButtons(){ const hasQueued=queue.some(q=>q.state==='queued'); document.getElementById('start-button').disabled=!hasQueued||!window.__ffmpegReady; }
