import {validateContent, imageType} from './content.mjs';
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
const digest = value => createHash('sha256').update(value).digest('hex');
const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const random = () => randomBytes(32).toString('base64url');
const idPattern = /^[a-f0-9]{32}$/;
const headers = {'Cache-Control':'private, no-store, max-age=0', 'Netlify-CDN-Cache-Control':'no-store', 'Pragma':'no-cache', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer', 'X-Robots-Tag':'noindex, nofollow'};
export function ownerHash(password, salt = randomBytes(16).toString('hex')) {
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function createAccess({store, env, now = Date.now, archive}) {
  const cookieName = role => role === 'owner' ? '__Host-portfolio_owner' : '__Host-portfolio_access';
  const sign = value => createHmac('sha256', env.ACCESS_SESSION_SECRET).update(value).digest('base64url');
  const ownerVersion = () => digest(env.ACCESS_OWNER_PASSWORD_HASH);
  function session(role, extra = {}) {
    const value = Buffer.from(JSON.stringify({role, exp:now() + (role === 'owner' ? 3600000 : 86400000), ...extra})).toString('base64url');
    return `${value}.${sign(value)}`;
  }
  function readSession(req, role) {
    try {
      const raw = (req.headers.get('cookie') || '').split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName(role)+'='))?.split('=')[1];
      const [value, signature] = (raw || '').split('.');
      if (!equal(signature, sign(value || ''))) return null;
      const data = JSON.parse(Buffer.from(value, 'base64url'));
      return data.role === role && data.exp > now() ? data : null;
    } catch { return null; }
  }
  const cookie = (role, value, age) => `${cookieName(role)}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
  const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), {status, headers:{...headers, 'Content-Type':'application/json; charset=utf-8', ...extra}});
  const fail = (status, message) => { throw Object.assign(new Error(message), {status}); };
  async function body(req, max = 16384) {
    if (!req.headers.get('content-type')?.startsWith('application/json')) fail(415, 'Wymagany JSON.');
    const text = await req.text();
    if (text.length > max) fail(413, 'Za duże żądanie.');
    try { return JSON.parse(text); } catch { fail(400, 'Nieprawidłowe dane.'); }
  }
  const expired = g => g.expiresAt !== null && (!Number.isFinite(g.expiresAt) || g.expiresAt <= now());
  async function grant(req) {
    const s = readSession(req, 'recipient');
    if (!s || !idPattern.test(s.id)) fail(401, 'Access expired or disabled. Please enter a valid password.');
    const g = await store.get(`grants-${s.id}`, {type:'json'});
    if (!g || g.revoked || expired(g) || g.version !== s.version) fail(401, 'Access expired or disabled. Please enter a valid password.');
    return g;
  }
  // Slow deterministic lookup avoids scanning recipients for password-only login.
  // It is independent of the session key, so rotating sessions preserves passwords.
  const passwordIndex = password => 'passwords-'+scryptSync(password,'portfolio-recipient-index-v1',32).toString('hex');
  async function reservePassword(password,id,version) {
    if(typeof password!=='string' || password.length<6 || password.length>128 || password!==password.trim() || /^[a-f0-9]{32}\./.test(password)) fail(400,'Wpisz własne hasło od 6 do 128 znaków, bez spacji na początku i końcu.');
    const hash=ownerHash(password);
    const result=await store.setJSON(passwordIndex(password),{id,version},{onlyIfNew:true});
    if(!result.modified) fail(409,'To hasło było już przypisane do dostępu. Wybierz inne.');
    // Reservations remain immutable, including after expiry or a failed update.
    // Stale indexes never authorize: login also checks the current grant version.
    return hash;
  }
  async function publicGrant(g) {
    const used = await store.get(`used-${g.id}`, {type:'json'});
    const {passwordHash, ...safe} = g;
    return {...safe, firstUsedAt:used?.at || null};
  }
  return async function handle(req) {
    try {
      const url = new URL(req.url), path = url.pathname.replace(/\/$/, '');
      if (!env.ACCESS_SESSION_SECRET || env.ACCESS_SESSION_SECRET.length < 43 || !/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(env.ACCESS_OWNER_PASSWORD_HASH || '')) fail(503, 'Private access is not configured yet.');
      if (req.method !== 'GET' && req.method !== 'POST') fail(405, 'Method not allowed.');
      if (req.method === 'POST' && (req.headers.get('origin') !== url.origin || req.headers.get('sec-fetch-site') === 'cross-site')) fail(403, 'Nieprawidłowe źródło żądania.');
      if (req.method === 'POST' && (path === '/api/access/login' || path === '/api/owner/login')) {
        const {password} = await body(req);
        if (typeof password !== 'string' || password.length > 512) fail(401, 'Invalid password or inactive access.');
        if (path === '/api/owner/login') {
          const expected = env.ACCESS_OWNER_PASSWORD_HASH;
          if (!equal(ownerHash(password, expected.split(':')[1]), expected)) fail(401, 'Nieprawidłowe hasło.');
          return json({ok:true}, 200, {'Set-Cookie':cookie('owner', session('owner', {version:ownerVersion()}), 3600)});
        }
        const [legacyId] = password.split('.');
        let g=idPattern.test(legacyId) ? await store.get(`grants-${legacyId}`, {type:'json'}) : null;
        let valid=g && !g.deleted && !g.passwordHash.startsWith('scrypt:') && equal(digest(password),g.passwordHash);
        if(!valid) {
          const index=await store.get(passwordIndex(password),{type:'json'});
          g=index ? await store.get(`grants-${index.id}`,{type:'json'}) : null;
          valid=g && !g.deleted && g.version===index.version && g.passwordHash.startsWith('scrypt:') && equal(ownerHash(password,g.passwordHash.split(':')[1]),g.passwordHash);
        }
        if (!valid || g.revoked || expired(g)) fail(401, 'Invalid password or inactive access.');
        const id=g.id;
        await store.setJSON(`used-${id}`, {at:now()}, {onlyIfNew:true});
        const sessionEnd=Math.min(g.expiresAt ?? Infinity,now()+86400000);
        return json({ok:true}, 200, {'Set-Cookie':cookie('recipient', session('recipient', {id,version:g.version,exp:sessionEnd}), Math.floor((sessionEnd-now())/1000))});
      }
      if (req.method === 'POST' && ['/api/access/logout','/api/owner/logout'].includes(path)) {
        return json({ok:true}, 200, {'Set-Cookie':cookie(path.includes('/owner/')?'owner':'recipient', '', 0)});
      }
      if (path.startsWith('/api/owner/')) {
        const s = readSession(req, 'owner');
        if (!s || s.version !== ownerVersion()) fail(401, 'Zaloguj się do panelu właściciela.');
        if (req.method === 'POST' && path === '/api/owner/images') {
          const data=await body(req, 4200000);
          if(typeof data.base64!=='string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(data.base64)) fail(400,'Nieprawidłowy obraz.');
          const bytes=Buffer.from(data.base64,'base64');
          if(bytes.length>3000000) fail(413,'Obraz musi mieć maksymalnie 3 MB.');
          let type; try { type=imageType(bytes); } catch(e) { fail(400,e.message); }
          const id=digest(bytes);
          await store.set(`images-${id}`,bytes,{metadata:{contentType:type},onlyIfNew:true});
          return json({url:`/api/private/images/${id}`});
        }
        if (req.method === 'POST' && path === '/api/owner/content') {
          const data=await body(req,2000000);
          try { validateContent(data); } catch(e) { fail(400,e.message); }
          for (const value of Object.values(data.img)) {
            if(!await store.getMetadata('images-'+value.split('/').pop())) fail(400,'Brak wgranego obrazu.');
          }
          // Content is replaced as a whole only after every image is available.
          await store.setJSON('content-current',data);
          return json({ok:true});
        }
        if(req.method==='POST' && path==='/api/owner/archive/import' && archive) { await body(req); return json(await archive.importBatch()); }
        if (req.method === 'GET' && path === '/api/owner/grants') {
          const {blobs} = await store.list({prefix:'grants-'});
          const grants = await Promise.all(blobs.map(async b=>{const g=await store.get(b.key,{type:'json'});return g && !g.deleted ? publicGrant(g) : null;}));
          return json({grants:grants.filter(Boolean).sort((a,b)=>b.createdAt-a.createdAt)});
        }
        if (req.method === 'POST' && path === '/api/owner/grants') {
          const data = await body(req), days = data.days ?? 7;
          if(data.noExpiry!==undefined && typeof data.noExpiry!=='boolean') fail(400,'Nieprawidłowa opcja ważności.');
          if (typeof data.label !== 'string' || !data.label.trim() || data.label.length > 120 || (!data.noExpiry && (!Number.isFinite(days) || days < 1/24 || days > 365))) fail(400, 'Podaj nazwę i ważność od 1 godziny do 365 dni.');
          const id = randomBytes(16).toString('hex'), password = data.password ?? `${id}.${random()}`;
          const g = {id,label:data.label.trim(),createdAt:now(),expiresAt:data.noExpiry ? null : now()+days*86400000,revoked:false,version:random(),passwordHash:data.password!==undefined?'':digest(password)};
          if(data.password!==undefined) g.passwordHash=await reservePassword(password,id,g.version);
          const result = await store.setJSON(`grants-${id}`, g, {onlyIfNew:true});
          if (!result.modified) fail(409, 'Spróbuj ponownie.');
          return json({grant:await publicGrant(g),password},201);
        }
        const match = path.match(/^\/api\/owner\/grants\/([a-f0-9]{32})\/(reset|revoke|delete)$/);
        if (req.method === 'POST' && match) {
          const data = await body(req), key = `grants-${match[1]}`;
          const entry = await store.getWithMetadata(key,{type:'json'});
          if (!entry) fail(404, 'Nie znaleziono dostępu.');
          if (!entry.etag) fail(503, 'Nie można bezpiecznie zapisać zmiany.');
          const g = entry.data;
          if(g.deleted) {
            if(match[2]==='delete') return json({ok:true});
            fail(404,'Dostęp został usunięty.');
          }
          if (data.version !== g.version) fail(409, 'Dostęp zmienił się. Odśwież listę.');
          if(match[2]==='delete') {
            // Keep only a minimal revocation tombstone. CAS prevents a concurrent
            // reset from resurrecting a deleted grant; labels and hashes are erased.
            const result=await store.setJSON(key,{id:g.id,deleted:true,revoked:true,expiresAt:0,version:random()},{onlyIfMatch:entry.etag});
            if(!result.modified) fail(409,'Równoczesna zmiana. Odśwież listę.');
            await store.delete(`used-${g.id}`).catch(()=>{});
            return json({ok:true});
          }
          let password;
          const nextVersion=random();
          if (match[2] === 'reset') {
            if (g.revoked || expired(g)) fail(400, 'Utwórz nowy dostęp dla wygasłego lub wyłączonego wpisu.');
            password = data.password ?? `${g.id}.${random()}`;
            g.passwordHash = data.password!==undefined ? await reservePassword(password,g.id,nextVersion) : digest(password);
          } else g.revoked = true;
          g.version = nextVersion;
          const result = await store.setJSON(key,g,{onlyIfMatch:entry.etag});
          if (!result.modified) fail(409, 'Równoczesna zmiana. Odśwież listę.');
          return json({grant:await publicGrant(g), ...(password ? {password} : {})});
        }
        fail(404, 'Nie znaleziono.');
      }
      if (req.method === 'GET' && path === '/api/access/session') { await grant(req); return json({ok:true}); }
      if (req.method === 'GET' && path === '/api/private/content') {
        await grant(req);
        const data = await store.get('content-current',{type:'json'});
        const existing=archive ? await archive.content() : {cards:[],cases:{},img:{},media:{}};
        const uploaded=data || {cards:[],cases:{},img:{},media:{}};
        return json({cards:[...existing.cards.filter(card=>!uploaded.cards.some(c=>c.slug===card.slug)),...uploaded.cards],cases:{...existing.cases,...uploaded.cases},img:{...existing.img,...uploaded.img},media:{...existing.media,...uploaded.media}});
      }
      const asset = path.match(/^\/api\/private\/images\/([a-f0-9]{64})$/);
      if (req.method === 'GET' && asset) {
        await grant(req);
        const image = await store.getWithMetadata(`images-${asset[1]}`,{type:'arrayBuffer'}) || (archive ? await archive.image(asset[1]) : null);
        if (!image) fail(404, 'Not found.');
        const type = image.metadata.contentType;
        if (!['image/png','image/jpeg','image/webp'].includes(type)) fail(404, 'Not found.');
        return new Response(image.data,{headers:{...headers,'Content-Type':type,'Content-Disposition':'inline'}});
      }
      fail(404, 'Not found.');
    } catch (error) {
      // Never log request bodies, cookies, passwords, or storage errors with credentials.
      return json({error:error.status ? error.message : 'Service unavailable. Please try again later.'}, error.status || 503);
    }
  };
}
