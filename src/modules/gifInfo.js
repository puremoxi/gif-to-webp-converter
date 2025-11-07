// src/modules/gifInfo.js
export async function getGifInfo(file){
  const buf = await file.arrayBuffer();
  const dv = new DataView(buf);
  if (dv.getUint8(0)!==0x47 || dv.getUint8(1)!==0x49 || dv.getUint8(2)!==0x46){ return {frames:1, animated:false, fps:0}; }
  let p=6;
  const packed=dv.getUint8(p+4); p+=7;
  const gctFlag=(packed&0x80)!==0; if(gctFlag) p+=3*(2**((packed&0x07)+1));
  let frames=0; let delays=[]; let lastDelay=10;
  while(p<dv.byteLength){
    const b=dv.getUint8(p++);
    if(b===0x21){
      const label=dv.getUint8(p++);
      if(label===0xF9){
        const blockSize=dv.getUint8(p++); p++; lastDelay=dv.getUint16(p,true); p+=2; p+=2;
      } else {
        while(true){ const sz=dv.getUint8(p++); if(sz===0) break; p+=sz; }
      }
    } else if(b===0x2C){
      p+=8;
      const ip=dv.getUint8(p++);
      const lctFlag2=(ip&0x80)!==0; if(lctFlag2) p+=3*(2**((ip&0x07)+1));
      p++;
      while(true){ const sz=dv.getUint8(p++); if(sz===0) break; p+=sz; }
      frames++; delays.push(Math.max(10,lastDelay)*10);
    } else if(b===0x3B){ break; } else { break; }
  }
  const animated=frames>1; const avgDelay=delays.length?delays.reduce((a,b)=>a+b,0)/delays.length:0; const fps=avgDelay?(1000/avgDelay):0;
  return {frames, animated, fps};
}
