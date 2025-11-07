// src/app.js
import { initFFmpeg, convertToWebP } from "./modules/ffmpegClient.js";
import { setupUI, getSettings, enableZipButton } from "./modules/ui.js";
import { createConversionQueue, setItemConverted } from "./modules/queueManager.js";

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("file-input");
const downloadAllBtn = document.getElementById("download-all");

let convertedFiles = [];
let ffmpeg;

(async function init() {
  try {
    ffmpeg = await initFFmpeg(); // preload WASM
  } catch (e) {
    console.error(e);
    alert("Failed to load FFmpeg. Check your network and try again.");
  }
})();

setupUI(dropzone, fileInput);

const conversionQueue = createConversionQueue(async (file, { id, onProgress }) => {
  const settings = getSettings();
  const convertedFile = await convertToWebP(ffmpeg, file, settings, onProgress);

  convertedFiles.push(convertedFile);
  setItemConverted(id, convertedFile.blob, convertedFile.name);

  if (convertedFiles.length > 0) {
    enableZipButton();
  }
});

// Drag/drop handlers
dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.style.borderColor = "#3b82f6";
});
dropzone.addEventListener("dragleave", () => {
  dropzone.style.borderColor = "#475569";
});
dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.style.borderColor = "#475569";

  const files = Array.from(e.dataTransfer.files);
  conversionQueue.add(files);
});

// Clicking dropzone triggers input
dropzone.addEventListener("click", () => fileInput.click());

// Manual file selection
fileInput.addEventListener("change", () => {
  const files = Array.from(fileInput.files);
  conversionQueue.add(files);
});

// ZIP download (uses global window.JSZip loaded via UMD)
downloadAllBtn.addEventListener("click", async () => {
  if (convertedFiles.length === 0) return;

  if (!window.JSZip) {
    alert("JSZip not loaded. Please check your network.");
    return;
  }
  const zip = new window.JSZip();

  convertedFiles.forEach((file) => {
    zip.file(file.name, file.blob);
  });

  const blob = await zip.generateAsync({ type: "blob" });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "converted-webp-files.zip";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});
