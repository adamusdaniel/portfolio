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
async function create(s,cookie,label='Test company',days,password) {const r=await s.request('owner/grants',{cookie,data:{label,...(days?{days}:{}),...(password!==undefined?{password}:{})}});assert.equal(r.status,201);return r.json();}
async function login(s,password) {return s.request('access/login',{data:{password}});}
async function image(s,cookie) {const r=await s.request('owner/images',{cookie,data:{base64:png.toString('base64')}});assert.equal(r.status,200);return (await r.json()).url.replace('/api/','');}
async function lifecycle(s,custom=false) {
 const o=await owner(s), a=await create(s,o,'Test company',undefined,custom?'Three easy words!':undefined), b=await create(s,o,'Other company',undefined,custom?'Another easy phrase!':undefined);
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
 const reset=await s.request(`owner/grants/${a.grant.id}/reset`,{cookie:o,data:{version:a.grant.version,...(custom?{password:'My new easy phrase!'}:{})}});assert.equal(reset.status,200);const updated=await reset.json();
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
 const freshOwner=await owner(s);assert.equal((await s.request(`owner/grants/${b.grant.id}/delete`,{cookie:freshOwner,data:{version:b.grant.version}})).status,200);
 assert.equal((await login(s,b.password)).status,401);assert.equal(await s.store.get(`used-${b.grant.id}`,{type:'json'}),null);
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
  await lifecycle(setup(store)); await lifecycle(setup(store),true);
 }
 finally{await server.stop();await rm(directory,{recursive:true,force:true});}
});
test('CSRF, methods, forged cookies, owner password rotation and missing configuration',async()=>{
 const s=setup(),o=await owner(s);
 assert.equal((await s.request('owner/grants',{cookie:o,data:{label:'CSRF'},headers:{Origin:'https://evil.test'}})).status,403);
 assert.equal((await s.request('owner/grants',{cookie:o,data:{label:'CSRF'},headers:{Origin:''}})).status,403);
 assert.equal((await s.request('owner/grants',{method:'DELETE',cookie:o})).status,405);
 assert.equal((await s.request('owner/grants',{cookie:o+'tampered'})).status,401);
 s.env.ACCESS_OWNER_PASSWORD_HASH=s.env.ACCESS_OWNER_PASSWORD_HASH.replace(/.$/,c=>c==='0'?'1':'0');
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
test('public build excludes backend, credential files, backups and tools; only three cases stay public',async()=>{
 const root=path.resolve(import.meta.dirname,'../dist');
 const names=await readdir(root);for(const forbidden of ['server','netlify','tools','node_modules','.htpasswd','.env','.git']) assert(!names.includes(forbidden),forbidden);
 assert(!await readdir(path.join(root,'content')).then(names=>names.includes('tauron')));
 const script=await readFile(path.join(root,'content/projects.js'),'utf8');
 assert(!script.includes('tauron-search'));assert(!script.includes('swissprive'));
 assert.deepEqual(Object.keys(JSON.parse(script.split('=').slice(1).join('=').trim().replace(/;$/,'')).cases),['buchfix','loyalty','niewidomi']);
 for(const name of ['subpages','light','portfolio_gallery.html','gratefulme.html']) assert(!names.includes(name),name);
 assert(!(await readFile(path.join(root,'js/portfolio-v2.js'),'utf8')).includes('VAULT_DATA'));
});

test('chosen passwords: complete lifecycle and isolation',async()=>lifecycle(setup(),true));
test('chosen password validation, uniqueness, failed reset and session-key rotation',async()=>{
 const s=setup(),o=await owner(s);
 for(const password of ['short',' leading spaces!','trailing spaces! ','x'.repeat(129),123]) {
  assert.equal((await s.request('owner/grants',{cookie:o,data:{label:'Invalid',password}})).status,400);
 }
 const password='My chosen phrase!';
 const responses=await Promise.all([1,2].map(()=>s.request('owner/grants',{cookie:o,data:{label:'Same password',password}})));
 assert.deepEqual(responses.map(r=>r.status).sort(),[201,409]);
 const a=await responses.find(r=>r.status===201).json();assert.equal(a.password,password);
 const oldCookie=s.cookie(await login(s,password));
 const fail=s.store.setJSON.bind(s.store);
 s.store.setJSON=async(key,data,options)=>key===`grants-${a.grant.id}` ? {modified:false} : fail(key,data,options);
 const reset=await s.request(`owner/grants/${a.grant.id}/reset`,{cookie:o,data:{version:a.grant.version,password:'Failed reset phrase!'}});
 assert.equal(reset.status,409); assert.equal((await login(s,'Failed reset phrase!')).status,401);
 assert.equal((await login(s,password)).status,200);
 s.store.setJSON=fail;
 s.env.ACCESS_SESSION_SECRET='different-session-key-for-rotation-test-only-12345';
 assert.equal((await s.request('access/session',{cookie:oldCookie})).status,401);
 assert.equal((await login(s,password)).status,200);
 const list=await (await s.request('owner/grants',{cookie:await owner(s)})).json();
 assert(!JSON.stringify(list).includes(password));assert(!JSON.stringify([...s.store.entries]).includes(password));
});

test('non-expiring access: survives time passage, sessions remain short, reset and revoke still work',async()=>{
 const s=setup();let o=await owner(s);
 const response=await s.request('owner/grants',{cookie:o,data:{label:'Generic access',password:'Shared permanent phrase!',noExpiry:true}});
 assert.equal(response.status,201);const a=await response.json();assert.equal(a.grant.expiresAt,null);
 const initial=s.cookie(await login(s,a.password));const first=s.now();
 s.advance(400*86400000);
 assert.equal((await s.request('private/content',{cookie:initial})).status,401);
 const r=await login(s,a.password);assert.equal(r.status,200);assert.match(r.headers.get('set-cookie'),/Max-Age=86400/);
 const c=s.cookie(r);assert.equal((await s.request('private/content',{cookie:c})).status,200);
 o=await owner(s);
 const reset=await s.request(`owner/grants/${a.grant.id}/reset`,{cookie:o,data:{version:a.grant.version,password:'Replacement permanent phrase!'}});
 assert.equal(reset.status,200);const updated=await reset.json();
 assert.equal(updated.grant.expiresAt,null);assert.equal(updated.grant.firstUsedAt,first);
 assert.equal((await login(s,a.password)).status,401);
 assert.equal((await s.request('private/content',{cookie:c})).status,401);
 const active=s.cookie(await login(s,updated.password));
 assert.equal((await s.request(`owner/grants/${a.grant.id}/revoke`,{cookie:o,data:{version:updated.grant.version}})).status,200);
 assert.equal((await login(s,updated.password)).status,401);
 assert.equal((await s.request('private/content',{cookie:active})).status,401);
 assert.equal((await s.request('owner/grants',{cookie:o,data:{label:'Invalid',noExpiry:'true'}})).status,400);
});

test('deletion: owner only, both password formats invalidated, data removed, other recipients preserved',async()=>{
 const s=setup(),o=await owner(s);
 for(const chosen of [undefined,'Chosen deletion phrase!']) {
  const a=await create(s,o,'Delete this label',undefined,chosen),b=await create(s,o,'Keep this label');
  const cookie=s.cookie(await login(s,a.password));
  const url=await image(s,o);
  const endpoint=`owner/grants/${a.grant.id}/delete`;
  assert.equal((await s.request(endpoint,{data:{version:a.grant.version}})).status,401);
  assert.equal((await s.request(endpoint,{cookie,data:{version:a.grant.version}})).status,401);
  assert.equal((await s.request(endpoint,{cookie:o,data:{version:'stale'}})).status,409);
  assert.equal((await login(s,a.password)).status,200);
  assert.equal((await s.request(endpoint,{cookie:o,data:{version:a.grant.version}})).status,200);
  assert.equal((await login(s,a.password)).status,401);
  for(const path of ['private/content','access/session',url]) assert.equal((await s.request(path,{cookie})).status,401);
  const list=await (await s.request('owner/grants',{cookie:o})).json();assert(!list.grants.some(g=>g.id===a.grant.id));
  const tombstone=await s.store.get(`grants-${a.grant.id}`);assert.equal(tombstone.deleted,true);assert(!tombstone.label);assert(!tombstone.passwordHash);
  assert.equal(await s.store.get(`used-${a.grant.id}`),null);
  assert.equal((await login(s,b.password)).status,200);
  assert.equal((await s.request(endpoint,{cookie:o,data:{version:a.grant.version}})).status,200);
  assert.equal((await s.request(`owner/grants/${a.grant.id}/reset`,{cookie:o,data:{version:a.grant.version,password:'No resurrection phrase!'}})).status,404);
 }
});
test('concurrent reset and deletion cannot resurrect deleted access',async()=>{
 const s=setup(),o=await owner(s),a=await create(s,o,'Concurrency',undefined,'Delete race old phrase!');
 const responses=await Promise.all([
  s.request(`owner/grants/${a.grant.id}/delete`,{cookie:o,data:{version:a.grant.version}}),
  s.request(`owner/grants/${a.grant.id}/reset`,{cookie:o,data:{version:a.grant.version,password:'Delete race new phrase!'}})
 ]);
 assert.equal(responses[0].status,200);assert([404,409].includes(responses[1].status));
 assert.equal((await login(s,a.password)).status,401);assert.equal((await login(s,'Delete race new phrase!')).status,401);
 assert.equal((await s.store.get(`grants-${a.grant.id}`)).deleted,true);
});


test('recipient minimum length is six for creation and reset',async()=>{
 const s=setup(),o=await owner(s);
 const bad=await s.request('owner/grants',{cookie:o,data:{label:'Too short',password:'abcde'}});assert.equal(bad.status,400);
 const a=await create(s,o,'Six characters',undefined,'abcdef');assert.equal((await login(s,'abcdef')).status,200);
 const shortReset=await s.request(`owner/grants/${a.grant.id}/reset`,{cookie:o,data:{version:a.grant.version,password:'12345'}});assert.equal(shortReset.status,400);
 assert.equal((await login(s,'abcdef')).status,200);
 const reset=await s.request(`owner/grants/${a.grant.id}/reset`,{cookie:o,data:{version:a.grant.version,password:'ghijkl'}});assert.equal(reset.status,200);
 assert.equal((await login(s,'abcdef')).status,401);assert.equal((await login(s,'ghijkl')).status,200);
 const html=await readFile(new URL('../owner/index.html',import.meta.url),'utf8');
 assert.match(html,/id="recipientPassword"[^>]*minlength="6"/);assert.match(html,/id="resetPassword"[^>]*minlength="6"/);
});

test('typographic private cases import additively without dropping existing projects',async()=>{
 const s=setup(),o=await owner(s),url=await image(s,o);
 assert.equal((await s.request('owner/content',{cookie:o,data:fixture('/api/'+url)})).status,200);
 const data={cards:[{slug:'text-only',title:'Text case',desc:'Test only',tags:['Web'],cover:'typographic',coverLabel:'Text case'}],cases:{'text-only':{type:'long',title:'Text case',details:[['Role','Designer']],chapters:[{id:'research',label:'Research'}],blocks:[{t:'h',lvl:3,id:'research',v:'Research'},{t:'p',v:'Private test narrative.'}]}},img:{}};
 assert.equal((await s.request('owner/content/import',{data})).status,401);
 assert.equal((await s.request('owner/content/import',{cookie:o,data})).status,200);
 let saved=await s.store.get('content-current');assert.deepEqual(saved.cards.map(c=>c.slug),['test-only','text-only']);assert(saved.img['private/test.png']);
 data.cases['text-only'].title='Updated text case';assert.equal((await s.request('owner/content/import',{cookie:o,data})).status,200);
 saved=await s.store.get('content-current');assert.equal(saved.cards.length,2);assert.equal(saved.cases['text-only'].title,'Updated text case');
 assert.equal((await s.request('private/content')).status,401);
 const a=await create(s,o);const cookie=s.cookie(await login(s,a.password));assert((await (await s.request('private/content',{cookie})).json()).cases['text-only']);
 const broken=structuredClone(data);delete broken.cards[0].cover;assert.equal((await s.request('owner/content/import',{cookie:o,data:broken})).status,400);
});
test('additive import uses conditional writes to preserve simultaneous content changes',async()=>{
 const s=setup(),o=await owner(s);
 const template=slug=>({cards:[{slug,title:slug,desc:'Test only',tags:['Web'],cover:'typographic'}],cases:{[slug]:{type:'long',title:slug,details:[],blocks:[]}},img:{}});
 const responses=await Promise.all(['first-case','second-case'].map(slug=>s.request('owner/content/import',{cookie:o,data:template(slug)})));
 assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
 assert.equal((await s.store.get('content-current')).cards.length,1);
});
