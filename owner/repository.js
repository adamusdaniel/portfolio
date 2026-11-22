// ZIP files use the original image bytes. No image conversion or remote uploader.
(() => {
 const encoder=new TextEncoder(),crcTable=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
 function crc(bytes){let c=0xffffffff;for(const byte of bytes)c=crcTable[(c^byte)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
 function zip(files){
  const local=[],central=[];let offset=0,centralSize=0;
  for(const [name,value] of files){
   const filename=encoder.encode(name),bytes=typeof value==='string'?encoder.encode(value):value,checksum=crc(bytes);
   const header=new Uint8Array(30+filename.length),h=new DataView(header.buffer);
   h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x800,true);h.setUint16(12,33,true);h.setUint32(14,checksum,true);h.setUint32(18,bytes.length,true);h.setUint32(22,bytes.length,true);h.setUint16(26,filename.length,true);header.set(filename,30);
   const entry=new Uint8Array(46+filename.length),e=new DataView(entry.buffer);
   e.setUint32(0,0x02014b50,true);e.setUint16(4,20,true);e.setUint16(6,20,true);e.setUint16(8,0x800,true);e.setUint16(14,33,true);e.setUint32(16,checksum,true);e.setUint32(20,bytes.length,true);e.setUint32(24,bytes.length,true);e.setUint16(28,filename.length,true);e.setUint32(42,offset,true);entry.set(filename,46);
   local.push(header,bytes);central.push(entry);offset+=header.length+bytes.length;centralSize+=entry.length;
  }
  const end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);
  return new Blob([...local,...central,end],{type:'application/zip'});
 }
 window.exportPrivateRepository=async(api,status)=>{
  status.textContent='Pobieranie prywatnej treści…';
  const data=await api('content'),files=[],cache=new Map();
  const templates=[['publish.py','publish.py'],['publish-workflow.yml','.github/workflows/publish.yml'],['README.md','README.md'],['gitignore.txt','.gitignore']];
  for(const [source,target] of templates){const r=await fetch('/owner/repository/'+source,{cache:'no-store'});if(!r.ok)throw Error('Nie można pobrać plików synchronizacji.');files.push([target,await r.text()]);}
  for(let index=0;index<data.cards.length;index++){
   const card=data.cards[index],slug=card.slug;
   if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw Error('Nieprawidłowa nazwa projektu.');
   status.textContent=`Przygotowywanie projektów: ${index+1}/${data.cards.length}…`;
   const project={card,case:data.cases[slug],img:{},media:{},inlineImages:{}},refs=new Set();
   const walk=value=>{if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')Object.values(value).forEach(walk);else if(typeof value==='string'&&Object.hasOwn(data.img,value))refs.add(value);};
   const inline=value=>{if(Array.isArray(value))value.forEach(inline);else if(value&&typeof value==='object')Object.values(value).forEach(inline);else if(typeof value==='string')for(const match of value.matchAll(/<img src="(\/api\/private\/images\/([a-f0-9]{64}))" alt="[^"<>]*">/g)){const key='private/'+slug+'/inline/'+match[2];data.img[key]=match[1];project.inlineImages[match[1]]=key;refs.add(key);}};
   inline(project.case);
   walk(card);walk(project.case);
   const written=new Set();
   for(const key of refs){
    const url=data.img[key];if(!/^\/api\/private\/images\/[a-f0-9]{64}$/.test(url))throw Error('Nieprawidłowy adres grafiki.');
    if(!cache.has(url)){
     const r=await fetch(url.replace('/api/private/','/api/owner/'),{cache:'no-store'});if(!r.ok)throw Error('Nie udało się pobrać grafiki. Odśwież panel i spróbuj ponownie.');
     const ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[r.headers.get('content-type')?.split(';')[0]];
     if(!ext)throw Error('Nieobsługiwany format grafiki.');
     cache.set(url,{bytes:new Uint8Array(await r.arrayBuffer()),ext});
    }
    const image=cache.get(url),filename='images/'+url.split('/').pop()+'.'+image.ext;
    if(image.bytes.length>3000000)throw Error('Grafika przekracza limit synchronizacji 3 MB. Poprzednia zawartość strony pozostaje bez zmian.');
    project.img[key]=filename;
    if(data.media?.[key])project.media[key]=data.media[key];
    if(!written.has(filename)){files.push(['projects/'+slug+'/'+filename,image.bytes]);written.add(filename);}
   }
   files.push(['projects/'+slug+'/project.json',JSON.stringify(project,null,2)+'\n']);
  }
  if(!data.cards.length)throw Error('Brak prywatnych projektów do pobrania.');
  files.push(['PRIVATE-REPOSITORY.txt','Przed dodaniem plików sprawdź: repozytorium adamusdaniel/portfolio-private, widoczność Private, branch v2.\n']);
  const blob=zip(files),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='portfolio-private.zip';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  status.textContent='ZIP gotowy. Wypakuj go i skopiuj całą zawartość (także folder .github) do prywatnego repozytorium na branchu v2.';
 };
})();
