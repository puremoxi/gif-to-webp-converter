// src/modules/ui.js
const DEFAULTS = { lossless:false, quality:90, compressionLevel:6, loop:true, still:false, mixed:false, mixedMode:'percent', mixedPercent:20, mixedThreshold:80 };

export function setupUI(dropzone, fileInput) {
  const qualitySlider = document.getElementById("quality");
  const qualityValue = document.getElementById("quality-value");
  const compSlider = document.getElementById("compression-level");
  const compValue = document.getElementById("compression-level-value");
  const resetBtn = document.getElementById("reset-settings");
  const mixedMode = document.getElementById("mixed-mode");
  const mixedPercent = document.getElementById("mixed-percent");
  const mixedPercentValue = document.getElementById("mixed-percent-value");
  const mixedThreshold = document.getElementById("mixed-threshold");
  const mixedThresholdValue = document.getElementById("mixed-threshold-value");
  const lossless = document.getElementById("lossless-toggle");
  const mixed    = document.getElementById("mixed-toggle");
  const loop     = document.getElementById("loop-toggle");
  const still    = document.getElementById("still-toggle");

  qualitySlider.addEventListener("input", () => { let v = clamp(parseInt(qualitySlider.value,10),0,100); qualitySlider.value=v; qualityValue.textContent=v; });
  compSlider.addEventListener("input", () => { let v = clamp(parseInt(compSlider.value,10),0,6); compSlider.value=v; compValue.textContent=v; });
  mixedPercent.addEventListener("input", () => { let v=clamp(parseInt(mixedPercent.value,10),10,50); mixedPercent.value=v; mixedPercentValue.textContent=v+"%"; });
  mixedThreshold.addEventListener("input", () => { let v=clamp(parseInt(mixedThreshold.value,10),50,99); mixedThreshold.value=v; mixedThresholdValue.textContent=v+"th"; });

  function syncExclusives(){ mixed.disabled=lossless.checked; if(lossless.checked) mixed.checked=false; still.disabled=loop.checked; if(loop.checked) still.checked=false; }
  lossless.addEventListener("change", syncExclusives);
  loop.addEventListener("change", syncExclusives);
  syncExclusives();

  ["dragenter","dragover","dragleave","drop"].forEach((eName)=>{ dropzone.addEventListener(eName,(e)=>e.preventDefault(),false); document.body.addEventListener(eName,(e)=>e.preventDefault(),false); });
  ["dragenter","dragover"].forEach(ev=>dropzone.addEventListener(ev,()=>dropzone.classList.add("dropzone-active")));
  ["dragleave","drop"].forEach(ev=>dropzone.addEventListener(ev,()=>dropzone.classList.remove("dropzone-active")));

  const closeBtn = document.getElementById("ffmpeg-banner-close");
  if (closeBtn) closeBtn.addEventListener("click", ()=>{ const box=document.getElementById("ffmpeg-banner"); if(box) box.style.display="none"; });

  resetBtn.addEventListener("click", ()=>{
    document.getElementById("lossless-toggle").checked=DEFAULTS.lossless;
    qualitySlider.value=DEFAULTS.quality; qualityValue.textContent=DEFAULTS.quality;
    compSlider.value=DEFAULTS.compressionLevel; compValue.textContent=DEFAULTS.compressionLevel;
    document.getElementById("loop-toggle").checked=DEFAULTS.loop;
    document.getElementById("still-toggle").checked=DEFAULTS.still;
    document.getElementById("mixed-toggle").checked=DEFAULTS.mixed;
    mixedMode.value=DEFAULTS.mixedMode;
    mixedPercent.value=DEFAULTS.mixedPercent; mixedPercentValue.textContent=DEFAULTS.mixedPercent+"%";
    mixedThreshold.value=DEFAULTS.mixedThreshold; mixedThresholdValue.textContent=DEFAULTS.mixedThreshold+"th";
    syncExclusives();
  });
}

export function getSettings(){
  const quality=clamp(parseInt(document.getElementById("quality").value,10),0,100);
  const compressionLevel=clamp(parseInt(document.getElementById("compression-level").value,10),0,6);
  return {
    lossless:document.getElementById("lossless-toggle").checked, quality, compressionLevel,
    loop:document.getElementById("loop-toggle").checked, still:document.getElementById("still-toggle").checked,
    mixed:document.getElementById("mixed-toggle").checked, mixedMode:document.getElementById("mixed-mode").value,
    mixedPercent:clamp(parseInt(document.getElementById("mixed-percent").value,10),10,50),
    mixedThreshold:clamp(parseInt(document.getElementById("mixed-threshold").value,10),50,99)
  };
}
export function enableZipButton(){ document.getElementById("download-all").disabled=false; }
export function formatBytes(bytes,dec=2){ if(bytes===0)return"0 Bytes";const k=1024;const dm=dec<0?0:dec;const sizes=["Bytes","KB","MB","GB"];const i=Math.floor(Math.log(bytes)/Math.log(k));return parseFloat((bytes/Math.pow(k,i)).toFixed(dm))+" "+sizes[i]; }
function clamp(n,min,max){ if(Number.isNaN(n))return min; return Math.max(min,Math.min(max,n)); }

export function addQueuedItem(id,name,sizeBytes){
  const resultsDiv=document.getElementById("results");
  const card=document.createElement("div"); card.className="card"; card.id=`item-${id}`;
  card.innerHTML=`
    <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap">
      <div style="display:flex; align-items:center; gap:12px; min-width:220px;">
        <img id="thumb-${id}" alt="thumbnail" style="width:64px; height:64px; border-radius:8px; object-fit:cover; background:#0b1220; border:1px solid #1f2937;" />
        <div>
          <div style="font-weight:600;">${name}</div>
          <div style="color:#94a3b8; font-size:14px;">${formatBytes(sizeBytes)}</div>
          <div id="meta-${id}" style="color:#94a3b8; font-size:12px; margin-top:2px;"></div>
        </div>
      </div>
      <div id="status-${id}" style="color:#fbbf24; font-weight:600;">Queued</div>
    </div>
    <div style="margin-top:10px; width:100%; background:#1f2937; height:8px; border-radius:6px; overflow:hidden;">
      <div id="bar-${id}" style="height:8px; width:0%; background:#3b82f6;"></div>
    </div>
    <div id="actions-${id}" style="margin-top:10px;"></div>`;
  resultsDiv.appendChild(card);
}
export function updateItemProgress(id,ratio){ const bar=document.getElementById(`bar-${id}`); const status=document.getElementById(`status-${id}`); if(bar) bar.style.width=`${Math.min(100,Math.max(0,Math.round(ratio*100)))}%`; if(status){ status.textContent=`Processing ${Math.round(ratio*100)}%`; status.style.color="#60a5fa"; } }
export function setItemConverted(id,blob,downloadName){ const status=document.getElementById(`status-${id}`); const bar=document.getElementById(`bar-${id}`); const actions=document.getElementById(`actions-${id}`); if(bar) bar.style.width="100%"; if(status){ status.textContent="Converted"; status.style.color="#22c55e"; } if(actions){ const a=document.createElement("a"); a.textContent="Download"; a.href=URL.createObjectURL(blob); a.download=downloadName; a.className="text-blue-400 font-semibold hover:underline mr-3"; actions.innerHTML=""; actions.appendChild(a);} }
export function setItemError(id,msg="Error"){ const status=document.getElementById(`status-${id}`); if(status){ status.textContent=msg; status.style.color="#ef4444"; } }
export function setItemThumbnail(id,url){ const img=document.getElementById(`thumb-${id}`); if(img) img.src=url; }
export function setItemMeta(id,{frames,fps,animated}){ const meta=document.getElementById(`meta-${id}`); if(!meta) return; const fpsTxt=fps?`${fps.toFixed(2)} fps`:"—"; const framesTxt=frames?String(frames).padStart(4,"0"):"0000"; const kind=animated?"animation sequence":"still image"; meta.textContent=`${fpsTxt} • ${framesTxt} frames • ${kind}`; }

export function showBanner(text="Downloading converter engine…"){ const box=document.getElementById("ffmpeg-banner"); const label=document.getElementById("ffmpeg-banner-text"); if(!box||!label)return; label.textContent=text; box.style.display="flex"; }
export function updateBanner(text){ const label=document.getElementById("ffmpeg-banner-text"); if(label) label.textContent=text; }
export function hideBanner(){ const box=document.getElementById("ffmpeg-banner"); if(box) box.style.display="none"; }
export function showBannerProgress(){ const wrap=document.getElementById("ffmpeg-banner-progress"); const bar=document.getElementById("ffmpeg-banner-progress-bar"); if(wrap&&bar){ bar.style.width="0%"; wrap.style.display="block"; } }
export function updateBannerProgress(pct){ const bar=document.getElementById("ffmpeg-banner-progress-bar"); if(bar){ const c=Math.max(0,Math.min(100,Math.round(pct))); bar.style.width=c+"%"; } }
export function hideBannerProgress(){ const wrap=document.getElementById("ffmpeg-banner-progress"); if(wrap) wrap.style.display="none"; }
export function setBannerFileStep(step,total,label){ const text=document.getElementById("ffmpeg-banner-text"); if(text) text.textContent=`Downloading converter engine… (${step}/${total}) ${label}`; }
