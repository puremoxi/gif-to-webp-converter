// Draws a source file into an offscreen canvas capped at maxEdge on the long side.
// Used only to speed up live-preview encodes; independent of the user's real Max Width/Height settings.
export async function downscaleForPreview(file, maxEdge = 900, keepAlpha = false) {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!keepAlpha) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    return { canvas, ctx, width, height };
  } finally {
    bitmap.close?.();
  }
}
