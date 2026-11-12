// Local HTTPS integration, with a transient test owner and test-only content.
import {chromium} from 'playwright';
import https from 'node:https';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createAccess} from '../server/access.mjs';
import {setup,png,fixture} from './test-support.mjs';
const temp=await mkdtemp(path.join(os.tmpdir(),'portfolio-browser-'));
let server,browser;
try {
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',path.join(temp,'key.pem'),'-out',path.join(temp,'cert.pem'),'-days','1','-subj','/CN=localhost'],{stdio:'ignore'});
 const s=setup(),handle=createAccess({store:s.store,env:s.env});
 server=https.createServer({key:await readFile(path.join(temp,'key.pem')),cert:await readFile(path.join(temp,'cert.pem'))},async(req,res)=>{
  try {
   const origin=`https://localhost:${server.address().port}`;
   if(req.url.startsWith('/api/')) {
    const chunks=[];for await(const chunk of req) chunks.push(chunk);
    const response=await handle(new Request(origin+req.url,{method:req.method,headers:req.headers,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})}));
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
   }
   const relative=new URL(req.url,origin).pathname;
   const file=path.resolve('dist','.'+relative+(relative.endsWith('/')?'index.html':''));
   if(!file.startsWith(path.resolve('dist')+path.sep)) throw Error('bad path');
   const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.webp':'image/webp','.png':'image/png'};
   res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(await readFile(file));
  } catch {res.writeHead(404);res.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`https://localhost:${server.address().port}`;
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:950}});
 const owner=await context.newPage();const errors=[];owner.on('pageerror',e=>errors.push(e.message));
 await owner.route('https://fonts.googleapis.com/**',r=>r.abort());
 await owner.goto(base+'/owner/');
 await owner.locator('#ownerPassword').fill('wrong');await owner.locator('#ownerLogin button').click();await owner.getByText('Nieprawidłowe hasło.',{exact:true}).waitFor();
 await owner.locator('#ownerPassword').fill(s.password);await owner.locator('#ownerLogin button').click();await owner.locator('#panel').waitFor();
 assert.equal(await owner.locator('#days').inputValue(),'7');
 await owner.locator('#label').fill('Browser test company');await owner.locator('#create button').click();await owner.locator('#secretBox').waitFor();
 const password=await owner.locator('#newPassword').inputValue();assert(password.length>60);
 for(const width of [375,768,1440]) {
  await owner.setViewportSize({width,height:950});
  assert(!await owner.evaluate(()=>document.documentElement.scrollWidth>innerWidth), 'Owner overflow at '+width);
 }
 assert(await owner.getByText('Nieużyte',{exact:true}).isVisible());
 const bundle=path.join(temp,'fixture.json');await writeFile(bundle,JSON.stringify(fixture('data:image/png;base64,'+png.toString('base64'))));
 await owner.locator('summary').click();await owner.locator('#bundle').setInputFiles(bundle);await owner.locator('#upload button').click();await owner.getByText(/^Projekty wgrane\./).waitFor();
 const recipientContext=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:375,height:900}});const recipient=await recipientContext.newPage();recipient.on('pageerror',e=>errors.push(e.message));
 await recipient.route('https://fonts.googleapis.com/**',r=>r.abort());
 await recipient.goto(base+'/#more-projects');await recipient.locator('#lockPass').fill('wrong');await recipient.locator('#lockBtn').click();await recipient.locator('#lockErr').filter({hasText:'Invalid password'}).waitFor();
 await recipient.locator('#lockPass').fill(password);await recipient.locator('#lockBtn').click();await recipient.locator('#more-grid .card').waitFor();
 const src=await recipient.locator('#more-grid img').getAttribute('src');assert(src.startsWith('/api/private/images/'));
 await recipient.locator('#more-grid img').evaluate(i=>i.decode());
 await recipient.reload();await recipient.locator('#more-grid .card').waitFor();
 await recipient.locator('#more-grid .card').click();await recipient.locator('#caseRoot h1').waitFor();assert.equal(await recipient.locator('#caseRoot h1').textContent(),'Test fixture');
 await owner.locator('#refresh').click();await owner.getByText('Użyte',{exact:true}).waitFor();
 owner.on('dialog',d=>d.accept());await owner.getByRole('button',{name:'Resetuj hasło',exact:true}).click();await owner.getByText('Hasło zostało zresetowane.',{exact:true}).waitFor();
 const resetPassword=await owner.locator('#newPassword').inputValue();assert.notEqual(resetPassword,password);
 assert.equal((await recipient.request.get(base+src)).status(),401);
 await recipient.reload();await recipient.locator('#lockPass').waitFor();
 await recipient.locator('#lockPass').fill(password);await recipient.locator('#lockBtn').click();await recipient.locator('#lockErr').filter({hasText:'Invalid password'}).waitFor();
 await recipient.locator('#lockPass').fill(resetPassword);await recipient.locator('#lockBtn').click();await recipient.locator('#caseRoot h1').waitFor();
 await owner.getByRole('button',{name:'Wyłącz dostęp',exact:true}).click();await owner.getByText('Dostęp został wyłączony.',{exact:true}).waitFor();
 assert.equal((await recipient.request.get(base+'/api/private/content')).status(),401);
 await recipient.evaluate(()=>window.dispatchEvent(new Event('focus')));await recipient.locator('#moreLocked').waitFor();
 await owner.locator('#logout').click();await owner.locator('#login').waitFor();assert.equal((await owner.request.get(base+'/api/owner/grants')).status(),401);
 assert.deepEqual(errors,[]);
 console.log('PASS local HTTPS browser: owner login/create/upload/reset/revoke/logout; recipient wrong password/unlock/image/reload/private case/session invalidation; mobile layout.');
 await context.close();await recipientContext.close();
} finally {
 await browser?.close();if(server) await new Promise(resolve=>server.close(resolve));await rm(temp,{recursive:true,force:true});
}
