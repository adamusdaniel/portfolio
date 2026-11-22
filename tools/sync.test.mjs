import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,exportJWK,createLocalJWKSet,SignJWT} from 'jose';
import {createSyncAuthorizer,assertSyncClaims,SYNC_REPOSITORY,SYNC_AUDIENCE} from '../server/sync.mjs';
import {setup,png,fixture} from './test-support.mjs';
const claims={repository:SYNC_REPOSITORY,repository_visibility:'private',ref:'refs/heads/v2',workflow_ref:SYNC_REPOSITORY+'/.github/workflows/publish.yml@refs/heads/v2',event_name:'push',runner_environment:'github-hosted'};

test('publisher accepts only signed GitHub identity from exact private repository, workflow and v2',async()=>{
 const {privateKey,publicKey}=await generateKeyPair('RS256');
 const verify=createSyncAuthorizer(createLocalJWKSet({keys:[{...await exportJWK(publicKey),kid:'test'}]}));
 const sign=(payload={},options={})=>new SignJWT({...claims,...payload}).setProtectedHeader({alg:'RS256',kid:'test'}).setIssuer(options.issuer||'https://token.actions.githubusercontent.com').setAudience(options.audience||SYNC_AUDIENCE).setSubject('repo:'+SYNC_REPOSITORY+':ref:refs/heads/v2').setIssuedAt(options.iat??Math.floor(Date.now()/1000)).setExpirationTime(options.exp||'5m').sign(privateKey);
 const req=token=>new Request('https://portfolio.test/api/sync/content',{headers:{Authorization:'Bearer '+token}});
 await verify(req(await sign()));
 await verify(req(await sign({event_name:'workflow_dispatch'})));
 for(const changes of [{repository:'other/private'},{repository_visibility:'public'},{ref:'refs/heads/main'},{workflow_ref:SYNC_REPOSITORY+'/.github/workflows/other.yml@refs/heads/v2'},{event_name:'pull_request'},{runner_environment:'self-hosted'}]){
  assert.throws(()=>assertSyncClaims({...claims,...changes}));await assert.rejects(verify(req(await sign(changes))));
 }
 for(const options of [{issuer:'https://evil.test'},{audience:'other'},{iat:Math.floor(Date.now()/1000)-700},{exp:Math.floor(Date.now()/1000)-1}])await assert.rejects(verify(req(await sign({},options))));
 const token=await sign();await assert.rejects(verify(req(token.slice(0,-8)+'AAAAAAAA')));
 await assert.rejects(verify(new Request('https://portfolio.test/api/sync/content')));
});

test('publisher writes only images and additive content; cannot manage recipients or owner exports',async()=>{
 const s=setup(undefined,undefined,{verifySync:async req=>{if(req.headers.get('authorization')!=='Bearer test-publisher')throw Error();}});
 const post=(endpoint,data,token='test-publisher')=>s.request(endpoint,{data,headers:{Authorization:'Bearer '+token,Origin:'https://github-actions.test'}});
 assert.equal((await post('sync/images',{base64:png.toString('base64')},'bad')).status,401);
 const image=await post('sync/images',{base64:png.toString('base64')});assert.equal(image.status,200);const {url}=await image.json();
 assert.equal((await post('sync/content',fixture(url))).status,200);
 assert.equal((await s.request('private/content')).status,401);
 for(const endpoint of ['owner/grants','owner/projects','owner/content',url.replace('/api/','owner/').replace('owner/private/','owner/')])assert.equal((await s.request(endpoint,{headers:{Authorization:'Bearer test-publisher'}})).status,401);
 assert.equal((await post('sync/grants',{})).status,404);
 assert.equal((await s.request('sync/content',{method:'GET',headers:{Authorization:'Bearer test-publisher'}})).status,404);
 const previous=await s.store.get('content-current');assert.equal((await post('sync/content',{cards:[],cases:{invalid:{}},img:{}})).status,400);assert.deepEqual(await s.store.get('content-current'),previous);
 assert.equal((await s.request('owner/content')).status,401);
});

test('inline legacy portraits require declared protected images; external media remain rejected',async()=>{
 const {validateContent}=await import('../server/content.mjs');
 const url='/api/private/images/'+'a'.repeat(64),data=fixture(url);
 data.cases['test-only'].description.push({t:'html',v:'<div><img src="'+url+'" alt=""></div>'});
 assert.equal(validateContent(data),data);
 for(const html of ['<img src="https://external.test/image.png" alt="">','<img src="'+url+'" alt="" onerror="alert(1)">','<img src="/api/private/images/'+'b'.repeat(64)+'" alt="">']){
  const copy=structuredClone(data);copy.cases['test-only'].description.at(-1).v=html;assert.throws(()=>validateContent(copy));
 }
});
