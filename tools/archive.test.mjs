import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {access,readFile} from 'node:fs/promises';
import path from 'node:path';
import {createArchive,ARCHIVE_COMMIT} from '../server/archive.mjs';
import {MemoryStore,setup,png} from './test-support.mjs';
test('private archive: pinned source, eight unchanged cases, protected media, persistent bootstrap and asset migration',async()=>{
 const store=new MemoryStore();let calls=0;
 const fetchSource=async url=>{
  calls++;assert(url.startsWith(`https://raw.githubusercontent.com/adamusdaniel/portfolio/${ARCHIVE_COMMIT}/`));
  const file=new URL(url).pathname.split('/').slice(4).join('/');
  return new Response(execFileSync('git',['show',`${ARCHIVE_COMMIT}:${file}`],{maxBuffer:10000000}));
 };
 const archive=createArchive({store,fetchSource}),s=setup(store,undefined,{archive});
 assert.equal((await s.request('private/content')).status,401);assert.equal(calls,0);
 const o=s.cookie(await s.request('owner/login',{data:{password:s.password}}));
 const a=await (await s.request('owner/grants',{cookie:o,data:{label:'Archive',password:'Archive test phrase!',noExpiry:true}})).json();
 const c=s.cookie(await s.request('access/login',{data:{password:a.password}}));
 const response=await s.request('private/content',{cookie:c});assert.equal(response.status,200);const data=await response.json();
 assert.equal(data.cards.length,8);assert(data.cases['tauron-search']);
 for(const slug of ['buchfix','loyalty','niewidomi']) assert(!Object.hasOwn(data.cases,slug));
 for(const value of Object.values(data.img)) assert.match(value,/^\/api\/private\/images\/[a-f0-9]{64}$/);
 assert(!JSON.stringify(data).includes('data:image/'));
 assert.equal(calls,2);await archive.content();assert.equal(calls,2);
 const url=data.img[data.cases['tauron-search'].hero].slice(5);
 assert.equal((await s.request(url)).status,401);
 const image=await s.request(url,{cookie:c});assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/webp');
 const count=calls;assert.equal((await s.request(url,{cookie:c})).status,200);assert.equal(calls,count);
 const pub=JSON.parse((await readFile('dist/content/projects.js','utf8')).split('=').slice(1).join('=').trim().replace(/;$/,''));
 for(const item of Object.values((await store.get('archive-catalog-v1')).descriptors)) {
  if(item.path && !Object.values(pub.images).includes(item.path)) await assert.rejects(access(path.join('dist',item.path)));
 }
 let result;do {result=await archive.importBatch();} while(result.remaining);
 const noNetwork=createArchive({store,fetchSource:async()=>{throw Error('offline');}});
 assert.equal((await noNetwork.content()).cards.length,8);
 for(const id of Object.keys((await store.get('archive-catalog-v1')).descriptors)) assert(await store.getMetadata(`images-${id}`));
});
test('archive source failure denies access without publishing any catalog',async()=>{
 const store=new MemoryStore(),archive=createArchive({store,fetchSource:async()=>new Response('unavailable',{status:503})});
 const s=setup(store,undefined,{archive}),o=s.cookie(await s.request('owner/login',{data:{password:s.password}}));
 const a=await (await s.request('owner/grants',{cookie:o,data:{label:'Failure'}})).json();
 const c=s.cookie(await s.request('access/login',{data:{password:a.password}}));
 assert.equal((await s.request('private/content',{cookie:c})).status,503);
 assert.equal(await store.get('archive-catalog-v1'),null);
});
