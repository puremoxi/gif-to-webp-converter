'use strict';
const ResEdit = require('resedit');
const fs      = require('fs');
const path    = require('path');

const root    = path.resolve(__dirname, '..');
const exePath = path.join(root, 'dist', 'ShrinkRay.exe');
const icoPath = path.join(root, 'build', 'icon.ico');

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

const exe      = ResEdit.NtExecutable.from(exeData);
const res      = ResEdit.NtExecutableResource.from(exe);
const iconFile = ResEdit.Data.IconFile.from(icoData.buffer.slice(icoData.byteOffset, icoData.byteOffset + icoData.byteLength));

ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
  res.entries,
  1,     // resource ID pkg reserves for app icon
  1033,  // en-US LCID
  iconFile.icons.map(i => i.data)
);

res.outputResource(exe);
const out = exe.generate();
fs.writeFileSync(exePath, Buffer.from(out));
console.log('Icon injected → ' + exePath);
