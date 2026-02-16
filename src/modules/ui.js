export function setupUI(dropzone, fileInput){
  const q=document.getElementById('quality'), qv=document.getElementById('quality-value');
  const cl=document.getElementById('compression-level'), clv=document.getElementById('compression-level-value');
  const loss=document.getElementById('lossless-toggle'), mix=document.getElementById('mixed-toggle');
  const loop=document.getElementById('loop-toggle'), still=document.getElementById('still-toggle');
  const resizeToggle=document.getElementById('resize-toggle'), resizeWidth=document.getElementById('resize-width');

  q.addEventListener('input',()=>{ qv.textContent=String(q.value) });
  cl.addEventListener('input',()=>{ clv.textContent=String(cl.value) });

  function sync(){
    mix.disabled=loss.checked; if(loss.checked) mix.checked=false;
    still.disabled=loop.checked; if(loop.checked) still.checked=false;
    if (resizeToggle && resizeWidth) resizeWidth.disabled = !resizeToggle.checked;
  }
  loss.addEventListener('change',sync); loop.addEventListener('change',sync); sync();
  resizeToggle?.addEventListener('change', sync);
  resizeWidth?.addEventListener('change', ()=>{
    const value = parseInt(resizeWidth.value, 10);
    if (!Number.isFinite(value) || value < 1) {
      resizeWidth.value = '1';
      return;
    }
    resizeWidth.value = String(value);
  });

  ['dragenter','dragover','dragleave','drop'].forEach(n=>{
    dropzone.addEventListener(n,e=>e.preventDefault(),false);
    document.body.addEventListener(n,e=>e.preventDefault(),false);
  });
  ['dragenter','dragover'].forEach(n=>dropzone.addEventListener(n,()=>dropzone.classList.add('dropzone-active')));
  ['dragleave','drop'].forEach(n=>dropzone.addEventListener(n,()=>dropzone.classList.remove('dropzone-active')));

  document.getElementById('tw-banner-close')?.addEventListener('click', ()=>{
    document.getElementById('tw-banner')?.classList.add('hidden');
  });
  document.getElementById('ffmpeg-banner-close')?.addEventListener('click', ()=>{
    document.getElementById('ffmpeg-banner')?.classList.add('hidden');
  });
}
export function addQueuedItem(id,name,size){
  const r=document.getElementById('results');
  const card=document.createElement('div');
  card.className='bg-slate-900/70 border border-slate-700 rounded-xl p-3 space-y-2';
  card.id='item-'+id;
  card.innerHTML=`
    <div class="flex justify-between items-center gap-3 flex-wrap">
      <div class="flex items-center gap-3 min-w-[220px]">
        <img id="thumb-${id}" alt="thumbnail" class="w-16 h-16 rounded-lg object-cover bg-gray-800 border border-slate-700"/>
        <div>
          <div class="font-semibold">${name}</div>
          <div class="text-slate-400 text-sm">${(size/1024).toFixed(1)} KB</div>
          <div id="meta-${id}" class="text-slate-400 text-xs mt-0.5"></div>
        </div>
      </div>
      <div id="status-${id}" class="text-amber-400 font-semibold">Queued</div>
    </div>
    <div class="mt-2 w-full bg-gray-800 h-2 rounded-md overflow-hidden">
      <div id="bar-${id}" class="h-2 w-0 bg-blue-500"></div>
    </div>
    <div id="actions-${id}" class="mt-2"></div>`;
  r.appendChild(card);
}
export function setPlaceholderThumbnail(id){
  const img=document.getElementById('thumb-'+id); if(!img) return;
  const c=document.createElement('canvas'); c.width=64; c.height=64; const ctx=c.getContext('2d'); ctx.fillStyle='#1f2937'; ctx.fillRect(0,0,64,64); img.src=c.toDataURL('image/png');
}
export function setItemThumbnail(id,url){ const img=document.getElementById('thumb-'+id); if(img) img.src=url; }
export function setItemMeta(id,info){ const m=document.getElementById('meta-'+id); if(!m) return; const fps=info.fps?info.fps.toFixed(2)+' fps':'—'; const fr=info.frames?String(info.frames).padStart(4,'0'):'0000'; const kind=info.animated?'animation sequence':'still image'; m.textContent=`${fps} • ${fr} frames • ${kind}`; }
export function updateItemProgress(id,ratio){
  const b=document.getElementById('bar-'+id), s=document.getElementById('status-'+id);
  if(b) b.style.width=Math.round(ratio*100)+'%';
  if(s){ s.textContent='Processing '+Math.round(ratio*100)+'%'; s.classList.remove('text-amber-400'); s.classList.add('text-blue-400'); }
}
export function setItemConverted(id,blob,name){
  const s=document.getElementById('status-'+id), b=document.getElementById('bar-'+id), a=document.getElementById('actions-'+id);
  if(b) b.style.width='100%';
  if(s){ s.textContent='Converted'; s.classList.remove('text-blue-400'); s.classList.add('text-green-500'); }
  if(a){
    let link = a.querySelector('a[download]');
    if (!link) {
      link=document.createElement('a');
      link.textContent='Download';
      link.className='text-blue-400 font-semibold hover:underline mr-3';
    }
    link.href=URL.createObjectURL(blob);
    link.download=name;
    const remove = a.querySelector('.remove-link');
    if (remove) a.insertBefore(link, remove); else a.appendChild(link);
  }
}
export function setItemError(id,msg){
  const s=document.getElementById('status-'+id);
  if(s){ s.textContent=msg||'Error'; s.classList.remove('text-blue-400','text-amber-400'); s.classList.add('text-red-500'); }
}
export const bannerCtl = {
  show(){ document.getElementById('ffmpeg-banner')?.classList.remove('hidden'); },
  hide(){ document.getElementById('ffmpeg-banner')?.classList.add('hidden'); },
  step(step,total,label){
    const f=document.getElementById('ffmpeg-banner-file');
    const c=document.getElementById('ffmpeg-banner-count');
    const bar=document.getElementById('ffmpeg-banner-bar');
    if(f) f.textContent=label;
    if(c) c.textContent=`${(step-1<0?0:step-1)} / ${total} complete`;
    if(bar) bar.style.width='0%';
  }
};
export function pct(p){ const bar=document.getElementById('ffmpeg-banner-bar'); if(bar) bar.style.width=Math.round(p)+'%'; }
