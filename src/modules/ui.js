
export function setupUI(dropzone, fileInput){
  const q=document.getElementById('quality'), qv=document.getElementById('quality-value');
  const cl=document.getElementById('compression-level'), clv=document.getElementById('compression-level-value');
  const loss=document.getElementById('lossless-toggle'), mix=document.getElementById('mixed-toggle');
  const loop=document.getElementById('loop-toggle'), still=document.getElementById('still-toggle');
  q.addEventListener('input',()=>{ qv.textContent=String(q.value) });
  cl.addEventListener('input',()=>{ clv.textContent=String(cl.value) });
  function sync(){ mix.disabled=loss.checked; if(loss.checked) mix.checked=false; still.disabled=loop.checked; if(loop.checked) still.checked=false; }
  loss.addEventListener('change',sync); loop.addEventListener('change',sync); sync();

  ['dragenter','dragover','dragleave','drop'].forEach(n=>{ dropzone.addEventListener(n,e=>e.preventDefault(),false); document.body.addEventListener(n,e=>e.preventDefault(),false); });
  ['dragenter','dragover'].forEach(n=>dropzone.addEventListener(n,()=>dropzone.classList.add('dropzone-active')));
  ['dragleave','drop'].forEach(n=>dropzone.addEventListener(n,()=>dropzone.classList.remove('dropzone-active')));
  const close=document.getElementById('ffmpeg-banner-close'); if(close) close.addEventListener('click',()=>{ const b=document.getElementById('ffmpeg-banner'); if(b) b.style.display='none'; });
}
export function getSettings(){ return {
  quality: parseInt(document.getElementById('quality').value,10)||90,
  compressionLevel: parseInt(document.getElementById('compression-level').value,10)||6,
  loop: document.getElementById('loop-toggle').checked,
  still: document.getElementById('still-toggle').checked,
  lossless: document.getElementById('lossless-toggle').checked,
  mixed: document.getElementById('mixed-toggle').checked
};}
export function addQueuedItem(id,name,size){
  const r=document.getElementById('results'); const card=document.createElement('div'); card.className='card'; card.id='item-'+id;
  card.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
    <div style="display:flex;align-items:center;gap:12px;min-width:220px;">
      <img id="thumb-${id}" alt="thumbnail" style="width:64px;height:64px;border-radius:8px;object-fit:cover;background:#1f2937;border:1px solid #273244"/>
      <div><div style="font-weight:600">${name}</div><div style="color:#94a3b8;font-size:14px">${(size/1024).toFixed(1)} KB</div><div id="meta-${id}" style="color:#94a3b8;font-size:12px;margin-top:2px"></div></div>
    </div><div id="status-${id}" style="color:#fbbf24;font-weight:600">Queued</div></div>
    <div style="margin-top:10px;width:100%;background:#1f2937;height:8px;border-radius:6px;overflow:hidden"><div id="bar-${id}" style="height:8px;width:0%;background:#3b82f6"></div></div>
    <div id="actions-${id}" style="margin-top:10px"></div>`;
  r.appendChild(card);
}
export function setPlaceholderThumbnail(id){
  const img=document.getElementById('thumb-'+id); if(!img) return;
  const c=document.createElement('canvas'); c.width=64; c.height=64; const ctx=c.getContext('2d'); ctx.fillStyle='#1f2937'; ctx.fillRect(0,0,64,64); img.src=c.toDataURL('image/png');
}
export function setItemThumbnail(id,url){ const img=document.getElementById('thumb-'+id); if(img) img.src=url; }
export function setItemMeta(id,info){ const m=document.getElementById('meta-'+id); if(!m) return; const fps=info.fps?info.fps.toFixed(2)+' fps':'—'; const fr=info.frames?String(info.frames).padStart(4,'0'):'0000'; const kind=info.animated?'animation sequence':'still image'; m.textContent=`${fps} • ${fr} frames • ${kind}`; }
export function updateItemProgress(id,ratio){ const b=document.getElementById('bar-'+id), s=document.getElementById('status-'+id); if(b) b.style.width=Math.round(ratio*100)+'%'; if(s){ s.textContent='Processing '+Math.round(ratio*100)+'%'; s.style.color='#60a5fa'; } }
export function setItemConverted(id,blob,name){ const s=document.getElementById('status-'+id), b=document.getElementById('bar-'+id), a=document.getElementById('actions-'+id); if(b) b.style.width='100%'; if(s){ s.textContent='Converted'; s.style.color='#22c55e'; } if(a){ const link=document.createElement('a'); link.textContent='Download'; link.href=URL.createObjectURL(blob); link.download=name; link.className='text-blue-400 font-semibold hover:underline mr-3'; a.innerHTML=''; a.appendChild(link);} }
export function setItemError(id,msg){ const s=document.getElementById('status-'+id); if(s){ s.textContent=msg||'Error'; s.style.color='#ef4444'; } }
export function showBanner(){ const b=document.getElementById('ffmpeg-banner'); if(b) b.style.display='flex'; const p=document.getElementById('ffmpeg-banner-progress'); if(p) p.style.display='block'; }
export function hideBanner(){ const b=document.getElementById('ffmpeg-banner'); if(b) b.style.display='none'; }
export function setBannerFileStep(step,total,label){ const sub=document.getElementById('ffmpeg-banner-sub'); if(!sub)return; sub.dataset.step=String(step); sub.dataset.total=String(total); sub.dataset.label=label; sub.textContent=`${label} — 0% (${step-1}/${total} complete)`; }
export function updateBannerProgress(pct){ const bar=document.getElementById('ffmpeg-banner-progress-bar'); if(bar) bar.style.width=Math.round(pct)+'%'; const sub=document.getElementById('ffmpeg-banner-sub'); if(sub){ const step=parseInt(sub.dataset.step||'0',10); const total=parseInt(sub.dataset.total||'3',10); const lbl=sub.dataset.label||'Downloading…'; const done=Math.max(0,step-1); sub.textContent=`${lbl} — ${Math.round(pct)}% (${done}/${total} complete)`; } }
