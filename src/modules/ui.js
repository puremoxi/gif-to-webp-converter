
export function setupUI(dropzone, fileInput) {
  const q = document.getElementById('quality');
  const qv = document.getElementById('quality-value');
  const loss = document.getElementById('lossless-toggle');
  const mix  = document.getElementById('mixed-toggle');
  const loop = document.getElementById('loop-toggle');
  const still= document.getElementById('still-toggle');

  q.addEventListener('input', () => { qv.textContent = String(q.value); });

  function sync() {
    // Lossless vs Mixed
    if (loss.checked) { mix.checked = false; mix.disabled = true; } else { mix.disabled = false; }
    if (mix.checked)  { loss.checked = false; loss.disabled = true; } else if (!loss.checked) { loss.disabled = false; }
    // Loop vs Still
    if (loop.checked) { still.checked = false; still.disabled = true; } else { still.disabled = false; }
    if (still.checked){ loop.checked = false; loop.disabled = true; } else if (!loop.checked) { loop.disabled = false; }
  }
  [loss, mix, loop, still].forEach(el => el.addEventListener('change', sync));
  sync();

  // Dropzone behaviors
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(n => {
    dropzone.addEventListener(n, e => e.preventDefault(), false);
    document.body.addEventListener(n, e => e.preventDefault(), false);
  });
  ['dragenter', 'dragover'].forEach(n =>
    dropzone.addEventListener(n, () => dropzone.classList.add('dropzone-active'), false)
  );
  ['dragleave', 'drop'].forEach(n =>
    dropzone.addEventListener(n, () => dropzone.classList.remove('dropzone-active'), false)
  );

  dropzone.addEventListener('click', () => fileInput.click());

  document.getElementById('tw-banner-close')?.addEventListener('click', () => {
    document.getElementById('tw-banner')?.classList.add('hidden');
  });
  document.getElementById('ffmpeg-banner-close')?.addEventListener('click', () => {
    document.getElementById('ffmpeg-banner')?.classList.add('hidden');
  });
}

export function addQueuedItem(id, name, size) {
  const r = document.getElementById('results');
  const card = document.createElement('div');
  card.className = 'bg-slate-900/70 border border-slate-700 rounded-xl p-3 space-y-2';
  card.id = `item-${id}`;
  card.innerHTML = `
    <div class="flex justify-between items-center gap-3 flex-wrap">
      <div class="flex items-center gap-3 min-w-[280px]">
        <img id="thumb-${id}" alt="thumbnail" class="w-16 h-16 rounded-lg object-cover bg-gray-800 border border-slate-700"/>
        <div>
          <div class="font-semibold">${name}</div>
          <div class="text-slate-400 text-sm">${(size / 1024).toFixed(1)} KB</div>
          <div id="meta-${id}" class="text-slate-300 text-xs mt-0.5"></div>
        </div>
      </div>
      <div id="status-${id}" class="text-amber-400 font-semibold">Queued</div>
    </div>
    <div class="mt-2 w-full bg-gray-800 h-2 rounded-md overflow-hidden">
      <div id="bar-${id}" class="h-2 w-0 bg-blue-500"></div>
    </div>
    <div id="actions-${id}" class="mt-2 flex gap-2"></div>
  `;
  r.appendChild(card);
}

export function setPlaceholderThumbnail(id) {
  const img = document.getElementById(`thumb-${id}`);
  if (!img) return;
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(0, 0, 64, 64);
  img.src = c.toDataURL('image/png');
}

export function setItemThumbnail(id, url) {
  const img = document.getElementById(`thumb-${id}`);
  if (img) img.src = url;
}

export function setItemMeta(id, info) {
  const m = document.getElementById(`meta-${id}`);
  if (!m) return;
  const res = (info.width && info.height) ? `${info.width}×${info.height}` : '—×—';
  const fps = (typeof info.fps === 'number' && isFinite(info.fps) && info.fps > 0) ? `${info.fps.toFixed(2)} fps` : '— fps';
  const fr  = (typeof info.frames === 'number' && info.frames > 0) ? String(info.frames).padStart(4, '0') : '0000';
  const kind = info.animated ? 'animation sequence' : 'still image';
  m.textContent = `${res} • ${fps} • ${fr} frames • ${kind}`;
}

export function updateItemProgress(id, ratio) {
  const b = document.getElementById(`bar-${id}`);
  const s = document.getElementById(`status-${id}`);
  if (b) b.style.width = Math.round(ratio * 100) + '%';
  if (s) {
    s.textContent = 'Processing ' + Math.round(ratio * 100) + '%';
    s.classList.remove('text-amber-400');
    s.classList.add('text-blue-400');
  }
}

export function setItemConverted(id, _blob, _name) {
  const s = document.getElementById(`status-${id}`);
  const b = document.getElementById(`bar-${id}`);
  const a = document.getElementById(`actions-${id}`);
  if (b) b.style.width = '100%';
  if (s) {
    s.textContent = 'Converted';
    s.classList.remove('text-blue-400');
    s.classList.add('text-green-500');
  }
  if (a) a.innerHTML = '';
}

export function setItemError(id, msg) {
  const s = document.getElementById(`status-${id}`);
  if (s) {
    s.textContent = msg || 'Error';
    s.classList.remove('text-blue-400', 'text-amber-400');
    s.classList.add('text-red-500');
  }
}

export const bannerCtl = {
  show() { document.getElementById('ffmpeg-banner')?.classList.remove('hidden'); },
  hide() { document.getElementById('ffmpeg-banner')?.classList.add('hidden'); },
  step(step, total, label) {
    const f = document.getElementById('ffmpeg-banner-file');
    const c = document.getElementById('ffmpeg-banner-count');
    const bar = document.getElementById('ffmpeg-banner-bar');
    if (f) f.textContent = label;
    if (c) c.textContent = `${(step - 1 < 0 ? 0 : step - 1)} / ${total} complete`;
    if (bar) bar.style.width = '0%';
  }
};

export function pct(p) {
  const bar = document.getElementById('ffmpeg-banner-bar');
  if (bar) bar.style.width = Math.round(p) + '%';
}

export function wireSaveButtons(id, blob, name, saveWithPicker) {
  const container = document.querySelector(`#item-${id} #actions-${id}`) || document.getElementById(`actions-${id}`);
  if (!container) return;
  container.innerHTML = '';

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save as…';
  saveBtn.className = 'bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold py-1.5 px-3 rounded';
  saveBtn.addEventListener('click', async () => {
    const ok = await saveWithPicker(blob, name);
    if (!ok) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = name;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  });

  const directBtn = document.createElement('button');
  directBtn.textContent = 'Direct download';
  directBtn.className = 'bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-semibold py-1.5 px-3 rounded';
  directBtn.addEventListener('click', () => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = name;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });

  container.appendChild(saveBtn);
  container.appendChild(directBtn);
}
