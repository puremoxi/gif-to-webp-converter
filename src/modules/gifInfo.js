export async function getGifInfo(file){
  const ab = await file.arrayBuffer();
  const bytes = new Uint8Array(ab);

  // Very lightweight parse: count Graphics Control Extension (0x21,0xF9) and delays.
  let frames=0;
  let totalDelayHundredths = 0;

  for(let i=0; i<bytes.length-7; i++){
    if(bytes[i]===0x21 && bytes[i+1]===0xF9 && bytes[i+2]===0x04){
      frames++;
      const delay = bytes[i+4] | (bytes[i+5] << 8); // in 1/100s
      totalDelayHundredths += delay || 1; // avoid zero-delay
    }
  }

  const animated = frames > 1;
  const durationSec = totalDelayHundredths / 100;
  const fps = (animated && durationSec>0) ? (frames / durationSec) : 0;

  return { frames, animated, fps };
}
