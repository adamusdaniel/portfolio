import {cp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'dist');
await writeFile(path.join(root,'server/deployment.mjs'),'export default '+JSON.stringify({branch:process.env.BRANCH||'',context:process.env.CONTEXT||''})+';\n');
await rm(out,{recursive:true,force:true});await mkdir(out);
const script=await readFile(path.join(root,'content/projects.js'),'utf8');
const data=JSON.parse(script.slice(script.indexOf('=')+1).trim().replace(/;$/,''));
if(JSON.stringify(Object.keys(data.cases).sort())!==JSON.stringify(['buchfix','loyalty','niewidomi'])) throw Error('Unexpected public project catalog');
// Copy only assets referenced by the three public cases and the shared shell.
// No legacy HTML, project folders, thumbnails or server source can reach the CDN.
const files=['index.html','content/projects.js','css/portfolio-v2.css','js/portfolio-v2.js','images/favicon-white.svg','images/thumbnail-v2.png','files/DanielAdamusCV.pdf','robots.txt','sitemap.xml',...new Set(Object.values(data.images).filter(v=>!v.startsWith('data:')))];
for(const name of files) {
 if(name.includes('..')||path.isAbsolute(name)) throw Error('Unsafe public asset');
 await mkdir(path.dirname(path.join(out,name)),{recursive:true});await cp(path.join(root,name),path.join(out,name));
}
await cp(path.join(root,'owner'),path.join(out,'owner'),{recursive:true});
console.log('Built public site in dist/ (only Buchfix, Loyalty and Moovit; private assets and legacy pages excluded).');

await mkdir(path.join(out,"owner/repository"),{recursive:true});
for(const [source,target] of [["publish.py","publish.py"],[".github/workflows/publish.yml","publish-workflow.yml"],["README.md","README.md"],["gitignore.txt","gitignore.txt"]]) await cp(path.join(root,"tools/private-repo",source),path.join(out,"owner/repository",target));
