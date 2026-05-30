export function setupUI(dropzone, fileInput){
  const q=document.getElementById('quality'), qv=document.getElementById('quality-value');
  const qualityLabel=document.getElementById('quality-label');
  const cl=document.getElementById('compression-level'), clv=document.getElementById('compression-level-value');
  const loss=document.getElementById('lossless-toggle'), mix=document.getElementById('mixed-toggle');
  const loop=document.getElementById('loop-toggle'), still=document.getElementById('still-toggle');
  const loopLabel=document.getElementById('loop-label'), mixedLabel=document.getElementById('mixed-label'), losslessLabel=document.getElementById('lossless-label');
  const resizeWidth=document.getElementById('resize-width');
  const ncd=document.getElementById('no-change-dimensions-toggle'), ncdLabel=document.getElementById('ncd-label');
  const resizeWidthLabel=document.getElementById('resize-width-label');
  const maxWidthToggle=document.getElementById('max-width-toggle'), maxWidthToggleLabel=document.getElementById('max-width-toggle-label');
  const maxHeightToggle=document.getElementById('max-height-toggle'), maxHeightToggleLabel=document.getElementById('max-height-toggle-label');
  const resizeHeight=document.getElementById('resize-height'), resizeHeightLabel=document.getElementById('resize-height-label');
  const resizeHeightVal=document.getElementById('resize-height-value'), resizeWidthVal=document.getElementById('resize-width-value');
  const targetSizeToggle=document.getElementById('target-size-toggle'), targetSizeToggleLabel=document.getElementById('target-size-toggle-label');
  const targetSizeKb=document.getElementById('target-size-kb'), targetSizeLabel=document.getElementById('target-size-label');
  const targetSizeVal=document.getElementById('target-size-value');

  q.addEventListener('input',()=>{ qv.textContent=String(q.value) });
  cl.addEventListener('input',()=>{ clv.textContent=String(cl.value) });

  function syncNCD(){
    syncMaxWidth();
    syncMaxHeight();
  }
  function syncMaxWidth(){
    const ncdLocked = ncd?.checked;
    if(maxWidthToggle) maxWidthToggle.disabled = ncdLocked;
    if(maxWidthToggleLabel){
      maxWidthToggleLabel.style.color = ncdLocked ? '#64748b' : '';
      maxWidthToggleLabel.style.pointerEvents = ncdLocked ? 'none' : '';
    }
    const wLocked = ncdLocked || !maxWidthToggle?.checked;
    if(resizeWidth) resizeWidth.disabled = wLocked;
    if(resizeWidthVal){ resizeWidthVal.style.borderColor = wLocked ? '#334155' : '#64748b'; resizeWidthVal.style.color = wLocked ? '#475569' : '#cbd5e1'; }
    if(resizeWidthLabel){ resizeWidthLabel.style.color = wLocked ? '#64748b' : ''; resizeWidthLabel.style.pointerEvents = wLocked ? 'none' : ''; }
  }
  function syncMaxHeight(){
    const ncdLocked = ncd?.checked;
    if(maxHeightToggle) maxHeightToggle.disabled = ncdLocked;
    if(maxHeightToggleLabel){ maxHeightToggleLabel.style.color = ncdLocked ? '#64748b' : ''; maxHeightToggleLabel.style.pointerEvents = ncdLocked ? 'none' : ''; }
    const hLocked = ncdLocked || !maxHeightToggle?.checked;
    if(resizeHeight) resizeHeight.disabled = hLocked;
    if(resizeHeightVal){ resizeHeightVal.style.borderColor = hLocked ? '#334155' : '#64748b'; resizeHeightVal.style.color = hLocked ? '#475569' : '#cbd5e1'; }
    if(resizeHeightLabel){ resizeHeightLabel.style.color = hLocked ? '#64748b' : ''; resizeHeightLabel.style.pointerEvents = hLocked ? 'none' : ''; }
  }
  function syncTargetSize(){
    const tsLocked = !targetSizeToggle?.checked;
    if(targetSizeKb) targetSizeKb.disabled = tsLocked;
    if(targetSizeVal){ targetSizeVal.style.borderColor = tsLocked ? '#334155' : '#64748b'; targetSizeVal.style.color = tsLocked ? '#475569' : '#cbd5e1'; }
    if(targetSizeLabel){ targetSizeLabel.style.color = tsLocked ? '#64748b' : ''; targetSizeLabel.style.pointerEvents = tsLocked ? 'none' : ''; }
  }
  function lockEl(el, label, locked){
    if(el){ el.disabled = locked; }
    if(label){ label.style.color = locked ? '#64748b' : ''; label.style.pointerEvents = locked ? 'none' : ''; }
  }
  function syncQuality(){
    const locked = loss.checked;
    if(q) q.disabled = locked;
    if(qualityLabel){
      qualityLabel.style.color = locked ? '#64748b' : '';
      qualityLabel.style.pointerEvents = locked ? 'none' : '';
    }
    if(qv){
      qv.style.borderColor = locked ? '#334155' : '#64748b';
      qv.style.color = locked ? '#475569' : '#cbd5e1';
    }
  }
  function sync(){
    const lossLocked = loss.checked;
    if(lossLocked) mix.checked = false;
    lockEl(mix, mixedLabel, lossLocked);
    const mixLocked = mix.checked;
    if(mixLocked) loss.checked = false;
    lockEl(loss, losslessLabel, mixLocked);
    const stillLocked = still.checked;
    if(stillLocked) loop.checked = false;
    lockEl(loop, loopLabel, stillLocked);
    syncQuality();
  }
  loss.addEventListener('change',sync); mix.addEventListener('change',sync); still.addEventListener('change',sync); loop.addEventListener('change',sync); sync();
  ncd?.addEventListener('change', syncNCD); syncNCD();
  maxWidthToggle?.addEventListener('change', syncMaxWidth); syncMaxWidth();
  maxHeightToggle?.addEventListener('change', syncMaxHeight); syncMaxHeight();
  targetSizeToggle?.addEventListener('change', syncTargetSize); syncTargetSize();
  resizeHeight?.addEventListener('input', ()=>{ if(resizeHeightVal) resizeHeightVal.textContent = resizeHeight.value; });
  resizeWidth?.addEventListener('input', ()=>{ if(resizeWidthVal) resizeWidthVal.textContent = resizeWidth.value; });
  targetSizeKb?.addEventListener('input', ()=>{ if(targetSizeVal) targetSizeVal.textContent = targetSizeKb.value; });

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
