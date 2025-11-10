const fs = require('fs');
try{
  const v = JSON.parse(fs.readFileSync('./version.json','utf8'));
  const missing = [];
  if(!v.app?.version) missing.push('app.version');
  if(!v.vendor?.ffmpeg?.files?.length) missing.push('vendor.ffmpeg.files');
  if(!v.vendor?.jszip?.files?.length) missing.push('vendor.jszip.files');
  if(missing.length){
    console.warn('[validate] Missing fields:', missing.join(', '));
  }else{
    console.log('[validate] version.json OK');
  }
}catch(e){
  console.warn('[validate] version.json parse error:', e.message);
}
