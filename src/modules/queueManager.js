import { addQueuedItem, updateItemProgress, setItemConverted, setItemError } from './ui.js';
export function createConversionQueue(proc){
  const q=[];
  return {
    async add(files){
      const valid=files.filter(f=>f.type==='image/gif');
      const items=valid.map(f=>({id:`file-${Date.now()}-${Math.random().toString(36).slice(2,9)}`, file:f}));
      for(const it of items) addQueuedItem(it.id,it.file.name,it.file.size);
      q.push(...items); return items;
    },
    async run(getSettings,onDone){
      for(const it of q){
        try{
          const out=await proc(it.file,{id:it.id,onProgress:r=>updateItemProgress(it.id,r),settings:getSettings()});
          if(out?.blob){ setItemConverted(it.id,out.blob,out.name); onDone&&onDone({id:it.id,name:out.name,blob:out.blob}); }
        }catch(e){ console.error(e); setItemError(it.id,'Conversion failed'); }
      }
    },
    clear(){ q.length=0; const r=document.getElementById('results'); if(r) r.innerHTML=''; }
  };
}