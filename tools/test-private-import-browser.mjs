// Generic private-case import test. Optional external content stays outside Git.
import {chromium} from 'playwright';
import https from 'node:https';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {execFileSync,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {createArchive,ARCHIVE_COMMIT} from '../server/archive.mjs';
import {createAccess} from '../server/access.mjs';
import {validateContent} from '../server/content.mjs';
import {setup,png,fixture} from './test-support.mjs';
const temp=await mkdtemp(path.join(os.tmpdir(),'private-import-'));
const data=process.env.PRIVATE_CASE_FILE?JSON.parse(await readFile(process.env.PRIVATE_CASE_FILE,'utf8')):{cards:[{slug:'text-case',title:'Private text fixture',desc:'Automated test only',tags:['Web'],cover:'typographic',coverLabel:'Private fixture'}],cases:{'text-case':{type:'long',title:'Private text fixture',tags:['Web'],details:[['Role','Designer']],chapters:[{id:'chapter-one',label:'First chapter'},{id:'chapter-two',label:'Second chapter'}],blocks:[{t:'p',v:'Private test introduction.'},{t:'h',lvl:3,id:'chapter-one',v:'First chapter'},...Array.from({length:8},()=>({t:'p',v:'Private test narrative. '.repeat(30)})),{t:'h',lvl:3,id:'chapter-two',v:'Second chapter'},...Array.from({length:8},()=>({t:'p',v:'Private test conclusion. '.repeat(30)}))]}},img:{}};
const slug=data.cards[0].slug,c=data.cases[slug];
let server,browser;
try {
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',path.join(temp,'key.pem'),'-out',path.join(temp,'cert.pem'),'-days','1','-subj','/CN=localhost'],{stdio:'ignore'});
 const s=setup(),archive=process.env.PRIVATE_ARCHIVE_TEST?createArchive({store:s.store,fetchSource:async url=>new Response(execFileSync('git',['show',ARCHIVE_COMMIT+':'+url.split(ARCHIVE_COMMIT+'/')[1]],{maxBuffer:50000000}))}):undefined,handle=createAccess({store:s.store,env:s.env,archive,verifySync:async request=>{if(request.headers.get('authorization')!=='Bearer browser-test-publisher')throw Error('Denied');}});
 server=https.createServer({key:await readFile(path.join(temp,'key.pem')),cert:await readFile(path.join(temp,'cert.pem'))},async(req,res)=>{
  try {
   const origin=`https://localhost:${server.address().port}`;
   if(req.url.startsWith('/identity?')){res.writeHead(req.headers.authorization==='Bearer test-job'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify({value:'browser-test-publisher'}));return;}
   if(req.url.startsWith('/api/')) {
    const chunks=[];for await(const chunk of req)chunks.push(chunk);
    const response=await handle(new Request(origin+req.url,{method:req.method,headers:req.headers,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})}));
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
   }
   const relative=new URL(req.url,origin).pathname,file=path.resolve('dist','.'+relative+(relative.endsWith('/')?'index.html':''));
   if(!file.startsWith(path.resolve('dist')+path.sep))throw Error('bad path');
   const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.webp':'image/webp'};
   const bytes=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(bytes);
  }catch{res.writeHead(404);res.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`https://localhost:${server.address().port}`;
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const anonymous=await browser.newContext({ignoreHTTPSErrors:true});
 assert.equal((await anonymous.request.get(base+'/api/private/content')).status(),401);
 const locked=await anonymous.newPage();await locked.goto(base+'/#private/'+slug);await locked.locator('#moreLocked').waitFor();assert(!(await locked.content()).includes(c.title));await anonymous.close();
 const owner=await browser.newContext({ignoreHTTPSErrors:true});
 const post=(url,data)=>owner.request.post(base+'/api/owner/'+url,{headers:{Origin:base},data});
 assert.equal((await post('login',{password:s.password})).status(),200);
 const image=await (await post('images',{base64:png.toString('base64')})).json();assert.equal((await post('content',fixture(image.url))).status(),200);
 const page=await owner.newPage();await page.goto(base+'/owner/');await page.locator('#panel').waitFor();
 const bundle=path.join(temp,'private-case.json');await writeFile(bundle,JSON.stringify(data));
 await page.locator('summary').click();await page.locator('#bundle').setInputFiles(bundle);await page.locator('#upload button').click();await page.getByText(/^Projekty wgrane\./).waitFor();
 for(const text of [JSON.stringify(data),'PORTFOLIO_BUNDLE_V1:'+gzipSync(JSON.stringify(data)).toString('base64')]) {
  await page.locator('#bundleText').fill(text);await page.locator('#upload button').click();await page.getByText(/^Projekty wgrane\./).waitFor();assert.equal(await page.locator('#bundleText').inputValue(),'');
 }
 const headerBytes=process.env.PRIVATE_HEADER_IMAGE?await readFile(process.env.PRIVATE_HEADER_IMAGE):png;
 const headerKey='private/test-header.png';
 await page.locator('#bundleText').fill(JSON.stringify({headerUpdates:[{slug,image:headerKey}],img:{[headerKey]:'data:image/png;base64,'+headerBytes.toString('base64')}}));
 await page.locator('#upload button').click();await page.getByText(/^Projekty wgrane\./).waitFor();assert.equal(await page.locator('#bundleText').inputValue(),'');
 await page.locator('#headerProject').selectOption(slug);
 await page.locator('#headerFile').setInputFiles({name:'header.png',mimeType:'image/png',buffer:headerBytes});
 await page.locator('#headerUpload button').click();await page.locator('#headerStatus').filter({hasText:'Nagłówek zapisany.'}).waitFor();
 await page.locator('#headerPreview').evaluate(img=>img.decode());
 const projectList=await (await owner.request.get(base+'/api/owner/projects')).json();
 const ownerImage=projectList.projects.find(p=>p.slug===slug).header;
 assert.equal((await (await browser.newContext({ignoreHTTPSErrors:true})).request.get(base+ownerImage)).status(),401);
 assert.deepEqual(Buffer.from(await (await owner.request.get(base+ownerImage)).body()),headerBytes);
 const downloadEvent=page.waitForEvent('download');await page.locator('#exportRepository').click();
 const download=await downloadEvent,zipFile=path.join(temp,'private-repository.zip');await download.saveAs(zipFile);
 const extracted=path.join(temp,'exported');
 execFileSync('python3',['-c',"import zipfile,sys,pathlib; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; assert '.github/workflows/publish.yml' in z.namelist(); z.extractall(sys.argv[2])",zipFile,extracted]);
 execFileSync('python3',[path.join(extracted,'publish.py'),'--check']);
 const sourceCheck=execFileSync('python3',['-c',`import importlib.util,sys,json,hashlib
spec=importlib.util.spec_from_file_location('p',sys.argv[1]+'/publish.py'); p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
data,images,inline=p.sources(sys.argv[1]);data['img']={key:'/api/private/images/'+hashlib.sha256(raw).hexdigest() for key,raw in images.items()}
text=json.dumps(data['cases'])
for old,key in inline.items():text=text.replace(old,data['img'][key])
data['cases']=json.loads(text)
print(json.dumps(data))`,extracted],{maxBuffer:5000000});
 validateContent(JSON.parse(sourceCheck.toString()));
 await promisify(execFile)('python3',['-c',`import importlib.util,sys,os,ssl
ssl._create_default_https_context=ssl._create_unverified_context
spec=importlib.util.spec_from_file_location('p',sys.argv[1]+'/publish.py');p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
p.SITE=sys.argv[2]
os.environ.update(GITHUB_REPOSITORY='adamusdaniel/portfolio-private',GITHUB_REF='refs/heads/v2',ACTIONS_ID_TOKEN_REQUEST_URL=sys.argv[2]+'/identity?test=1',ACTIONS_ID_TOKEN_REQUEST_TOKEN='test-job')
p.main()`,extracted,base]);


 const exported=JSON.parse(await readFile(path.join(extracted,'projects',slug,'project.json'),'utf8'));
 assert.deepEqual(exported.case.blocks,c.blocks);
 assert.deepEqual(await readFile(path.join(extracted,'projects',slug,exported.img['private/'+slug+'/header'])),headerBytes);
 const grant=await (await post('grants',{label:'Import test',password:'Import123',noExpiry:true})).json();
 const recipient=await browser.newContext({ignoreHTTPSErrors:true});
 assert.equal((await recipient.request.post(base+'/api/access/login',{headers:{Origin:base},data:{password:grant.password}})).status(),200);
 const content=await (await recipient.request.get(base+'/api/private/content')).json();assert(content.cases['test-only']);assert(content.cases[slug]);assert.equal(content.cards.length,process.env.PRIVATE_ARCHIVE_TEST?10:2);assert.equal(content.cases[slug].hero,'private/'+slug+'/header');assert.deepEqual(content.cases[slug].blocks,c.blocks);const headerUrl=content.img[content.cases[slug].hero];assert.deepEqual(Buffer.from(await (await recipient.request.get(base+headerUrl)).body()),headerBytes);
 const view=await recipient.newPage(),errors=[];view.on('pageerror',e=>errors.push(e.message));await view.route('https://fonts.googleapis.com/**',r=>r.abort());
 for(const width of [375,390,768,1280,1440]) {
  await view.setViewportSize({width,height:950});await view.goto(base+'/#private/'+slug);await view.locator('#caseRoot h1').waitFor();assert.equal(await view.locator('#caseRoot h1').textContent(),c.title);
  assert(!await view.evaluate(()=>document.documentElement.scrollWidth>innerWidth));assert.equal(await view.locator('.case-chapters button').count(),c.chapters.length);
  for(const chapter of c.chapters){await view.locator(`[data-case-anchor="${chapter.id}"]`).click();await view.waitForTimeout(1350);assert(await view.locator('#'+chapter.id).evaluate(e=>e.getBoundingClientRect().top>=document.getElementById('nav').getBoundingClientRect().bottom+20));}
 }
 await view.goto(base+'/#all-projects');await view.locator('#more-grid').waitFor();assert.equal(await view.locator(`a[href="#private/${slug}"] .card-cover-type`).count(),1);
 await view.locator(`a[href="#private/${slug}"]`).click();await view.locator('#caseRoot h1').waitFor();assert.deepEqual(errors,[]);
 if(process.env.PRIVATE_CASE_PDF){await view.addStyleTag({content:'@media print{.nav,footer,.socials,.foot,.lb,.case-more,.case-top,.back-sm,.case-chapters{display:none!important}.view{display:none!important}#view-case{display:block!important}.case-body{break-inside:auto}.case-body h2{break-after:avoid}.case-media-pending,.x-cards,.x-stat,.detail{break-inside:avoid}#caseRoot{max-width:none;padding:0 20px}.bg,.dust{display:none}body{background:#2b2828}}'});await view.pdf({path:process.env.PRIVATE_CASE_PDF,format:'A4',printBackground:true,margin:{top:'15mm',bottom:'15mm',left:'12mm',right:'12mm'}});}
 console.log('PASS private import and repository export: original bytes; valid ZIP/workflow; publisher source validation; anonymous denial; chapter navigation; 375/390/768/1280/1440px; existing content preserved.');
 await owner.close();await recipient.close();
}finally{await browser?.close();if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}await rm(temp,{recursive:true,force:true});}
