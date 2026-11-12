import {createAccess,ownerHash} from '../server/access.mjs';
import {randomBytes} from 'node:crypto';
export class MemoryStore {
  entries=new Map(); serial=0;
  async get(key) { const e=this.entries.get(key); return e?structuredClone(e.data):null; }
  async getWithMetadata(key) { const e=this.entries.get(key); return e?structuredClone(e):null; }
  async getMetadata(key) { const e=this.entries.get(key); return e?{etag:e.etag,metadata:e.metadata}:null; }
  async setJSON(key,data,options={}) { return this.set(key,data,options); }
  async set(key,data,options={}) {
    const old=this.entries.get(key);
    if(options.onlyIfNew && old || options.onlyIfMatch && old?.etag!==options.onlyIfMatch) return {modified:false};
    const etag=String(++this.serial);
    this.entries.set(key,{data:structuredClone(data),metadata:options.metadata||{},etag});
    return {modified:true,etag};
  }
  async list({prefix}) {return {blobs:[...this.entries.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))};}
}
export function setup(store=new MemoryStore(),origin='https://portfolio.test') {
  let time=Date.UTC(2026,10,12,12);
  const password=randomBytes(24).toString('hex');
  const env={ACCESS_SESSION_SECRET:randomBytes(32).toString('base64url'),ACCESS_OWNER_PASSWORD_HASH:ownerHash(password)};
  const handle=createAccess({store,env,now:()=>time});
  const request=(path,{data,cookie,headers={},method}={})=>handle(new Request(origin+'/api/'+path,{method:method||(data?'POST':'GET'),headers:{...(data?{'Content-Type':'application/json',Origin:origin}:{}),...(cookie?{Cookie:cookie}:{}),...headers},body:data?JSON.stringify(data):undefined}));
  const cookie=r=>r.headers.get('set-cookie')?.split(';')[0];
  return {request,cookie,store,env,password,advance:ms=>time+=ms,now:()=>time};
}
export const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=','base64');
export function fixture(image) { return {cards:[{slug:'test-only',title:'Test fixture',desc:'Only automated tests',tags:['Web'],thumb:'private/test.png'}],cases:{'test-only':{type:'showcase',title:'Test fixture',tags:['Web'],hero:'private/test.png',gallery:['private/test.png'],details:[['Role','Designer']],description:[{t:'p',v:'Test only'}]}},img:{'private/test.png':image}}; }
