/**
 * inject-icon.mjs
 * Injects build/icon.ico into dist/ShrinkRay.exe's PE resource table.
 * Uses resedit (pure JS) — no Wine or Windows required.
 */
import * as ResEdit from 'resedit';
import * as PE      from 'resedit/pe';
import fs           from 'fs';
import path         from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root      = path.resolve(__dirname, '..');

const exePath   = path.join(root, 'dist', 'ShrinkRay.exe');
const icoPath   = path.join(root, 'build', 'icon.ico');

if (!fs.existsSync(exePath)) {
  console.error('dist/ShrinkRay.exe not found — run npm run build:exe first');
  process.exit(1);
}
if (!fs.existsSync(icoPath)) {
  console.error('build/icon.ico not found — run npm run build:icon first');
  process.exit(1);
}

const exeData = fs.readFileSync(exePath);
const icoData = fs.readFileSync(icoPath);

const exe = PE.NtExecutable.from(exeData);
const res = PE.NtExecutableResource.from(exe);

const iconFile   = ResEdit.Data.IconFile.from(icoData.buffer);
ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
  res.entries,
  1,          // resource ID — pkg uses 1 for the app icon slot
  1033,       // en-US LCID
  iconFile.icons.map(i => i.data)
);

res.outputResource(exe);
const out = exe.generate();
fs.writeFileSync(exePath, Buffer.from(out));
console.log(`Icon injected → ${exePath}`);
