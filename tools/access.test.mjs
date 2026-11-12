import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setup,MemoryStore,png,fixture} from './test-support.mjs';
import {createAccess} from '../server/access.mjs';
import {readFile,readdir,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {BlobsServer} from '@netlify/blobs/server';
import {getStore} from '@netlify/blobs';
async function owner(s) {const r=await s.request('owner/login',{data:{password:s.password}});assert.equal(r.status,200);return s.cookie(r);}
async function create(s,cookie,label='Test company',days) {const r=await s.request('owner/grants',{cookie,data:{label,...(days?{days}:{})}});assert.equal(r.status,201);return r.json();}
async function login(s,password) {return s.request('access/login',{data:{password}});}
async function image(s,cookie) {const r=await s.request('owner/images',{cookie,data:{base64:png.toString('base64')}});assert.equal(r.status,200);return (await r.json()).url.replace('/api/','');}
async function lifecycle(s) {
 const o=await owner(s), a=await create(s,o), b=await create(s,o,'Other company');
 assert.equal(a.grant.expiresAt-s.now(),7*86400000);
 assert.equal(a.grant.firstUsedAt,null);
 assert(!JSON.stringify(await (await s.request('owner/grants',{cookie:o})).json()).includes(a.password));
 const url=await image(s,o);
 const published=await s.request('owner/content',{cookie:o,data:fixture('/api/'+url)}); assert.equal(published.status,200);
 assert.equal((await login(s,'incorrect')).status,401);
 for(const endpoint of ['private/content',url,'owner/grants']) assert.equal((await s.request(endpoint)).status,401);
 const r=await login(s,a.password), ac=s.cookie(r); assert.equal(r.status,200);
 assert.match(r.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Strict/);
 assert.equal((await s.request('owner/grants',{cookie:ac})).status,401);
 assert.equal((await s.request('private/content',{cookie:o})).status,401);
 const first=s.now();s.advance(1000);
 await login(s,a.password);
 let list=await (await s.request('owner/grants',{cookie:o})).json();assert.equal(list.grants.find(g=>g.id===a.grant.id).firstUsedAt,first);
 const ir=await s.request(url,{cookie:ac});assert.equal(ir.status,200);assert.equal(ir.headers.get('cache-control'),'private, no-store, max-age=0');assert.deepEqual(Buffer.from(await ir.arrayBuffer()),png);
 const reset=await s.request(`owner/grants/${a.grant.id}/reset`,{cookie:o,data:{version:a.grant.version}});assert.equal(reset.status,200);const updated=await reset.json();
 assert.equal(updated.grant.firstUsedAt,first);assert.equal(updated.grant.expiresAt,a.grant.expiresAt);
 assert.equal((await login(s,a.password)).status,401);
 for(const endpoint of ['private/content',url,'access/session']) assert.equal((await s.request(endpoint,{cookie:ac})).status,401);
 assert.equal((await login(s,b.password)).status,200);
 const renewed=s.cookie(await login(s,updated.password));
 assert.equal((await s.request('private/content',{cookie:renewed})).status,200);
 assert.equal((await s.request(`owner/grants/${a.grant.id}/revoke`,{cookie:o,data:{version:updated.grant.version}})).status,200);
 assert.equal((await login(s,updated.password)).status,401);
 assert.equal((await s.request(url,{cookie:renewed})).status,401);
 assert.equal((await login(s,b.password)).status,200);
 const short=await create(s,o,'Short-lived',1/24), shortCookie=s.cookie(await login(s,short.password));s.advance(3600001);
 assert.equal((await login(s,short.password)).status,401);
 for(const endpoint of ['private/content',url]) assert.equal((await s.request(endpoint,{cookie:shortCookie})).status,401);
}
test('full lifecycle: password, expiry, reset isolation, revoke, first use, API/images and roles',async()=>lifecycle(setup()));
test('actual Netlify Blobs SDK against local emulator: persisted lifecycle',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'portfolio-blobs-'));const server=new BlobsServer({directory,logger:()=>{}});
 try {
  const {port}=await server.start();
  let store;
  // SDK emulator 10.7.13 omits ETag on GET, though production supplies it.
  // Supply its own LIST ETag on the test transport only; real conditional PUT
  // checks still run inside the official emulator. Never weaken production CAS.
  const transport=async(url,options)=>{
    const response=await fetch(url,options);
    const key=new URL(url).pathname.split('/')[3];
    if(options?.method?.toLowerCase()==='get' && key && response.ok && !response.headers.has('etag')) {
      const {blobs}=await store.list();const entry=blobs.find(b=>b.key===decodeURIComponent(key));
      if(entry) {const headers=new Headers(response.headers);headers.set('etag',entry.etag);return new Response(await response.arrayBuffer(),{status:response.status,headers});}
    }
    return response;
  };
  store=getStore({name:'test-access',siteID:'local-test',token:'test-only',edgeURL:`http://127.0.0.1:${port}`,uncachedEdgeURL:`http://127.0.0.1:${port}`,consistency:'strong',fetch:transport});
  await lifecycle(setup(store));
 }
 finally{await server.stop();await rm(directory,{recursive:true,force:true});}
});
test('CSRF, methods, forged cookies, owner password rotation and missing configuration',async()=>{
 const s=setup(),o=await owner(s);
 assert.equal((await s.request('owner/grants',{cookie:o,data:{label:'CSRF'},headers:{Origin:'https://evil.test'}})).status,403);
 assert.equal((await s.request('owner/grants',{cookie:o,data:{label:'CSRF'},headers:{Origin:''}})).status,403);
 assert.equal((await s.request('owner/grants',{method:'DELETE',cookie:o})).status,405);
 assert.equal((await s.request('owner/grants',{cookie:o+'tampered'})).status,401);
 s.env.ACCESS_OWNER_PASSWORD_HASH=s.env.ACCESS_OWNER_PASSWORD_HASH.replace(/.$/,'0');
 assert.equal((await s.request('owner/grants',{cookie:o})).status,401);
 const handler=createAccess({env:{},store:s.store});assert.equal((await handler(new Request('https://portfolio.test/api/private/content'))).status,503);
});
test('simultaneous owner resets cannot both win and first use is immutable under parallel logins',async()=>{
 const s=setup(),o=await owner(s),a=await create(s,o);
 const responses=await Promise.all([1,2].map(()=>s.request(`owner/grants/${a.grant.id}/reset`,{cookie:o,data:{version:a.grant.version}})));
 assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
 const updated=await responses.find(r=>r.status===200).json();
 const first=s.now();await Promise.all(Array.from({length:10},()=>login(s,updated.password)));s.advance(1000);await login(s,updated.password);
 const list=await (await s.request('owner/grants',{cookie:o})).json();assert.equal(list.grants[0].firstUsedAt,first);
 assert(!JSON.stringify([...s.store.entries.values()]).includes(updated.password));
});
test('upload validation, image gate and storage failure fail closed',async()=>{
 const s=setup(),o=await owner(s);
 assert.equal((await s.request('owner/images',{data:{base64:png.toString('base64')}})).status,401);
 assert.equal((await s.request('owner/images',{cookie:o,data:{base64:Buffer.from('<svg/>').toString('base64')}})).status,400);
 assert.equal((await s.request('owner/content',{cookie:o,data:fixture('https://public.test/a.png')})).status,400);
 assert.equal((await s.request('owner/content',{cookie:o,data:fixture('/api/private/images/'+'a'.repeat(64))})).status,400);
 const a=await create(s,o),c=s.cookie(await login(s,a.password));s.store.get=async()=>{throw Error('do not leak secret');};
 const r=await s.request('private/content',{cookie:c});assert.equal(r.status,503);assert(!await r.text().then(x=>x.includes('do not leak')));
});
test('public build excludes backend, credential files, backups and tools; TAURON stays public',async()=>{
 const root=path.resolve(import.meta.dirname,'../dist');
 const names=await readdir(root);for(const forbidden of ['server','netlify','tools','node_modules','.htpasswd','.env','.git']) assert(!names.includes(forbidden),forbidden);
 assert((await readFile(path.join(root,'content/tauron/case.js'),'utf8')).includes('tauron-search'));
 assert(!(await readFile(path.join(root,'js/portfolio-v2.js'),'utf8')).includes('VAULT_DATA'));
});
