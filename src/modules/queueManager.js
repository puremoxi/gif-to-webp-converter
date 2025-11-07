// src/modules/queueManager.js
import { addQueuedItem, updateItemProgress, setItemConverted, setItemError } from './ui.js';

/**
 * Creates a queue that processes GIF → WebP conversions
 * in parallel. Exposes per-file progress via onProgress handlers.
 */
export function createConversionQueue(processFn) {
  const queue = [];

  async function add(files) {
    const validFiles = files.filter((f) => f.type === "image/gif");
    const items = validFiles.map((f) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2,9)}`,
      file: f
    }));

    // Render queued rows
    for (const it of items) addQueuedItem(it.id, it.file.name, it.file.size);

    queue.push(...items);
    if (items.length === 0) return;

    // Process all in parallel
    await Promise.all(items.map(async (it) => {
      try {
        await processFn(it.file, {
          id: it.id,
          onProgress: (ratio) => updateItemProgress(it.id, ratio)
        });
      } catch (err) {
        console.error(`❌ Conversion failed for ${it.file.name}`, err);
        setItemError(it.id, "Error during conversion");
      }
    }));
  }

  return { add, setItemConverted };
}

export { setItemConverted } from './ui.js';
