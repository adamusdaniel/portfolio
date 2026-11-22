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
    $('grants').replaceChildren();$('grants').setAttribute('aria-busy',String(busy));
    if (!grants.length) $('grants').append(element('p','Brak dostępów. Utwórz pierwszy powyżej.'));
    if(!grants.length) return;
    const wrapper=element('div',''); wrapper.className='grant-table-wrap';wrapper.tabIndex=0;
    wrapper.setAttribute('role','region');wrapper.setAttribute('aria-label','Tabela dostępów — przewijana poziomo na małych ekranach');
    const table=element('table','');table.className='grant-table';
    const caption=element('caption','Dostępy do prywatnych projektów');table.append(caption);
    const head=document.createElement('thead'),heading=document.createElement('tr');
    for(const label of ['Osoba / firma','Stan','Utworzono','Ważność','Pierwsze użycie','Akcje']) {
      const th=element('th',label);th.scope='col';heading.append(th);
    }
    head.append(heading);table.append(head);const body=document.createElement('tbody');
    for (const g of grants) {
      const row=document.createElement('tr');
      const name=element('th',g.label);name.scope='row';row.append(name);
      const state=g.revoked?'Wyłączony':expired(g)?'Wygasły':'Aktywny';
      const stateCell=document.createElement('td'),badge=element('span',state);
      badge.className='grant-status '+(state==='Aktywny'?'is-active':'is-inactive');stateCell.append(badge);row.append(stateCell);
      for(const value of [date(g.createdAt),g.expiresAt===null?'Bez daty wygaśnięcia':date(g.expiresAt),g.firstUsedAt?date(g.firstUsedAt):'Nie było użyte']) row.append(element('td',value));
      const actionCell=document.createElement('td');actionCell.className='grant-actions-cell';
      const actions=element('div','');actions.className='grant-actions';
      for(const [action,label] of [['reset','Resetuj hasło'],['revoke','Wyłącz'],['delete','Usuń']]) {
        const button=element('button',label);button.type='button';button.className='grant-action'+(action==='delete'?' is-danger':'');
        button.disabled=action!=='delete'&&(g.revoked||expired(g));
        button.setAttribute('aria-label',label+': '+g.label);
        button.addEventListener('click',()=>{
          if(busy) return;
          if(action==='reset') {
            $('resetError').textContent='';resetGrant=g;$('resetLabel').textContent=g.label;$('resetPassword').value='';
            $('resetDialog').showModal();$('resetPassword').focus();return;
          }
          run(async()=>{
            const message=action==='delete'?`Usunąć wpis „${g.label}”? Jego hasło i otwarte sesje przestaną działać. Tej operacji nie można cofnąć.`:`Wyłączyć dostęp „${g.label}”? Hasło i otwarte sesje przestaną działać.`;
            if(!confirm(message)) return;
            hideSecret();await api(`grants/${g.id}/${action}`,{version:g.version});await load();
            $('notice').textContent=action==='delete'?'Wpis został usunięty.':'Dostęp został wyłączony.';
          });
        });
        actions.append(button);
      }
      actionCell.append(actions);row.append(actionCell);body.append(row);
    }
    table.append(body);wrapper.append(table);$('grants').append(wrapper);updateTableBusy();
  }
  function updateTableBusy(){
    const host=$('grants'),wrapper=host.querySelector('.grant-table-wrap');
    host.setAttribute('aria-busy',String(busy));
    host.querySelector('.grant-table-loader')?.remove();
    if(!wrapper) return;
    wrapper.inert=busy;
    if(busy){
      const overlay=element('div','');overlay.className='grant-table-loader';overlay.setAttribute('role','status');
      const spinner=element('span','');spinner.className='grant-spinner';spinner.setAttribute('aria-hidden','true');
      overlay.append(spinner,element('span','Zapisywanie zmian…'));host.append(overlay);
    }
  }
  function reveal(password) { $('newPassword').value=password; $('secretBox').hidden=false; $('newPassword').focus(); }
  async function load() { grants=(await api('grants')).grants; $('login').hidden=true; $('panel').hidden=false; render(); }
  async function run(fn) {
    if(busy) return; busy=true; $('notice').textContent='';updateTableBusy();
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
  $('bundleText').addEventListener('input',()=>{if($('bundleText').value.trim()) $('bundle').value='';});
  $('bundle').addEventListener('change',()=>{if($('bundle').files.length) $('bundleText').value='';});
  async function decodeBundle(text){
    if(text.length>60000000) throw new Error('Pakiet musi mieć mniej niż 60 MB.');
    const prefix='PORTFOLIO_BUNDLE_V1:';
    if(text.trim().startsWith(prefix)) {
      const encoded=text.trim().slice(prefix.length).replace(/\s/g,'');
      const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
      const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
      const decoder=new TextDecoder();let total=0;const parts=[];
      while(true){const result=await reader.read();if(result.done) break;total+=result.value.byteLength;if(total>60000000){await reader.cancel();throw new Error('Rozpakowany pakiet przekracza 60 MB.');}parts.push(decoder.decode(result.value,{stream:true}));}
      parts.push(decoder.decode());text=parts.join('');
    }
    return JSON.parse(text);
  }
  $('upload').addEventListener('submit',e=>{e.preventDefault();run(async()=>{
    const file=$('bundle').files[0],pasted=$('bundleText').value.trim();
    if(!file && !pasted) throw new Error('Wybierz plik lub wklej gotowy pakiet projektu.');
    if(file && file.size>60000000) throw new Error('Wybierz pakiet mniejszy niż 60 MB.');
    const data=await decodeBundle(file?await file.text():pasted);
    if(!data.img || (!data.cards?.length && !data.headerUpdates?.length)) throw new Error('Pakiet musi zawierać prawdziwe projekty i img.');
    for(const [key,value] of Object.entries(data.img)) {
      const m=typeof value==='string' && value.match(/^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/]+=*)$/);
      if(!m) throw new Error('Nieprawidłowy obraz: '+key);
      $('notice').textContent='Wgrywanie obrazu: '+key;
      data.img[key]=(await api('images',{base64:m[1]})).url;
    }
    await api(data.headerUpdates?'content/headers':'content/import',data); $('bundle').value='';$('bundleText').value='';
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
