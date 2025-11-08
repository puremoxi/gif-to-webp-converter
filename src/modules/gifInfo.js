
export async function getGifInfo(file){
  const buf = await file.arrayBuffer();
  const dv = new DataView(buf);
  if (dv.getUint8(0)!==0x47 || dv.getUint8(1)!==0x49 || dv.getUint8(2)!==0x46) return {frames:1, animated:false, fps:0};
  let p=6; const packed=dv.getUint8(p+4); p+=7;
  const gct=(packed&0x80)!==0; if(gct) p+=3*(2**((packed&0x07)+1));
  let frames=0, delays=[], last=10;
  while(p<dv.byteLength){
    const b=dv.getUint8(p++);
    if(b===0x21){ const label=dv.getUint8(p++);
      if(label===0xF9){ const sz=dv.getUint8(p++); p++; last=dv.getUint16(p,true); p+=2; p+=2; }
      else { while(true){ const sz=dv.getUint8(p++); if(sz===0) break; p+=sz; } }
    } else if(b===0x2C){
      p+=8; const ip=dv.getUint8(p++); const lct=(ip&0x80)!==0; if(lct) p+=3*(2**((ip&0x07)+1));
      p++; while(true){ const sz=dv.getUint8(p++); if(sz===0) break; p+=sz; }
      frames++; const cs=(last===0?2:last); delays.push(cs*10);
    } else if(b===0x3B){ break; } else { break; }
  }
  const animated=frames>1; const total=delays.reduce((a,b)=>a+b,0); const fps=(animated && total>0)?(frames/(total/1000)):0;
  return {frames, animated, fps};
}
