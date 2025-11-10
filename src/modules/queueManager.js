import { addQueuedItem, updateItemProgress, setItemConverted, setItemError } from './ui.js';
export function createConversionQueue(proc){
  const q=[];
  let processing = false;
  return {
    async add(files){
      const valid=files.filter(f=>f.type==='image/gif');
      const items=valid.map(f=>({id:`file-${Date.now()}-${Math.random().toString(36).slice(2,9)}`, file:f}));
      for(const it of items) addQueuedItem(it.id,it.file.name,it.file.size);
      q.push(...items); return items;
    },
    isProcessing: () => processing,
    async run(getSettings,onDone){
      processing = true;
      const tasks = q.map((it) => (async () => {
        const startTime = performance.now();
        try{
          const out=await proc(it.file,{id:it.id,onProgress:r=>updateItemProgress(it.id,r),settings:getSettings()});
          const duration = (performance.now() - startTime) / 1000;
          if(out?.blob){ setItemConverted(it.id,out.blob,out.name, duration); onDone&&onDone({id:it.id,name:out.name,blob:out.blob}); }
        }catch(e){ 
          console.error(e); 
          const duration = (performance.now() - startTime) / 1000;
          setItemError(it.id,'Conversion failed', duration); 
        }
      })());
      await Promise.all(tasks);
      processing = false;
    },
    clear(){ q.length=0; const r=document.getElementById('results'); if(r) r.innerHTML=''; }
  };
}