const LEVELS = {
  info:  { label: 'INFO ', color: '#cbd5e1' },
  cmd:   { label: 'CMD  ', color: '#818cf8' },
  ok:    { label: 'OK   ', color: '#4ade80' },
  warn:  { label: 'WARN ', color: '#fbbf24' },
  error: { label: 'ERROR', color: '#f87171' },
};

function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function _append(message, level) {
  const el = document.getElementById('diag-log');
  if (!el) return;
  const { label, color } = LEVELS[level] || LEVELS.info;
  const ts = new Date().toISOString().slice(11, 23);
  const line = document.createElement('div');
  line.style.lineHeight = '1.7';
  line.innerHTML = `<span style="color:#475569">${ts}</span> <span style="color:${color};font-weight:700">[${label}]</span> <span style="color:#e2e8f0">${escapeHtml(message)}</span>`;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

export function log(message, level = 'info') {
  if (!document.getElementById('diag-toggle')?.checked) return;
  _append(message, level);
}

export function logAlways(message, level = 'error') {
  _append(message, level);
}
