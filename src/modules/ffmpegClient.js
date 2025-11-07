// src/modules/ffmpegClient.js
let ffmpegInstance = null;
const FFmpegClass = () => window?.FFmpeg?.FFmpeg;
const fetchFileUtil = (f) => window?.FFmpegUtil?.fetchFile?.(f);

async function fetchWithProgress(url, onPct){
  const r = await fetch(url);
  if(!r.ok) throw new Error(`Fetch failed: ${r.status} ${r.statusText}`);
  const total = Number(r.headers.get('content-length')) || 0;
  if(!r.body || !r.body.getReader || !total){
    const blob = await r.blob();
    onPct && onPct(100);
    return blob;
  }
  const reader = r.body.getReader();
  const chunks = [];
  let loaded = 0;
  while(true){
    const {done, value} = await reader.read();
    if(done) break;
    chunks.push(value);
    loaded += value.byteLength;
    onPct && onPct((loaded/total)*100);
  }
  return new Blob(chunks, { type: r.headers.get('content-type') || 'application/octet-stream' });
}

export async function initFFmpeg(opts={}){
  if(ffmpegInstance) return ffmpegInstance;
  const FF = FFmpegClass();
  if(!FF) throw new Error("FFmpeg library not available");

  const ffmpeg = new FF();

  const coreBase = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
  const urls = [
    { label: "core loader", url: `${coreBase}/ffmpeg-core.js` },
    { label: "engine (wasm)", url: `${coreBase}/ffmpeg-core.wasm` },
    { label: "worker", url: `${coreBase}/ffmpeg-core.worker.js` }
  ];

  try{ opts.onStart && opts.onStart("Downloading converter engine…"); }catch{}
  try{ opts.onProgress && opts.onProgress(0); }catch{}

  const blobs = [];
  for(let i=0;i<urls.length;i++){
    const {label, url} = urls[i];
    try{ opts.onFileStep && opts.onFileStep(i+1, urls.length, label); }catch{}
    const blob = await fetchWithProgress(url, (pct)=>{
      const base = (i/urls.length)*100;
      const totalPct = Math.min(100, Math.round(base + pct/urls.length));
      try{ opts.onProgress && opts.onProgress(totalPct); }catch{}
    });
    blobs.push(blob);
  }

  const [jsBlob, wasmBlob, workerBlob] = blobs;
  const coreURL   = URL.createObjectURL(jsBlob);
  const wasmURL   = URL.createObjectURL(wasmBlob);
  const workerURL = URL.createObjectURL(workerBlob);

  try{
    await ffmpeg.load({ coreURL, wasmURL, workerURL });
    try{ opts.onStatus && opts.onStatus("Converter ready."); }catch{}
  } finally {
    try{ opts.onProgress && opts.onProgress(100); }catch{}
    try{ opts.onDone && opts.onDone(); }catch{}
    URL.revokeObjectURL(coreURL);
    URL.revokeObjectURL(wasmURL);
    URL.revokeObjectURL(workerURL);
  }

  ffmpegInstance = ffmpeg;
  return ffmpegInstance;
}

export async function generateThumbnail(ffmpeg, file, maxWidth=256){
  if(!ffmpeg || !ffmpeg.loaded) throw new Error("ffmpeg not ready");
  const inputName = file.name;
  const thumbName = inputName.replace(/\.gif$/i, "_thumb.png");

  let wrote=false;
  try{ await ffmpeg.readFile(inputName); }
  catch{ await ffmpeg.writeFile(inputName, await fetchFileUtil(file)); wrote=true; }

  const vf = `thumbnail,scale=${maxWidth}:-1:flags=lanczos`;
  await ffmpeg.exec(["-i", inputName, "-vf", vf, "-frames:v", "1", thumbName]);
  const data = await ffmpeg.readFile(thumbName);
  try{ await ffmpeg.deleteFile(thumbName);}catch{}
  if(wrote){ try{ await ffmpeg.deleteFile(inputName);}catch{} }

  return new Blob([data.buffer], { type: "image/png" });
}

export async function convertToWebP(ffmpeg, file, settings, onProgress){
  const input = file.name;
  const base = input.replace(/\.gif$/i, "");
  const output = base + ".webp";

  await ffmpeg.writeFile(input, await fetchFileUtil(file));

  const smooth = (r)=>Math.max(0.05, Math.min(0.99, 0.05 + r*0.94));
  const emit = (v)=>{ try{ onProgress && onProgress(v);}catch{} };
  emit(0.05);

  const args = ["-i", input, "-c:v", "libwebp"];
  if(Number.isFinite(settings.compressionLevel)) args.push("-compression_level", String(settings.compressionLevel));
  if(settings.lossless){ args.push("-lossless","1"); } else { args.push("-qscale", String(settings.quality)); }
  const loopValue = settings.loop ? "0" : "-1";
  args.push("-loop", loopValue);
  if(settings.still) args.push("-preset", "picture");
  args.push(output);

  const h = ({progress})=>emit(smooth(progress));
  ffmpeg.on("progress", h);
  try{ await ffmpeg.exec(args); }
  finally{ try{ ffmpeg.off("progress", h);}catch{} }

  const data = await ffmpeg.readFile(output);
  emit(1);

  try{ await ffmpeg.deleteFile(input);}catch{}
  try{ await ffmpeg.deleteFile(output);}catch{}

  const blob = new Blob([data.buffer], { type: "image/webp" });
  return { name: output, blob };
}
