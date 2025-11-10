// ESM wrapper around local UMD build
import './jszip/jszip.min.js';
if (!window.JSZip) {
  throw new Error('JSZip not found. Place jszip.min.js in vendor/jszip (see README).');
}
export default window.JSZip;
