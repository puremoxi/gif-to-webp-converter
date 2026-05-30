const AVIF_BASE = '/vendor/jsquash-avif';

let modulePromise = null;

function loadModule() {
  if (!modulePromise) {
    modulePromise = import(`${AVIF_BASE}/codec/enc/avif_enc.js`).then((codec) => (
      codec.default({
        noInitialRun: true,
        locateFile: (path) => `${AVIF_BASE}/codec/enc/${path}`,
      })
    ));
  }
  return modulePromise;
}

self.onmessage = async (event) => {
  const { id, type } = event.data || {};
  try {
    if (type === 'init') {
      await loadModule();
      self.postMessage({ id, type: 'ready' });
      return;
    }

    if (type === 'encode') {
      const module = await loadModule();
      const { buffer, width, height, options } = event.data;
      const input = new Uint8Array(buffer);
      const output = module.encode(input, width, height, options);
      if (!output) throw new Error('AVIF encoding failed.');
      const bytes = output.slice ? output.slice() : new Uint8Array(output);
      self.postMessage({ id, type: 'encoded', buffer: bytes.buffer }, [bytes.buffer]);
    }
  } catch (error) {
    self.postMessage({ id, type: 'error', message: error?.message || String(error) });
  }
};
