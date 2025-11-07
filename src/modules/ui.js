// src/modules/ui.js

export function setupUI(dropzone, fileInput) {
  const qualitySlider = document.getElementById("quality");
  const qualityValue = document.getElementById("quality-value");

  // Update quality text live
  qualitySlider.addEventListener("input", () => {
    qualityValue.textContent = qualitySlider.value;
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
  return {
    lossless: document.getElementById("lossless-toggle").checked,
    quality: parseInt(document.getElementById("quality").value, 10),
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

/* ---------- Per-file rows + progress ---------- */

export function addQueuedItem(id, name, sizeBytes) {
  const resultsDiv = document.getElementById("results");

  const card = document.createElement("div");
  card.className = "card";
  card.id = `item-${id}`;

  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap">
      <div style="min-width:200px;">
        <div style="font-weight:600;">${name}</div>
        <div style="color:#94a3b8; font-size:14px;">${formatBytes(sizeBytes)}</div>
      </div>
      <div id="status-${id}" style="color:#fbbf24; font-weight:600;">Queued</div>
    </div>

    <div style="margin-top:10px; width:100%; background:#1f2937; height:8px; border-radius:6px; overflow:hidden;">
      <div id="bar-${id}" style="height:8px; width:0%; background:#3b82f6;"></div>
    </div>

    <div id="actions-${id}" style="margin-top:10px;"></div>
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
