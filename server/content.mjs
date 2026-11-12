const publicSlugs = new Set(['bezkartek','buchfix','gratefulme','krainazdrowia','loyalty','newsletters','niewidomi','swissprive','ticketly','traininfo','tauron-search']);
export function validateContent(data) {
  if (!data || !Array.isArray(data.cards) || !data.cases || !data.img || typeof data.cases!=='object' || typeof data.img!=='object') throw new Error('Wymagane cards, cases i img.');
  const privateImage = value => {
    if(typeof value!=='string' || !value.startsWith('private/') || !Object.hasOwn(data.img,value)) throw new Error('Każdy obraz musi należeć do prywatnego pakietu.');
  };
  const slugs=data.cards.map(c=>c.slug);
  if (new Set(slugs).size!==slugs.length || Object.keys(data.cases).length!==slugs.length) throw new Error('Każda karta musi mieć jeden odpowiadający projekt.');
  for (const c of data.cards) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.slug) || publicSlugs.has(c.slug) || !Object.hasOwn(data.cases,c.slug)) throw new Error('Nieprawidłowa lub publiczna nazwa projektu.');
    const value=data.cases[c.slug];
    privateImage(c.thumb);
    if(value.hero) privateImage(value.hero);
    if(Array.isArray(value.gallery)) value.gallery.forEach(privateImage);
    for(const block of [...(value.blocks || []),...(value.description || [])]) if(block.t==='img') privateImage(block.v);
    if (!c.title || !c.desc || !Array.isArray(c.tags) || !value.title || !Array.isArray(value.details) || !['long','showcase'].includes(value.type)) throw new Error('Niekompletna karta lub projekt.');
    if (value.type==='long' && !Array.isArray(value.blocks)) throw new Error('Brak blocks.');
    if (value.type==='showcase' && (!value.hero || !Array.isArray(value.gallery) || !value.gallery.length || !Array.isArray(value.description))) throw new Error('Brak hero, gallery lub description.');
  }
  for (const [key,value] of Object.entries(data.img)) {
    if (!key.startsWith('private/') || !/^\/api\/private\/images\/[a-f0-9]{64}$/.test(value)) throw new Error('Grafiki muszą korzystać z chronionego API.');
  }
  function walk(value) {
    if (Array.isArray(value)) value.forEach(walk);
    else if(value && typeof value==='object') Object.values(value).forEach(walk);
    else if(typeof value==='string') {
      if(value.startsWith('private/') && !Object.hasOwn(data.img,value)) throw new Error('Brak prywatnej grafiki.');
      if (/data:image|<img|<iframe|<script|<video|<audio|<source|<object|<embed|on\w+\s*=|url\s*\(/i.test(value)) throw new Error('Użyj obrazów z img, bez osadzonego kodu lub mediów w HTML.');
    }
  }
  walk(data.cards); walk(data.cases);
  return data;
}
export function imageType(bytes) {
  if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if(bytes[0]===255 && bytes[1]===216 && bytes[2]===255) return 'image/jpeg';
  if(bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP') return 'image/webp';
  throw new Error('Dozwolone obrazy PNG, JPEG i WebP.');
}
