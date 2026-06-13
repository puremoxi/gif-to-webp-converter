export function setupUI(dropzone, fileInput){
  const enabledFontColor = '#64748b';
  const disabledFontColor = '#475569';
  const q=document.getElementById('quality'), qv=document.getElementById('quality-value');
  const qualityLabel=document.getElementById('quality-label');
  const cl=document.getElementById('compression-level'), clv=document.getElementById('compression-level-value');
  const loss=document.getElementById('lossless-toggle'), mix=document.getElementById('mixed-toggle');
  const loop=document.getElementById('loop-toggle');
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
  const outputFolderMode=document.getElementById('output-folder-mode');
  const outputFolderPicker=document.getElementById('output-folder-picker');
  const outputFormat=document.getElementById('output-format');

  function setValueBox(box, value) {
    if (!box) return;
    box.value = String(value);
  }
  function syncSliderAndValue(slider, valueBox) {
    if (!slider || !valueBox) return;
    const min = Number(slider.min);
    const max = Number(slider.max);
    const clamp = (value) => Math.min(max, Math.max(min, value));
    slider.addEventListener('input', () => setValueBox(valueBox, slider.value));
    valueBox.addEventListener('input', () => {
      if (valueBox.value === '') return;
      const next = Number(valueBox.value);
      if (!Number.isFinite(next)) return;
      slider.value = String(clamp(next));
      setValueBox(valueBox, slider.value);
    });
    valueBox.addEventListener('change', () => {
      const next = Number(valueBox.value);
      const clamped = Number.isFinite(next) ? clamp(next) : Number(slider.value);
      slider.value = String(clamped);
      setValueBox(valueBox, slider.value);
    });
    setValueBox(valueBox, slider.value);
  }
  syncSliderAndValue(q, qv);
  syncSliderAndValue(cl, clv);
  syncSliderAndValue(resizeHeight, resizeHeightVal);
  syncSliderAndValue(resizeWidth, resizeWidthVal);
  syncSliderAndValue(targetSizeKb, targetSizeVal);
  syncSliderAndValue(document.getElementById('anim-max-fps'), document.getElementById('anim-max-fps-value'));
  syncSliderAndValue(document.getElementById('anim-max-duration'), document.getElementById('anim-max-duration-value'));
  syncSliderAndValue(document.getElementById('exec-timeout-slider'), document.getElementById('exec-timeout-sec'));

  function syncOutputFolderMode() {
    if (!outputFolderMode || !outputFolderPicker) return;
    const selectMode = outputFolderMode.value === 'select';
    outputFolderPicker.hidden = !selectMode;
    outputFolderPicker.style.display = selectMode ? 'flex' : 'none';
    outputFolderPicker.querySelectorAll('input,button').forEach(el => {
      el.disabled = !selectMode;
    });
  }
  outputFolderMode?.addEventListener('change', syncOutputFolderMode);
  syncOutputFolderMode();

  function syncNCD(){
    syncMaxWidth();
    syncMaxHeight();
  }
  function syncMaxWidth(){
    const ncdLocked = ncd?.checked;
    if(maxWidthToggle) maxWidthToggle.disabled = ncdLocked;
    if(maxWidthToggleLabel){
      maxWidthToggleLabel.style.color = ncdLocked ? disabledFontColor : '';
      maxWidthToggleLabel.style.pointerEvents = ncdLocked ? 'none' : '';
    }
    const wLocked = ncdLocked || !maxWidthToggle?.checked;
    if(resizeWidth) resizeWidth.disabled = wLocked;
    if(resizeWidthVal){ resizeWidthVal.disabled = wLocked; resizeWidthVal.style.borderColor = wLocked ? '#334155' : '#64748b'; resizeWidthVal.style.color = wLocked ? disabledFontColor : enabledFontColor; }
    if(resizeWidthLabel){ resizeWidthLabel.style.color = wLocked ? disabledFontColor : ''; resizeWidthLabel.style.pointerEvents = wLocked ? 'none' : ''; }
  }
  function syncMaxHeight(){
    const ncdLocked = ncd?.checked;
    if(maxHeightToggle) maxHeightToggle.disabled = ncdLocked;
    if(maxHeightToggleLabel){ maxHeightToggleLabel.style.color = ncdLocked ? disabledFontColor : ''; maxHeightToggleLabel.style.pointerEvents = ncdLocked ? 'none' : ''; }
    const hLocked = ncdLocked || !maxHeightToggle?.checked;
    if(resizeHeight) resizeHeight.disabled = hLocked;
    if(resizeHeightVal){ resizeHeightVal.disabled = hLocked; resizeHeightVal.style.borderColor = hLocked ? '#334155' : '#64748b'; resizeHeightVal.style.color = hLocked ? disabledFontColor : enabledFontColor; }
    if(resizeHeightLabel){ resizeHeightLabel.style.color = hLocked ? disabledFontColor : ''; resizeHeightLabel.style.pointerEvents = hLocked ? 'none' : ''; }
  }
  function syncTargetSize(){
    const tsLocked = !targetSizeToggle?.checked;
    if(targetSizeKb) targetSizeKb.disabled = tsLocked;
    if(targetSizeVal){ targetSizeVal.disabled = tsLocked; targetSizeVal.style.borderColor = tsLocked ? '#334155' : '#64748b'; targetSizeVal.style.color = tsLocked ? disabledFontColor : enabledFontColor; }
    if(targetSizeLabel){ targetSizeLabel.style.color = tsLocked ? disabledFontColor : ''; targetSizeLabel.style.pointerEvents = tsLocked ? 'none' : ''; }
  }
  function lockEl(el, label, locked){
    if(el){ el.disabled = locked; }
    if(label){ label.style.color = locked ? disabledFontColor : ''; label.style.pointerEvents = locked ? 'none' : ''; }
  }
  function syncQuality(){
    const locked = loss.checked;
    if(q) q.disabled = locked;
    if(qualityLabel){
      qualityLabel.style.color = locked ? disabledFontColor : '';
      qualityLabel.style.pointerEvents = locked ? 'none' : '';
    }
    if(qv){
      qv.disabled = locked;
      qv.style.borderColor = locked ? '#334155' : '#64748b';
      qv.style.color = locked ? disabledFontColor : enabledFontColor;
    }
  }
  function sync(){
    const avifMode = outputFormat?.value === 'avif';
    if(avifMode) {
      loss.checked = false;
      mix.checked = false;
      loop.checked = false;
    }
    const lossLocked = loss.checked;
    if(lossLocked) mix.checked = false;
    lockEl(mix, mixedLabel, avifMode || lossLocked);
    const mixLocked = mix.checked;
    if(mixLocked) loss.checked = false;
    lockEl(loss, losslessLabel, avifMode || mixLocked);
    lockEl(loop, loopLabel, avifMode);
    syncQuality();
  }
  loss.addEventListener('change',sync); mix.addEventListener('change',sync); loop.addEventListener('change',sync); outputFormat?.addEventListener('change', sync); sync();
  ncd?.addEventListener('change', syncNCD); syncNCD();
  maxWidthToggle?.addEventListener('change', syncMaxWidth); syncMaxWidth();
  maxHeightToggle?.addEventListener('change', syncMaxHeight); syncMaxHeight();
  targetSizeToggle?.addEventListener('change', syncTargetSize); syncTargetSize();

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

function actionIconBase(el) {
  el.style.width = '17.5px';
  el.style.height = '17.5px';
  el.style.borderRadius = '5px';
  el.style.display = 'inline-flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.padding = '0';
  el.style.margin = '0';
  el.style.cursor = 'pointer';
  el.style.boxSizing = 'border-box';
  el.style.verticalAlign = 'middle';
}

function downloadIconSvg() {
  return '<svg width="12.5" height="12.5" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 1.5v7" stroke="#cbd5e1" stroke-width="1.4" stroke-linecap="round"/><path d="M4.3 6.4 7 9.1l2.7-2.7" stroke="#cbd5e1" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M2.2 11.3h9.6" stroke="#cbd5e1" stroke-width="1.4" stroke-linecap="round"/></svg>';
}

function copyIconSvg() {
  return '<svg width="12.5" height="12.5" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M5 3.2h5.3v7.6H5z" stroke="#cbd5e1" stroke-width="1.2" stroke-linejoin="round"/><path d="M3.7 9.7H2.4V1.9h5.4v1.3" stroke="#cbd5e1" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

async function convertBlobToPng(blob) {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d').drawImage(bitmap, 0, 0);
  bitmap.close?.();
  return new Promise((resolve, reject) => {
    canvas.toBlob((pngBlob) => {
      if (pngBlob) resolve(pngBlob);
      else reject(new Error('Could not prepare image for clipboard.'));
    }, 'image/png');
  });
}

async function copyBlobToClipboard(blob) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    throw new Error('Image clipboard copy is not supported by this browser.');
  }
  const type = blob.type || 'image/png';
  if (!ClipboardItem.supports || ClipboardItem.supports(type)) {
    try {
      await navigator.clipboard.write([new ClipboardItem({ [type]: blob })]);
      return;
    } catch {}
  }
  const pngBlob = await convertBlobToPng(blob);
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
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
          <div class="font-semibold" style="color:#94a3b8;">${name}</div>
          <div class="text-slate-400 text-sm" style="color:#64748b;">${(size/1024).toFixed(1)} KB</div>
          <div id="meta-${id}" class="text-slate-400 text-xs mt-0.5" style="color:#64748b;"></div>
        </div>
      </div>
      <div id="status-${id}" class="font-semibold" style="color:#94a3b8;">Queued</div>
    </div>
    <div class="mt-2 w-full bg-gray-800 h-2 rounded-md overflow-hidden">
      <div id="bar-${id}" class="h-2 w-0" style="background:#94a3b8;"></div>
    </div>
    <div id="actions-${id}" class="mt-2" style="display:flex;align-items:center;gap:4px;"></div>`;
  r.appendChild(card);
}
export function setPlaceholderThumbnail(id){
  const img=document.getElementById('thumb-'+id); if(!img) return;
  const c=document.createElement('canvas'); c.width=64; c.height=64; const ctx=c.getContext('2d'); ctx.fillStyle='#1f2937'; ctx.fillRect(0,0,64,64); img.src=c.toDataURL('image/png');
}
export function setItemThumbnail(id,url){ const img=document.getElementById('thumb-'+id); if(img) img.src=url; }
export function setItemMeta(id,info){
  const m=document.getElementById('meta-'+id); if(!m) return;
  const parts=[];
  if(info.width && info.height) parts.push(`${info.width} × ${info.height}`);
  if(info.fps) parts.push(info.fps.toFixed(2)+' fps');
  if(info.frames != null) parts.push(String(info.frames).padStart(4,'0')+' frames');
  if(info.duration != null) parts.push(info.duration.toFixed(1)+' seconds');
  parts.push(info.animated ? 'image sequence' : 'still image');
  m.textContent=parts.join(' • ');
}
export function updateItemProgress(id,ratio){
  const b=document.getElementById('bar-'+id), s=document.getElementById('status-'+id);
  if(b) b.style.width=Math.round(ratio*100)+'%';
  if(s){ s.textContent='Processing '+Math.round(ratio*100)+'%'; s.style.color = '#94a3b8'; }
  const a=document.getElementById('actions-'+id);
  if(a && !a.querySelector('.item-skip-btn')){
    const btn=document.createElement('button');
    btn.type='button'; btn.className='item-skip-btn'; btn.textContent='Skip';
    btn.title='Skip this file and continue with next';
    btn.style.cssText='height:17.5px;padding:0 8px;border-radius:5px;background:#1e293b;border:1px solid #475569;color:#78716c;font-size:11px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;vertical-align:middle;line-height:1;';
    btn.addEventListener('click', ()=>{ document.dispatchEvent(new CustomEvent('shrinkray:skip')); });
    a.prepend(btn);
  }
}
export function setItemConverted(id,blob,name){
  const s=document.getElementById('status-'+id), b=document.getElementById('bar-'+id), a=document.getElementById('actions-'+id);
  a?.querySelector('.item-skip-btn')?.remove();
  if(b) b.style.width='100%';
  if(s){ s.textContent='Converted'; s.style.color = '#94a3b8'; }
  if(a){
    let link = a.querySelector('a[download]');
    if (!link) {
      link=document.createElement('a');
      link.innerHTML=downloadIconSvg();
      link.className='download-icon';
      link.title='Download';
      link.setAttribute('aria-label', 'Download converted file');
      actionIconBase(link);
      link.style.background = '#1e293b';
      link.style.border = '1px solid #475569';
    }
    link.href=URL.createObjectURL(blob);
    link.download=name;
    const remove = a.querySelector('.remove-link');
    let copy = a.querySelector('.copy-link');
    if (!copy) {
      copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'copy-link';
      copy.innerHTML = copyIconSvg();
      copy.title = 'Copy converted image to clipboard';
      copy.setAttribute('aria-label', 'Copy converted image to clipboard');
      actionIconBase(copy);
      copy.style.background = '#1e293b';
      copy.style.border = '1px solid #475569';
      copy.addEventListener('click', async () => {
        try {
          await copyBlobToClipboard(blob);
          copy.style.borderColor = '#94a3b8';
          setTimeout(() => { copy.style.borderColor = '#475569'; }, 700);
        } catch (e) {
          alert(e?.message || 'Could not copy image to clipboard.');
        }
      });
    }
    a.appendChild(link);
    a.appendChild(copy);
    if (remove) a.appendChild(remove);
  }
}
export function setItemError(id,msg){
  const s=document.getElementById('status-'+id), a=document.getElementById('actions-'+id);
  a?.querySelector('.item-skip-btn')?.remove();
  if(s){ s.textContent=msg||'Error'; s.classList.remove('text-blue-400','text-amber-400'); s.classList.add('text-red-500'); }
}
export function setItemSkipped(id){
  const s=document.getElementById('status-'+id), b=document.getElementById('bar-'+id), a=document.getElementById('actions-'+id);
  a?.querySelector('.item-skip-btn')?.remove();
  if(b) b.style.width='0%';
  if(s){ s.textContent='Skipped'; s.style.color='#64748b'; }
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
