import { addQueuedItem, updateItemProgress, setItemConverted, setItemError } from './ui.js';
export function createConversionQueue(proc){
  const q=[];
  const isConvertibleImage = (file) => {
    if (!file) return false;
    if (['image/gif', 'image/png', 'image/jpeg'].includes(file.type)) return true;
    const name = String(file.name || '').toLowerCase();
    return /\.(gif|png|jpe?g)$/.test(name);
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
