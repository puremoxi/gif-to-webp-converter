import { addQueuedItem, updateItemProgress, setItemConverted, setItemError } from './ui.js';
export function createConversionQueue(proc){
  const q=[];
  const isGif = (file) => {
    if (!file) return false;
    if (file.type === 'image/gif') return true;
    const name = String(file.name || '').toLowerCase();
    return name.endsWith('.gif');
  };
  return {
    async add(files){
      const valid=files.filter(isGif);
      const items=valid.map(f=>({id:`file-${Date.now()}-${Math.random().toString(36).slice(2,9)}`, file:f}));
      for(const it of items) addQueuedItem(it.id,it.file.name,it.file.size);
      q.push(...items); return items;
    },
    async run(getSettings,onDone){
      const tasks = q.map(it => (async () => {
        try{
          const out=await proc(it.file,{id:it.id,onProgress:r=>updateItemProgress(it.id,r),settings:getSettings()});
          if(out?.blob){ setItemConverted(it.id,out.blob,out.name); onDone&&onDone({id:it.id,name:out.name,blob:out.blob}); }
        }catch(e){ console.error(e); setItemError(it.id,'Conversion failed'); }
      })());
      await Promise.all(tasks);
    },
    clear(){ q.length=0; const r=document.getElementById('results'); if(r) r.innerHTML=''; }
  };
}
