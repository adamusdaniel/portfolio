import {cp, mkdir, readdir, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname,'..');
const out = path.join(root,'dist');
await writeFile(path.join(root,'server/deployment.mjs'), 'export default '+JSON.stringify({branch:process.env.BRANCH || '',context:process.env.CONTEXT || ''})+';\n');
await rm(out,{recursive:true,force:true});
await mkdir(out);
// Allowlist only public assets. Backend, tools, backups, credentials and source
// dependencies must never be part of the CDN publish directory.
const dirs = ['content','css','js','images','files','subpages','light','admin','owner'];
for (const name of dirs) await cp(path.join(root,name),path.join(out,name),{recursive:true,filter:p=>!path.basename(p).startsWith('.')});
for (const name of await readdir(root)) {
  if (/\.html$/.test(name) || ['CNAME','robots.txt','sitemap.xml'].includes(name)) await cp(path.join(root,name),path.join(out,name));
}
console.log('Built public site in dist/ (server, tools and private sources excluded).');
