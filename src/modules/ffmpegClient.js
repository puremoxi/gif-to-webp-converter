let ffmpegInstance=null;
const FF=()=>window?.FFmpeg?.FFmpeg; const fetchFile=(f)=>window?.FFmpegUtil?.fetchFile?.(f);

async function fetchWithProgress(url,onPct){
  const r=await fetch(url);
  if(!r.ok) throw new Error('Fetch failed: '+r.status+' '+r.statusText);
  const total=Number(r.headers.get('content-length'))||0;
  if(!r.body||!r.body.getReader||!total){ const blob=await r.blob(); if(onPct) onPct(100); return blob; }
  const rd=r.body.getReader(); const chunks=[]; let loaded=0;
  while(true){ const {done,value}=await rd.read(); if(done) break; chunks.push(value); loaded+=value.byteLength; if(onPct) onPct(loaded*100/total); }
  return new Blob(chunks,{type:r.headers.get('content-type')||'application/octet-stream'});
}

export async function initFFmpeg(opts={}){
  if(ffmpegInstance) return ffmpegInstance;
  const F=FF(); if(!F) throw new Error('FFmpeg library not available');
  const ffmpeg=new F();
  const base='https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  const files=[
    {label:'ffmpeg-core.js', url: base+'/ffmpeg-core.js'},
    {label:'ffmpeg-core.wasm', url: base+'/ffmpeg-core.wasm'},
    {label:'ffmpeg-core.worker.js', url: base+'/ffmpeg-core.worker.js'}
  ];
  try{ opts.onStart&&opts.onStart(); }catch{}
  const blobs=[];
  for(let i=0;i<files.length;i++){
    const {label,url}=files[i];
    try{ opts.onFileStep&&opts.onFileStep(i+1,files.length,label);}catch{}
    const blob=await fetchWithProgress(url,(pct)=>{ try{ opts.onProgress&&opts.onProgress(pct,i+1,files.length,label);}catch{} });
    blobs.push(blob);
    try{ opts.onProgress&&opts.onProgress(100,i+1,files.length,label);}catch{}
  }
  const [jsb,wasmb,workb]=blobs;
  const coreURL=URL.createObjectURL(jsb), wasmURL=URL.createObjectURL(wasmb), workerURL=URL.createObjectURL(workb);
  try{
    await ffmpeg.load({coreURL, wasmURL, workerURL});
    try{ opts.onStatus&&opts.onStatus('Converter ready.'); }catch{}
  } finally {
    try{ opts.onDone&&opts.onDone(); }catch{}
    URL.revokeObjectURL(coreURL); URL.revokeObjectURL(wasmURL); URL.revokeObjectURL(workerURL);
  }
  ffmpegInstance=ffmpeg; return ffmpegInstance;
}

export async function convertToWebP(ffmpeg,file,settings,onProgress){
  const input=file.name, output=input.replace(/\.gif$/i,'.webp');
  await ffmpeg.writeFile(input, await fetchFile(file));
  const args=['-i',input,'-c:v','libwebp'];
  if(Number.isFinite(settings.compressionLevel)) args.push('-compression_level',String(settings.compressionLevel));
  if(settings.lossless) args.push('-lossless','1'); else args.push('-qscale',String(settings.quality));
  args.push('-loop', settings.loop?'0':'-1');
  if(settings.still) args.push('-preset','picture');
  args.push(output);
  const smooth=(r)=>Math.max(.05,Math.min(.99,.05+r*.94));
  const h=({progress})=>{ try{ onProgress&&onProgress(smooth(progress)); }catch{} };
  ffmpeg.on('progress',h);
  try{ await ffmpeg.exec(args); } finally { try{ ffmpeg.off('progress',h);}catch{} }
  const data=await ffmpeg.readFile(output);
  try{ await ffmpeg.deleteFile(input);}catch{}; try{ await ffmpeg.deleteFile(output);}catch{};
  return {name:output, blob:new Blob([data.buffer],{type:'image/webp'})};
}
