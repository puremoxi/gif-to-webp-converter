export async function readGifMeta(file){
  const url=URL.createObjectURL(file);
  const img=new Image(); const meta={};
  try{ await new Promise((res,rej)=>{ img.onload=res; img.onerror=rej; img.src=url; });
    meta.width=img.naturalWidth; meta.height=img.naturalHeight;
  }catch{}
  URL.revokeObjectURL(url);
  meta.frames=undefined; meta.fps=undefined;
  return meta;
}
