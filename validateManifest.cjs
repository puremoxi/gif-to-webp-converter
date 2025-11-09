// validateManifest.cjs — boot-time validation for version.json and vendor artifacts
const fs = require('fs');
const path = require('path');
function toRegex(glob){ const esc=glob.replace(/[.+^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*'); return new RegExp('^'+esc+'$'); }
function listFilesRecursive(dir){ const out=[]; if(!fs.existsSync(dir)) return out; const st=fs.statSync(dir); if(st.isFile()) return [dir]; const stack=[dir]; while(stack.length){ const d=stack.pop(); for(const n of fs.readdirSync(d)){ const p=path.join(d,n); const s=fs.statSync(p); if(s.isDirectory()) stack.push(p); else out.push(p); } } return out; }
function validate(){
  const root=__dirname; const manifestPath=path.join(root,'version.json'); const vendorDir=path.join(root,'vendor','ffmpeg');
  if(!fs.existsSync(manifestPath)){ console.warn('[manifest] version.json not found — skipping validation.'); return; }
  let m; try{ m=JSON.parse(fs.readFileSync(manifestPath,'utf-8')); }catch(e){ console.error('[manifest] Failed to parse version.json:', e.message); return; }
  const errs=[]; if(typeof m.schema_version!=='number') errs.push('schema_version must be number');
  if(!m.app||typeof m.app.version!=='string') errs.push('app.version must be string');
  if(!m.ffmpeg||!m.ffmpeg.required_vendor_artifacts) errs.push('ffmpeg.required_vendor_artifacts is required');
  if(errs.length) console.error('[manifest] Schema errors:', errs.join('; '));
  else console.log(`[manifest] Loaded version ${m.app.version} (schema ${m.schema_version})`);
  if(m.ffmpeg&&m.ffmpeg.requires_coop_coep) console.log('[manifest] Note: COOP/COEP required; this server sets headers.');
  const reqs=Array.isArray(m.ffmpeg?.required_vendor_artifacts)?m.ffmpeg.required_vendor_artifacts:[];
  const files=listFilesRecursive(vendorDir).map(p=>p.replace(root+path.sep,'').replace(/\\/g,'/'));
  for(const pat of reqs){
    if(!pat.includes('*')){
      const abs=path.join(root,pat);
      if(!fs.existsSync(abs)) console.warn(`[manifest] Missing vendor artifact: ${pat}`);
    }else{
      const rx=toRegex(pat);
      const any=files.some(f=>rx.test(f));
      if(!any) console.warn(`[manifest] No files matched glob: ${pat}`);
    }
  }
  console.log('[manifest] Validation complete.');
}
module.exports={ validate };
