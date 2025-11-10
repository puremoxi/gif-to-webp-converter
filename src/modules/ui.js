export function setupUI(dropzone, fileInput){
  const q=document.getElementById('quality'), qv=document.getElementById('quality-value');
  const cl=document.getElementById('compression-level'), clv=document.getElementById('compression-level-value');
  const loss=document.getElementById('lossless-toggle'), mix=document.getElementById('mixed-toggle');
  const loop=document.getElementById('loop-toggle'), still=document.getElementById('still-toggle');

  q.addEventListener('input',()=>{ qv.textContent=String(q.value) });
  cl.addEventListener('input',()=>{ clv.textContent=String(cl.value) });

  function sync(){ mix.disabled=loss.checked; if(loss.checked) mix.checked=false; still.disabled=loop.checked; if(loop.checked) still.checked=false; }
  loss.addEventListener('change',sync); loop.addEventListener('change',sync); sync();

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
    bannerCtl.hide();
  });
}
function fmtSize(b){ if(b<1024) return b+' B'; if(b<1024*1024) return (b/1024).toFixed(1)+' KB'; return (b/1024/1024).toFixed(1)+' MB'; }
function escape(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
export function addQueuedItem(id, name, size){
  const el=document.createElement('div'); el.id=id; el.className='p-3 rounded-lg bg-gray-800/70 border border-gray-700/70';
  el.innerHTML = `
<div class="grid grid-cols-[1fr,auto] gap-3 items-center">
  <div>
    <div id="name-${id}" class="truncate font-semibold text-gray-200" title="${escape(name)}">${escape(name)}</div>
    <div class="flex items-center gap-3">
      <span id="status-${id}" class="text-sm text-amber-400">Queued</span>
      <div class="w-full bg-gray-700 rounded h-1.5 border border-gray-900/50"><div id="bar-${id}" class="bg-blue-500 h-full rounded-sm" style="width:0%"></div></div>
    </div>
    <div id="time-${id}" class="text-xs text-gray-500 mt-0.5"></div>
  </div>
  <div class="text-sm text-gray-400 grid grid-cols-[auto,auto,auto,auto] gap-x-3 gap-y-0.5 items-center">
    <span id="res-${id}">—</span>
    <span>${fmtSize(size)}</span>
    <span id="fps-${id}">—</span>
    <span id="frames-${id}">—</span>
  </div>
  <div class="flex items-center justify-end gap-3" id="actions-${id}">
    <button id="del-${id}" class="text-gray-500 hover:text-red-500 text-lg leading-none" title="Remove">✕</button>
  </div>
</div>`;
  document.getElementById('results').appendChild(el);
  document.getElementById('del-'+id).addEventListener('click', ()=>el.remove());
}
export function setPlaceholderThumbnail(id){
  const c=document.createElement('canvas'); c.width=64; c.height=64;
  const ctx=c.getContext('2d'); ctx.fillStyle='#4b5563'; ctx.fillRect(0,0,64,64);
  setItemThumbnail(id, c.toDataURL());
}
export function setItemThumbnail(id,url){
  const el=document.getElementById('name-'+id);
  if(el){
    const img=new Image(64,64); img.src=url; img.className='w-16 h-16 rounded-md object-contain bg-gray-700/50';
    el.parentElement.parentElement.classList.replace('grid-cols-[1fr,auto]','grid-cols-[auto,1fr,auto]');
    el.parentElement.parentElement.prepend(img);
  }
}
export function setItemMeta(id,meta){
  const fps=document.getElementById('fps-'+id), frames=document.getElementById('frames-'+id);
  if(fps) fps.textContent = meta.fps ? `${meta.fps} fps` : '—';
  if(frames) frames.textContent = meta.frames ? `${meta.frames} fr` : '—';
}
export function setItemResolution(id, w, h) {
  const el = document.getElementById(`res-${id}`);
  if (el) el.textContent = `${w}\u00D7${h}`;
}
export function updateItemProgress(id,ratio){
  const s=document.getElementById('status-'+id), b=document.getElementById('bar-'+id);
  if(b) b.style.width=Math.round(ratio*100)+'%';
  if(s && s.textContent==='Queued'){ s.textContent='Processing…'; s.classList.remove('text-amber-400'); s.classList.add('text-blue-400'); }
}
export function setItemConverted(id,blob,name, duration){
  const s=document.getElementById('status-'+id), b=document.getElementById('bar-'+id), a=document.getElementById('actions-'+id);
  const t = document.getElementById(`time-${id}`);
  if(b) b.style.width='100%';
  if(s){ s.textContent='Converted'; s.classList.remove('text-blue-400'); s.classList.add('text-green-500'); }
  if(a){ const link=document.createElement('a'); link.textContent='Download'; link.href=URL.createObjectURL(blob); link.download=name; link.className='text-blue-400 font-semibold hover:underline mr-3'; a.innerHTML=''; a.appendChild(link); }
  if (t) { t.textContent = `Done in ${duration.toFixed(2)}s`; t.classList.add('text-green-400'); }
}
export function setItemError(id,msg, duration){
  const s=document.getElementById('status-'+id);
  const t = document.getElementById(`time-${id}`);
  if(s){ s.textContent=msg||'Error'; s.classList.remove('text-blue-400','text-amber-400'); s.classList.add('text-red-500'); }
  if (t) { t.textContent = `${msg||'Error'} in ${duration.toFixed(2)}s`; t.classList.add('text-red-400'); }
}
export const bannerCtl = {
  show(){ document.getElementById('ffmpeg-banner')?.classList.remove('hidden'); },
  hide(){ document.getElementById('ffmpeg-banner')?.classList.add('hidden'); },
  step(step,total,label){
    const f=document.getElementById('ffmpeg-banner-file');
    const c=document.getElementById('ffmpeg-banner-count');
    const bar=document.getElementById('ffmpeg-banner-bar');
    if(f) f.textContent=label;
    if(c) c.textContent=`${step} / ${total} complete`;
    if(bar) pct(step/total*100);
  },
};
export function pct(p){
  const bar=document.getElementById('ffmpeg-banner-bar');
  if(bar) bar.style.width = `${Math.max(0,Math.min(100,p))}%`;
}