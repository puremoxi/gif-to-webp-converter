// ESM shim for self-hosted JSZip under strict CSP.
// Ensure /vendor/jszip/jszip.min.js is included via <script src="/vendor/jszip/jszip.min.js" defer></script> in index.html.
const JSZip = window.JSZip;
export default JSZip;
