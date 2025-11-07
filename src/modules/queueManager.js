// src/modules/queueManager.js
import { addQueuedItem, updateItemProgress, setItemConverted, setItemError } from "./ui.js";

export function createConversionQueue(processFn){
  const queue = [];
  async function add(files){
    const valid = files.filter(f=>f.type==="image/gif");
    const items = valid.map(f=>({ id:`file-${Date.now()}-${Math.random().toString(36).slice(2,9)}`, file:f }));
    for(const it of items) addQueuedItem(it.id, it.file.name, it.file.size);
    queue.push(...items);
    return items;
  }
  async function run(settingsProvider, onEachDone){
    for(const it of queue){
      try{
        const settings = settingsProvider();
        const result = await processFn(it.file, { id:it.id, onProgress:(r)=>updateItemProgress(it.id,r), settings });
        if(result?.blob){ setItemConverted(it.id, result.blob, result.name); onEachDone && onEachDone({ id:it.id, name:result.name, blob:result.blob }); }
      } catch(err){
        console.error("Conversion failed:", err);
        setItemError(it.id, "Conversion failed");
      }
    }
  }
  function clear(){ queue.length=0; const res=document.getElementById("results"); if(res) res.innerHTML=""; }
  return { add, run, clear };
}
