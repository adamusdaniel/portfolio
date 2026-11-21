(() => {
  const $ = id => document.getElementById(id);
  let grants = [], busy = false, resetGrant = null;
  $('privateLink').textContent = location.origin + '/#all-projects';
  async function api(path, data) {
    const response = await fetch('/api/owner/' + path, {method:data?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined});
    const value = await response.json().catch(()=>({}));
    if (!response.ok) {
      if (response.status === 401) showLogin();
      throw new Error(value.error || (response.status === 429 ? 'Za dużo prób. Poczekaj minutę.' : 'Usługa jest chwilowo niedostępna.'));
    }
    return value;
  }
  function hideSecret() { $('newPassword').value = ''; $('secretBox').hidden = true; }
  function closeReset() { $('resetDialog').close(); $('resetPassword').value=''; $('resetError').textContent=''; resetGrant=null; }
  function showLogin() { closeReset(); $('recipientPassword').value=''; $('login').hidden=false; $('panel').hidden=true; $('grants').replaceChildren(); hideSecret(); grants=[]; }
  const expired = g => g.expiresAt!==null && g.expiresAt<=Date.now();
  const date = ms => ms ? new Date(ms).toLocaleString('pl-PL') : '—';
  function element(tag, text) { const e=document.createElement(tag); e.textContent=text; return e; }
  function render() {
    $('grants').replaceChildren();
    if (!grants.length) $('grants').append(element('p','Brak dostępów. Utwórz pierwszy powyżej.'));
    for (const g of grants) {
      const card=element('article',''); card.className='grant';
      card.append(element('h2',g.label));
      const dl=document.createElement('dl');
      for (const [label,value] of [['Stan',g.revoked?'Wyłączony':expired(g)?'Wygasły':'Aktywny'],['Ważny do',g.expiresAt===null?'Bez daty wygaśnięcia':date(g.expiresAt)],['Użycie hasła',g.firstUsedAt?'Użyte':'Nieużyte'],['Pierwsze użycie',date(g.firstUsedAt)]]) dl.append(element('dt',label),element('dd',value));
      card.append(dl);
      const actions=element('div',''); actions.className='owner-actions';
      for (const [action,label] of [['reset','Resetuj hasło'],['revoke','Wyłącz dostęp']]) {
        const b=element('button',label); b.className='btn ghost'; b.disabled=g.revoked||expired(g);
        b.addEventListener('click',()=>{
          if(action==='reset') {
            $('resetError').textContent=''; resetGrant=g; $('resetLabel').textContent=g.label; $('resetPassword').value='';
            $('resetDialog').showModal(); $('resetPassword').focus(); return;
          }
          run(async()=>{
          if (!confirm(`${label}: ${g.label}? ${action==='reset'?'Poprzednie hasło i sesje przestaną działać.':'Dostęp przestanie działać natychmiast.'}`)) return;
          hideSecret();
          const result=await api(`grants/${g.id}/${action}`,{version:g.version});
          if(result.password) reveal(result.password);
          await load(); $('notice').textContent=action==='reset'?'Hasło zostało zresetowane.':'Dostęp został wyłączony.';
        }); }); actions.append(b);
      }
      card.append(actions); $('grants').append(card);
    }
  }
  function reveal(password) { $('newPassword').value=password; $('secretBox').hidden=false; $('newPassword').focus(); }
  async function load() { grants=(await api('grants')).grants; $('login').hidden=true; $('panel').hidden=false; render(); }
  async function run(fn) {
    if(busy) return; busy=true; $('notice').textContent='';
    document.querySelectorAll('button').forEach(b=>b.disabled=true);
    try { await fn(); } catch(e) { $('notice').textContent=e.message; if($('resetDialog').open) $('resetError').textContent=e.message; }
    finally { busy=false; document.querySelectorAll('button').forEach(b=>b.disabled=false); render(); }
  }
  $('ownerLogin').addEventListener('submit',e=>{e.preventDefault();run(async()=>{try{await api('login',{password:$('ownerPassword').value});await load();migrateArchive();}finally{$('ownerPassword').value='';}});});
  $('noExpiry').addEventListener('change',()=>{ $('days').disabled=$('noExpiry').checked; $('days').required=!$('noExpiry').checked; });
  $('create').addEventListener('submit',e=>{e.preventDefault();run(async()=>{hideSecret();const result=await api('grants',{label:$('label').value,days:Number($('days').value),noExpiry:$('noExpiry').checked,password:$('recipientPassword').value});$('label').value='';$('recipientPassword').value='';await load();reveal(result.password);$('notice').textContent='Dostęp utworzony. Skopiuj nowe hasło.';});});
  $('cancelReset').addEventListener('click',closeReset);
  $('resetDialog').addEventListener('cancel',closeReset);
  $('resetForm').addEventListener('submit',e=>{e.preventDefault();run(async()=>{
    const g=resetGrant; if(!g) return;
    const password=$('resetPassword').value;
    const result=await api(`grants/${g.id}/reset`,{version:g.version,password});
    closeReset(); hideSecret(); await load(); reveal(result.password);
    $('notice').textContent='Hasło zostało zresetowane.';
  });});
  $('upload').addEventListener('submit',e=>{e.preventDefault();run(async()=>{
    const file=$('bundle').files[0];
    if(!file || file.size>60000000) throw new Error('Wybierz pakiet mniejszy niż 60 MB.');
    const data=JSON.parse(await file.text());
    if(!data.img || !data.cards?.length) throw new Error('Pakiet musi zawierać prawdziwe projekty i img.');
    for(const [key,value] of Object.entries(data.img)) {
      const m=typeof value==='string' && value.match(/^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/]+=*)$/);
      if(!m) throw new Error('Nieprawidłowy obraz: '+key);
      $('notice').textContent='Wgrywanie obrazu: '+key;
      data.img[key]=(await api('images',{base64:m[1]})).url;
    }
    await api('content',data); $('bundle').value='';
    $('notice').textContent='Projekty wgrane. Sprawdź sekcję All projects przy użyciu aktywnego hasła.';
  });});
  $('refresh').addEventListener('click',()=>run(load));
  $('logout').addEventListener('click',()=>run(async()=>{await api('logout',{});showLogin();}));
  $('dismiss').addEventListener('click',hideSecret);
  $('copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('newPassword').value);$('notice').textContent='Hasło skopiowane.';}catch{$('newPassword').select();$('notice').textContent='Użyj skrótu kopiowania, aby skopiować zaznaczone hasło.';}});
  window.addEventListener('pagehide',hideSecret);
  async function migrateArchive() {
    try {
      let result;
      do { result=await api('archive/import',{}); $('archiveStatus').textContent=`Kopiowanie dotychczasowych grafik do Netlify: ${result.total-result.remaining}/${result.total}`; } while(result.remaining>0);
      $('archiveStatus').textContent='Dotychczasowe prywatne projekty i grafiki są zapisane w Netlify.';
    } catch { $('archiveStatus').textContent='Kopiowanie grafik nie zostało ukończone. Odśwież stronę panelu, aby wznowić. Dostępne grafiki są też kopiowane przy otwieraniu projektów.'; }
  }
  run(async()=>{await load();migrateArchive();});
})();
