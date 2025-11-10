import { setupUI, wireStart, wireZip, wireClear } from './modules/ui.js';
import { initFFmpeg } from './modules/ffmpegClient.js';
setupUI();
(async()=>{
  try{ await initFFmpeg(); document.getElementById('converter-status').textContent='Converter ready. Please add files.'; }
  catch(e){ console.error(e); document.getElementById('converter-status').textContent='Error loading converter engine. See README.'; }
  wireStart(); wireZip(); wireClear();
})();