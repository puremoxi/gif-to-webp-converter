// src/modules/ui.js

const DEFAULTS = {
  lossless: false,
  quality: 90,
  compressionLevel: 6,
  loop: true,
  still: false,
  mixed: false,
  mixedMode: 'percent',
  mixedPercent: 20,
  mixedThreshold: 80
};

export function setupUI(dropzone, fileInput) {
  const qualitySlider = document.getElementById("quality");
  const qualityValue = document.getElementById("quality-value");

  const compSlider = document.getElementById("compression-level");
  const compValue = document.getElementById("compression-level-value");

  const resetBtn = document.getElementById("reset-settings");

  const mixedMode = document.getElementById("mixed-mode");
  const mixedPercent = document.getElementById("mixed-percent");
  const mixedPercentValue = document.getElementById("mixed-percent-value");
  const mixedThreshold = document.getElementById("mixed-threshold");
  const mixedThresholdValue = document.getElementById("mixed-threshold-value");

  // Update quality text live and clamp
  qualitySlider.addEventListener("input", () => {
    let v = clamp(parseInt(qualitySlider.value, 10), 0, 100);
    qualitySlider.value = v;
    qualityValue.textContent = v;
  });

  // Update compression level text live and clamp
  compSlider.addEventListener("input", () => {
    let v = clamp(parseInt(compSlider.value, 10), 0, 6);
    compSlider.value = v;
    compValue.textContent = v;
  });

  // Mixed tuning updates
  mixedPercent.addEventListener("input", () => {
    let v = clamp(parseInt(mixedPercent.value, 10), 10, 50);
    mixedPercent.value = v;
    mixedPercentValue.textContent = v + "%";
  });
  mixedThreshold.addEventListener("input", () => {
    let v = clamp(parseInt(mixedThreshold.value, 10), 50, 99);
    mixedThreshold.value = v;
    mixedThresholdValue.textContent = v + "th";
  });

  // Reset to defaults
  resetBtn.addEventListener("click", () => {
    document.getElementById("lossless-toggle").checked = DEFAULTS.lossless;
    qualitySlider.value = DEFAULTS.quality;
    qualityValue.textContent = DEFAULTS.quality;
    compSlider.value = DEFAULTS.compressionLevel;
    compValue.textContent = DEFAULTS.compressionLevel;
    document.getElementById("loop-toggle").checked = DEFAULTS.loop;
    document.getElementById("still-toggle").checked = DEFAULTS.still;
    document.getElementById("mixed-toggle").checked = DEFAULTS.mixed;
    mixedMode.value = DEFAULTS.mixedMode;
    mixedPercent.value = DEFAULTS.mixedPercent;
    mixedPercentValue.textContent = DEFAULTS.mixedPercent + "%";
    mixedThreshold.value = DEFAULTS.mixedThreshold;
    mixedThresholdValue.textContent = DEFAULTS.mixedThreshold + "th";
  });

  // Basic drag events
  ["dragenter", "dragover"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.style.borderColor = "#3b82f6";
    })
  );

  ["dragleave", "drop"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.style.borderColor = "#475569";
    })
  );
});

  // Update compression level text live and clamp
  compSlider.addEventListener("input", () => {
    let v = clamp(parseInt(compSlider.value, 10), 0, 6);
    compSlider.value = v;
    compValue.textContent = v;
  });

  // Reset to defaults
  resetBtn.addEventListener("click", () => {
    document.getElementById("lossless-toggle").checked = DEFAULTS.lossless;
    document.getElementById("quality").value = DEFAULTS.quality;
    document.getElementById("quality-value").textContent = DEFAULTS.quality;
    document.getElementById("compression-level").value = DEFAULTS.compressionLevel;
    document.getElementById("compression-level-value").textContent = DEFAULTS.compressionLevel;
    document.getElementById("loop-toggle").checked = DEFAULTS.loop;
    document.getElementById("still-toggle").checked = DEFAULTS.still;
    document.getElementById("mixed-toggle").checked = DEFAULTS.mixed;
  });

  // Basic drag events
  ["dragenter", "dragover"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.style.borderColor = "#3b82f6";
    })
  );

  ["dragleave", "drop"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.style.borderColor = "#475569";
    })
  );
}

export function getSettings() {
  // Clamp values as a final guard
  const quality = clamp(parseInt(document.getElementById("quality").value, 10), 0, 100);
  const compressionLevel = clamp(parseInt(document.getElementById("compression-level").value, 10), 0, 6);

  return {
    lossless: document.getElementById("lossless-toggle").checked,
    quality,
    compressionLevel,
    loop: document.getElementById("loop-toggle").checked,
    still: document.getElementById("still-toggle").checked,
    mixed: document.getElementById("mixed-toggle").checked,
    mixedMode: document.getElementById("mixed-mode").value,
    mixedPercent: clamp(parseInt(document.getElementById("mixed-percent").value, 10), 10, 50),
    mixedThreshold: clamp(parseInt(document.getElementById("mixed-threshold").value, 10), 50, 99)
  };
}

export function enableZipButton() {
  document.getElementById("download-all").disabled = false;
}

export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function clamp(n, min, max) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

/* ---------- Per-file rows + progress ---------- */

export function addQueuedItem(id, name, sizeBytes) {
  const resultsDiv = document.getElementById("results");

  const card = document.createElement("div");
  card.className = "card";
  card.id = `item-${id}`;

  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap">
      <div style="min-width:200px;">
        <div style="font-weight:600;">\${name}</div>
        <div style="color:#94a3b8; font-size:14px;">\${formatBytes(sizeBytes)}</div>
      </div>
      <div id="status-\${id}" style="color:#fbbf24; font-weight:600;">Queued</div>
    </div>

    <div style="margin-top:10px; width:100%; background:#1f2937; height:8px; border-radius:6px; overflow:hidden;">
      <div id="bar-\${id}" style="height:8px; width:0%; background:#3b82f6;"></div>
    </div>

    <div id="actions-\${id}" style="margin-top:10px;"></div>
  `;

  resultsDiv.appendChild(card);
}

export function updateItemProgress(id, ratio) {
  const bar = document.getElementById(`bar-${id}`);
  const status = document.getElementById(`status-${id}`);
  if (bar) bar.style.width = `${Math.min(100, Math.max(0, Math.round(ratio * 100)))}%`;
  if (status) {
    status.textContent = `Processing ${Math.round(ratio * 100)}%`;
    status.style.color = "#60a5fa";
  }
}

export function setItemConverted(id, blob, downloadName) {
  const status = document.getElementById(`status-${id}`);
  const bar = document.getElementById(`bar-${id}`);
  const actions = document.getElementById(`actions-${id}`);

  if (bar) bar.style.width = "100%";
  if (status) {
    status.textContent = "Converted";
    status.style.color = "#22c55e";
  }
  if (actions) {
    const a = document.createElement("a");
    a.textContent = "Download";
    a.href = URL.createObjectURL(blob);
    a.download = downloadName;
    a.style.color = "#60a5fa";
    a.style.textDecoration = "none";
    a.style.fontWeight = "600";
    actions.innerHTML = "";
    actions.appendChild(a);
  }
}

export function setItemError(id, message = "Error") {
  const status = document.getElementById(`status-${id}`);
  if (status) {
    status.textContent = message;
    status.style.color = "#ef4444";
  }
}
