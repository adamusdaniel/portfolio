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
export function createAccess({store, env, now = Date.now}) {
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
  async function grant(req) {
    const s = readSession(req, 'recipient');
    if (!s || !idPattern.test(s.id)) fail(401, 'Access expired or disabled. Please enter a valid password.');
    const g = await store.get(`grants-${s.id}`, {type:'json'});
    if (!g || g.revoked || g.expiresAt <= now() || g.version !== s.version) fail(401, 'Access expired or disabled. Please enter a valid password.');
    return g;
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
        const [id] = password.split('.');
        const g = idPattern.test(id) ? await store.get(`grants-${id}`, {type:'json'}) : null;
        if (!g || !equal(digest(password), g.passwordHash) || g.revoked || g.expiresAt <= now()) fail(401, 'Invalid password or inactive access.');
        await store.setJSON(`used-${id}`, {at:now()}, {onlyIfNew:true});
        return json({ok:true}, 200, {'Set-Cookie':cookie('recipient', session('recipient', {id,version:g.version,exp:Math.min(g.expiresAt, now()+86400000)}), Math.min(86400,Math.floor((g.expiresAt-now())/1000)))});
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
        if (req.method === 'GET' && path === '/api/owner/grants') {
          const {blobs} = await store.list({prefix:'grants-'});
          const grants = await Promise.all(blobs.map(async b=>publicGrant(await store.get(b.key,{type:'json'}))));
          return json({grants:grants.sort((a,b)=>b.createdAt-a.createdAt)});
        }
        if (req.method === 'POST' && path === '/api/owner/grants') {
          const data = await body(req), days = data.days ?? 7;
          if (typeof data.label !== 'string' || !data.label.trim() || data.label.length > 120 || !Number.isFinite(days) || days < 1/24 || days > 365) fail(400, 'Podaj nazwę i ważność od 1 godziny do 365 dni.');
          const id = randomBytes(16).toString('hex'), password = `${id}.${random()}`;
          const g = {id,label:data.label.trim(),createdAt:now(),expiresAt:now()+days*86400000,revoked:false,version:random(),passwordHash:digest(password)};
          const result = await store.setJSON(`grants-${id}`, g, {onlyIfNew:true});
          if (!result.modified) fail(409, 'Spróbuj ponownie.');
          return json({grant:await publicGrant(g),password},201);
        }
        const match = path.match(/^\/api\/owner\/grants\/([a-f0-9]{32})\/(reset|revoke)$/);
        if (req.method === 'POST' && match) {
          const data = await body(req), key = `grants-${match[1]}`;
          const entry = await store.getWithMetadata(key,{type:'json'});
          if (!entry) fail(404, 'Nie znaleziono dostępu.');
          if (!entry.etag) fail(503, 'Nie można bezpiecznie zapisać zmiany.');
          const g = entry.data;
          if (data.version !== g.version) fail(409, 'Dostęp zmienił się. Odśwież listę.');
          let password;
          if (match[2] === 'reset') {
            if (g.revoked || g.expiresAt <= now()) fail(400, 'Utwórz nowy dostęp dla wygasłego lub wyłączonego wpisu.');
            password = `${g.id}.${random()}`;
            g.passwordHash = digest(password);
          } else g.revoked = true;
          g.version = random();
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
        return json(data || {cards:[],cases:{},img:{}});
      }
      const asset = path.match(/^\/api\/private\/images\/([a-f0-9]{64})$/);
      if (req.method === 'GET' && asset) {
        await grant(req);
        const image = await store.getWithMetadata(`images-${asset[1]}`,{type:'arrayBuffer'});
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
