export async function rasterizeSvg(file, maxWidth = null, maxHeight = null) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();

    let w = img.naturalWidth  || 800;
    let h = img.naturalHeight || 600;

    if (maxWidth  && w > maxWidth)  { h = Math.round(h * maxWidth  / w); w = maxWidth;  }
    if (maxHeight && h > maxHeight) { w = Math.round(w * maxHeight / h); h = maxHeight; }

    const canvas = document.createElement('canvas');
    canvas.width  = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);

    return await new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('SVG rasterization failed')), 'image/png');
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
