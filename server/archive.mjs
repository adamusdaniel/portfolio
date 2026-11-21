import {createHash} from 'node:crypto';
import {imageType} from './content.mjs';
// These eight cases were public before the privacy change. Bootstrap only from
// an immutable revision; never execute remote JavaScript or accept caller URLs.
export const ARCHIVE_COMMIT='717c7eaca2a8d4c0166c2d5bb8cf811557b9d359';
export const PUBLIC_SLUGS=['buchfix','loyalty','niewidomi'];
const hash=value=>createHash('sha256').update(value).digest('hex');
export function createArchive({store,fetchSource=fetch}) {
  const base=`https://raw.githubusercontent.com/adamusdaniel/portfolio/${ARCHIVE_COMMIT}/`;
  async function source(file) {
    const response=await fetchSource(base+file,{signal:AbortSignal.timeout(20000)});
    if(!response.ok) throw Error('Archive source unavailable');
    return response;
  }
  function parse(text,name) {
    const prefix=`window.${name}=`;
    if(!text.trim().startsWith(prefix)) throw Error('Unexpected archive format');
    return JSON.parse(text.trim().slice(prefix.length).replace(/;\s*$/,''));
  }
  async function catalog() {
    const stored=await store.get('archive-catalog-v1',{type:'json'});
    if(stored) return stored;
    const [projects,tauron]=await Promise.all([
      source('content/projects.js').then(r=>r.text()).then(t=>parse(t,'PORTFOLIO_PROJECTS')),
      source('content/tauron/case.js').then(r=>r.text()).then(t=>parse(t,'TAURON_PROJECT'))
    ]);
    const cases={...projects.cases,[tauron.case.slug]:tauron.case};
    const images={...projects.images,...tauron.images}, media=projects.media || {};
    const descriptors={},img={},privateMedia={};
    function image(value) {
      const id=hash(value);
      descriptors[id]=value.startsWith('data:')?{data:value}:{path:value};
      return `/api/private/images/${id}`;
    }
    function walk(value) {
      if(Array.isArray(value)) return value.map(walk);
      if(value && typeof value==='object') return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,walk(v)]));
      if(typeof value!=='string') return value;
      if(Object.hasOwn(images,value)) {
        const key='private/archive/'+value;
        img[key]=image(images[value]);
        if(media[value]) privateMedia[key]=media[value];
        return key;
      }
      return value.replace(/data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+/g,image);
    }
    const cards=[tauron.card,...projects.cards].filter(c=>!PUBLIC_SLUGS.includes(c.slug)).map(c=>walk({...c,title:cases[c.slug].title,tags:cases[c.slug].tags || c.tags}));
    const privateCases=Object.fromEntries(cards.map(c=>[c.slug,walk(cases[c.slug])]));
    const result={data:{cards,cases:privateCases,img,media:privateMedia},descriptors};
    await store.setJSON('archive-catalog-v1',result,{onlyIfNew:true});
    return result;
  }
  async function image(id) {
    const item=(await catalog()).descriptors[id];
    if(!item) return null;
    let bytes;
    if(item.data) bytes=Buffer.from(item.data.split(',')[1],'base64');
    else {
      if(!/^(content|images)\/[a-zA-Z0-9_./-]+$/.test(item.path) || item.path.includes('..')) throw Error('Unexpected archive asset');
      bytes=Buffer.from(await (await source(item.path)).arrayBuffer());
    }
    const metadata={contentType:imageType(bytes)};
    await store.set(`images-${id}`,bytes,{metadata,onlyIfNew:true});
    return {data:bytes,metadata};
  }
  async function importBatch(limit=6) {
    const ids=Object.keys((await catalog()).descriptors),remaining=[];
    for(const id of ids) if(!await store.getMetadata(`images-${id}`)) remaining.push(id);
    await Promise.all(remaining.slice(0,limit).map(image));
    return {remaining:Math.max(0,remaining.length-limit),total:ids.length};
  }
  return {content:async()=>(await catalog()).data,image,importBatch};
}
