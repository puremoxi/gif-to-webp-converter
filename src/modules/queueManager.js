import { addQueuedItem, updateItemProgress, setItemConverted, setItemError } from './ui.js';
export function createConversionQueue(proc){
  const q=[];
  const ACCEPTED_TYPES = new Set([
    'image/gif','image/png','image/jpeg',
    'image/webp',
    'image/bmp','image/x-bmp',
    'image/tiff','image/x-tiff',
    'image/apng',
    'image/x-icon','image/vnd.microsoft.icon',
    'image/x-tga','image/x-targa',
    'image/svg+xml',
    'image/heic','image/heif',
    'video/mp4','video/quicktime','video/webm',
  ]);
  const ACCEPTED_EXT = /\.(gif|png|jpe?g|webp|bmp|tiff?|apng|ico|tga|svg|heic|heif|mp4|mov|webm)$/i;
  const isConvertibleImage = (file) => {
    if (!file) return false;
    if (ACCEPTED_TYPES.has(file.type)) return true;
    return ACCEPTED_EXT.test(String(file.name || ''));
  };
  return {
    async add(files){
      const valid=files.filter(isConvertibleImage);
      const items=valid.map(f=>({id:`file-${Date.now()}-${Math.random().toString(36).slice(2,9)}`, file:f}));
      for(const it of items) addQueuedItem(it.id,it.file.name,it.file.size);
      q.push(...items); return items;
    },
    async run(getSettings,onDone){
      for (const it of q) {
        try{
          const out=await proc(it.file,{id:it.id,onProgress:r=>updateItemProgress(it.id,r),settings:getSettings()});
          if(out?.blob){ setItemConverted(it.id,out.blob,out.name); onDone&&onDone({id:it.id,name:out.name,blob:out.blob}); }
        }catch(e){ console.error(e); setItemError(it.id,'Conversion failed'); }
      }
    },
    remove(id){
      const idx = q.findIndex(it => it.id === id);
      if (idx >= 0) q.splice(idx, 1);
    },
    clear(){ q.length=0; const r=document.getElementById('results'); if(r) r.innerHTML=''; }
  };
}
