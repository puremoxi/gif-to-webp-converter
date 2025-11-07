import {
  setupUI, getSettings, enableZipButton, setItemThumbnail, setItemMeta,
  showBanner, updateBanner, hideBanner, showBannerProgress, updateBannerProgress, hideBannerProgress, setBannerFileStep
} from "./modules/ui.js";
import { initFFmpeg, convertToWebP, generateThumbnail } from "./modules/ffmpegClient.js";
import { createConversionQueue } from "./modules/queueManager.js";
import { getGifInfo } from "./modules/gifInfo.js";

let ffmpeg = null;
let ffmpegReady = false;
let queuedCount = 0;
const convertedFiles = [];

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const startButton = document.getElementById("start-button");
const clearButton = document.getElementById("clear-button");
const zipButton = document.getElementById("download-all");
const converterStatus = document.getElementById("converter-status");

setupUI(dropzone, fileInput);

function updateStartButton(){ startButton.disabled = !(ffmpegReady && queuedCount > 0); }

(async ()=>{
  try{
    ffmpeg = await initFFmpeg({
      onStart: ()=>{ showBanner(); showBannerProgress(); },
      onFileStep: (step,total,label)=>setBannerFileStep(step,total,label),
      onProgress: (pct)=>updateBannerProgress(pct),
      onStatus: (msg)=>updateBanner(msg||"Converter ready."),
      onDone: ()=>{ hideBannerProgress(); hideBanner(); converterStatus.textContent="Converter ready. Please add files."; }
    });
    ffmpegReady = true;
    updateStartButton();
  } catch(e){
    console.error(e);
    converterStatus.textContent = "Error loading converter engine. Please refresh.";
  }
})();

const conversionQueue = createConversionQueue(async (file, ctx)=>{
  const { id, onProgress, settings } = ctx;
  const res = await convertToWebP(ffmpeg, file, settings, onProgress);
  return res;
});

dropzone.addEventListener("drop", async (e)=>{
  const files = Array.from(e.dataTransfer.files);
  await handleFiles(files);
});
["dragenter","dragover","dragleave"].forEach(ev=>{
  dropzone.addEventListener(ev, e=>e.preventDefault());
  document.body.addEventListener(ev, e=>e.preventDefault());
});
dropzone.addEventListener("click", ()=>fileInput.click());
fileInput.addEventListener("change", async ()=>{
  const files = Array.from(fileInput.files);
  await handleFiles(files);
});

async function handleFiles(files){
  const items = await conversionQueue.add(files);
  queuedCount += items.length;
  updateStartButton();
  for(const it of items){
    getGifInfo(it.file).then(info=>setItemMeta(it.id, info)).catch(()=>{});
    try{
      if(ffmpeg && ffmpeg.loaded){
        const blob = await generateThumbnail(ffmpeg, it.file, 128);
        setItemThumbnail(it.id, URL.createObjectURL(blob));
      } else {
        const blob = await fallbackCanvasThumb(it.file, 128);
        setItemThumbnail(it.id, URL.createObjectURL(blob));
      }
    } catch(e){
      const blob = await fallbackCanvasThumb(it.file, 128).catch(()=>null);
      if(blob) setItemThumbnail(it.id, URL.createObjectURL(blob));
    }
  }
}

async function fallbackCanvasThumb(file, size=128){
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  await img.decode().catch(()=>{});
  const w = img.width || size, h = img.height || size;
  const scale = w > size ? size / w : 1;
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const c = document.createElement("canvas");
  c.width = cw; c.height = ch;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0, cw, ch);
  URL.revokeObjectURL(url);
  return new Promise(res=>c.toBlob(res, "image/png"));
}

startButton.addEventListener("click", async ()=>{
  startButton.disabled = true;
  await conversionQueue.run(()=>getSettings(), (file)=>{ convertedFiles.push(file); });
  enableZipButton();
  updateStartButton();
});

clearButton.addEventListener("click", ()=>{
  conversionQueue.clear();
  queuedCount = 0;
  updateStartButton();
  converterStatus.textContent = "Converter ready. Please add files.";
  convertedFiles.length = 0;
  zipButton.disabled = true;
});

zipButton.addEventListener("click", async ()=>{
  if(!convertedFiles.length) return;
  const zip = new JSZip();
  for(const f of convertedFiles){
    const arr = await f.blob.arrayBuffer();
    zip.file(f.name, arr);
  }
  const content = await zip.generateAsync({ type:"blob" });
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url; a.download = "converted_webp_files.zip";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
});
