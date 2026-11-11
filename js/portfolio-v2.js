(function(){
  function jumpTop(){ var d=document.documentElement, prev=d.style.scrollBehavior; d.style.scrollBehavior='auto'; window.scrollTo(0,0); d.scrollTop=0; document.body.scrollTop=0; requestAnimationFrame(function(){ window.scrollTo(0,0); d.style.scrollBehavior=prev; }); }
  var views={home:document.getElementById('view-home'),all:document.getElementById('view-all'),more:document.getElementById('view-more'),case:document.getElementById('view-case')};
  var nav=document.getElementById('nav');
  function show(name,hash){
    if(name!=='case') closeLb();
    if(name!=='case') document.title=(name==='all'?'Projects':name==='more'?'More projects':'Product Designer')+' · Daniel Adamus';
    for(var k in views) views[k].classList.toggle('is-on',k===name);
    if(name==='all'||name==='more'){ jumpTop(); if(name==='all') popIn(); }
    if(name==='case'){ jumpTop(); setTimeout(jumpTop,60); }
    document.getElementById('backFab').classList.toggle('is-on',false);
    document.querySelectorAll('.menu a').forEach(function(a){a.classList.toggle('is-active',(name==='all'||name==='more'||name==='case')&&a.dataset.sec==='projects')});
    if(hash){ var el=document.querySelector(hash); if(el){ requestAnimationFrame(function(){ el.scrollIntoView({behavior: name==='home'&&hash!=='#home'?'smooth':'instant',block:'start'}); }); } }
    observeAll();
  }
  function route(){
    var h=location.hash||'#home';
    if(h==='#all-projects') show('all');
    else if(h==='#more-projects'){ renderMore(); show('more'); }
    else if(h.indexOf('#private/')===0){ var ps=h.slice(9); if(VAULT.open && CASES[ps]){ renderCase(ps); show('case'); } else { VAULT.after=h; renderMore(); show('more'); } }
    else if(h.indexOf('#project/')===0){ renderCase(h.slice(9)); show('case'); }
    else if(h==='#home'){ show('home'); if(window.__booted) window.scrollTo({top:0,behavior:'smooth'}); else jumpTop(); } else show('home',h);
  }
  document.addEventListener('click',function(e){
    var a=e.target.closest('[data-go]'); if(!a) return;
    e.preventDefault();
    var target=a.getAttribute('href');
    if(location.hash===target){ route(); } else { location.hash=target; }
  });
  if('scrollRestoration' in history) history.scrollRestoration='manual';
  /* keep the page pinned to the top while it settles (no hash) */
  (function(){ var lock=true, off=function(){ lock=false; };
    ['touchstart','wheel','keydown','pointerdown','mousedown'].forEach(function(ev){ window.addEventListener(ev,off,{passive:true,once:true}); });
    setTimeout(off,1800);
    window.addEventListener('scroll',function(){ var h=location.hash; if(lock && (!h||h==='#home') && (window.pageYOffset||document.documentElement.scrollTop)) window.scrollTo(0,0); },{passive:true});
  })();
  window.addEventListener('load',function(){ var h=location.hash; if((!h||h==='#home') && (window.pageYOffset||document.documentElement.scrollTop)) jumpTop(); setTimeout(function(){ window.__booted=true; },400); });
  window.addEventListener('pageshow',function(e){ if(e.persisted) return; var h=location.hash; if(!h||h==='#home') jumpTop(); });
  window.addEventListener('hashchange',route);
  window.addEventListener('load',function(){ var h=location.hash; if(h==='#all-projects'||h==='#more-projects'||h.indexOf('#project/')===0||h.indexOf('#private/')===0){ setTimeout(function(){ window.scrollTo({top:0,behavior:'auto'}); },0); } });

  /* case study renderer */
  var CASES=PORTFOLIO_PROJECTS.cases, IMG=PORTFOLIO_PROJECTS.images;
  var ORDER=PORTFOLIO_PROJECTS.cards.map(function(card){ return Object.assign({},card,{title:CASES[card.slug].title,tags:CASES[card.slug].tags}); });
  if(window.TAURON_PROJECT){ CASES[TAURON_PROJECT.case.slug]=TAURON_PROJECT.case; ORDER.unshift(TAURON_PROJECT.card); }
  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function im(p){ return IMG[p]||(window.TAURON_PROJECT&&TAURON_PROJECT.images[p])||''; }
  function blocks(arr){
    /* the opening "Project Description" section gets a lead treatment until the next section heading */
    var html='', inIntro=false, i;
    for(i=0;i<arr.length;i++){
      var b=arr[i], isH=b.t==='h'&&b.lvl<=3;
      if(isH && /project description/i.test(b.v)){ inIntro=true; html+='<div class="intro">'+block(b); continue; }
      if(inIntro && (b.t==='h'||b.t==='label'||b.t==='img'||b.t==='html')){ inIntro=false; html+='</div>'; }
      html+=block(b);
    }
    if(inIntro) html+='</div>';
    return html;
  }
  var WIDE_CASE_IMAGES=new Set(["content/buchfix/image_5.webp", "content/buchfix/image_2.webp", "content/buchfix/image_1.webp", "content/buchfix/image_3.webp", "content/buchfix/image_6.webp", "content/buchfix/image_7.webp", "content/buchfix/image_4.webp", "content/loyalty/image_1.webp", "content/loyalty/image_3.webp", "content/loyalty/image_4.webp", "content/loyalty/image_5.webp", "content/loyalty/image_6.webp", "content/loyalty/image_7.webp", "content/newsletter/image_1.webp", "content/newsletter/image_2.webp", "content/newsletter/image_7.webp", "content/newsletter/image_8.webp", "content/niewidomi/image_3.webp", "content/niewidomi/image_4.webp", "content/ticketly/image_4.webp", "content/ticketly/image_5.webp", "content/ticketly/image_6.webp", "content/ticketly/image_7.webp", "content/traininfo/image_4.webp", "content/traininfo/image_6.webp", "content/traininfo/image_7.webp"]);
  function caseFigure(b,shot){
    var meta=Object.assign({},PORTFOLIO_PROJECTS.media[b.v]||{},b);
    var cls=shot?'shot':'case-figure'+(b.mobile?' tauron-mobile is-mobile':(b.layout==='wide'||WIDE_CASE_IMAGES.has(b.v)?' is-wide':''));
    return '<figure class="'+cls+'"><img src="'+im(b.v)+'" alt="'+esc(meta.alt||'Project interface')+'"'+(meta.width?' width="'+meta.width+'" height="'+meta.height+'"':'')+' loading="lazy">'+(meta.caption?'<figcaption>'+esc(meta.caption)+'</figcaption>':'')+'</figure>';
  }
  function block(b){
    return (function(){
      if(b.t==='h') return b.lvl<=3 ? '<h2>'+b.v+'</h2>' : '<h3 class="case-eyebrow">'+b.v+'</h3>';
      if(b.t==='label') return '<div class="label">'+b.v+'</div>';
      if(b.t==='p') return '<p>'+b.v+'</p>';
      if(b.t==='ul') return '<ul>'+b.v.map(function(i){return '<li>'+i+'</li>'}).join('')+'</ul>';
      if(b.t==='ol') return '<ol'+(b.style==='steps'?' class="x-steps"':'')+'>'+b.v.map(function(i){return '<li>'+i+'</li>'}).join('')+'</ol>';
      if(b.t==='html') return '<div class="x">'+b.v+'</div>';
      if(b.t==='img') return caseFigure(b,false);
      return '';
    })();
  }
  /* ---- global project card component: used on Home, Projects and inside every case study ---- */
  function projectCard(p){
    return '<a class="card" href="#'+(p.private?'private':'project')+'/'+p.slug+'" data-go="case" data-tags="'+esc(p.tags.join(', '))+'">'+
      '<div class="card-img"><img src="'+im(p.thumb)+'" alt="'+esc(p.title)+'" loading="lazy"></div>'+
      '<div class="tags">'+p.tags.map(function(x){return '<span class="tag">'+esc(x)+'</span>'}).join('')+'</div>'+
      '<div class="card-text"><h3>'+esc(p.title)+'</h3><p>'+esc(p.desc)+'</p></div>'+

      '<span class="arrow" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M8 7h9v9"/></svg></span></a>';
  }
  function projectGrid(list){ return list.map(projectCard).join(''); }
  /* size every dashed outline in real pixels: 1px stroke fully inside, radius taken from the card */
  function sizeOutline(card){
    var svg=card.querySelector('.outline'); if(!svg) return;
    var w=card.clientWidth, h=card.clientHeight; if(!w||!h) return;
    var r=Math.max(0,(parseFloat(getComputedStyle(card).borderTopLeftRadius)||24)-.5), a=.5, b=w-.5, c=h-.5;
    var P=2*(w-1-2*r)+2*(h-1-2*r)+2*Math.PI*r, n=Math.max(4,Math.round(P/20)), g=P/n-12;
    var d='M'+(a+r)+' '+a+' H'+(b-r)+' A'+r+' '+r+' 0 0 1 '+b+' '+(a+r)+' V'+(c-r)+' A'+r+' '+r+' 0 0 1 '+(b-r)+' '+c+' H'+(a+r)+' A'+r+' '+r+' 0 0 1 '+a+' '+(c-r)+' V'+(a+r)+' A'+r+' '+r+' 0 0 1 '+(a+r)+' '+a+' Z';
    svg.setAttribute('viewBox','0 0 '+w+' '+h); svg.setAttribute('width',w); svg.setAttribute('height',h);
    svg.innerHTML='<path d="'+d+'" fill="none" stroke-dasharray="12 '+g.toFixed(3)+'" stroke-dashoffset="-'+(g/2).toFixed(3)+'"/>';
  }
  var RO=window.ResizeObserver? new ResizeObserver(function(es){ es.forEach(function(e){ sizeOutline(e.target); }); }) : null;
  function watchOutlines(root){ (root||document).querySelectorAll('.card').forEach(function(c){ sizeOutline(c); if(RO) RO.observe(c); }); }
  window.addEventListener('resize',function(){ watchOutlines(); });
  window.addEventListener('load',function(){ watchOutlines(); });
  window.addEventListener('pageshow',function(){ watchOutlines(); });
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(function(){ watchOutlines(); });
  window.addEventListener('hashchange',function(){ requestAnimationFrame(function(){ watchOutlines(); }); setTimeout(watchOutlines,400); });
  document.getElementById('featured').innerHTML=projectGrid(ORDER.slice(0,3));
  document.getElementById('all-grid').innerHTML=projectGrid(ORDER);
  watchOutlines();

  function tile(x){ return '<div class="detail"><span>'+esc(x[0])+'</span><strong>'+x[1]+'</strong></div>'; }
  function splitDetails(d){
    var kw=null, rest=[];
    d.forEach(function(x){ if(/keyword/i.test(x[0])) kw=x[1]; else rest.push(x); });
    var pills=kw? '<div class="kw">'+kw.replace(/<[^>]+>/g,'').split(/,\s*/).map(function(k){return '<span class="tag">'+esc(k)+'</span>'}).join('')+'</div>' : '';
    return {pills:pills, tiles:'<div class="details">'+rest.map(tile).join('')+'</div>'};
  }
  var LB={list:[],i:0,trigger:null,descriptions:[]};
  function openLb(list,i,descriptions){
    LB.list=list; LB.i=i; LB.trigger=document.activeElement;
    LB.descriptions=descriptions || Array.from(document.querySelectorAll('#caseRoot .case-body figure img,#caseRoot .split-media .shot img')).map(function(img){return img.alt;});
    showLb(); document.getElementById('lb').classList.add('is-on'); document.body.style.overflow='hidden';
    document.getElementById('lbX').focus();
  }
  function showLb(){ var img=document.getElementById('lbImg'); img.src=im(LB.list[LB.i]); img.alt=LB.descriptions[LB.i]||'Project interface'; document.getElementById('lbC').textContent=(LB.i+1)+' / '+LB.list.length; }
  function closeLb(){
    var wasOpen=document.getElementById('lb').classList.contains('is-on');
    document.getElementById('lb').classList.remove('is-on'); document.body.style.overflow='';
    if(wasOpen && LB.trigger && LB.trigger.isConnected) LB.trigger.focus({preventScroll:true});
    LB.trigger=null;
  }
  document.getElementById('lb').addEventListener('keydown',function(e){
    if(e.key!=='Tab') return;
    var buttons=Array.from(this.querySelectorAll('button')), first=buttons[0], last=buttons[buttons.length-1];
    if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
  });
  document.getElementById('lbX').addEventListener('click',closeLb);
  document.getElementById('lbP').addEventListener('click',function(){ LB.i=(LB.i-1+LB.list.length)%LB.list.length; showLb(); });
  document.getElementById('lbN').addEventListener('click',function(){ LB.i=(LB.i+1)%LB.list.length; showLb(); });
  document.getElementById('lb').addEventListener('click',function(e){ if(e.target===this) closeLb(); });
  document.addEventListener('keydown',function(e){ if(!document.getElementById('lb').classList.contains('is-on')) return; if(e.key==='Escape') closeLb(); if(e.key==='ArrowRight') document.getElementById('lbN').click(); if(e.key==='ArrowLeft') document.getElementById('lbP').click(); });
  function renderCase(slug){
    closeLb();
    var c=CASES[slug], root=document.getElementById('caseRoot');
    root.classList.toggle('tauron-case',slug==='tauron-search');
    root.classList.toggle('text-case',!!c && c.type==='long');
    if(!c){ root.innerHTML='<p>Project not found.</p>'; return; }
    var i=Math.max(0,ORDER.map(function(o){return o.slug}).indexOf(slug));
    var prev=ORDER[(i-1+ORDER.length)%ORDER.length], next=ORDER[(i+1)%ORDER.length];
    var d=splitDetails(c.details);
    if(c.tags) d.pills='<div class="kw">'+c.tags.map(function(t){return '<span class="tag">'+esc(t)+'</span>'}).join('')+'</div>';
    var isPriv=!!(c&&c.private); var back='<div class="case-top"><a class="back" href="'+(isPriv?'#more-projects':'#all-projects')+'" data-go="all" aria-label="Back to projects"><svg viewBox="0 0 24 24"><path d="M19 12H5M11 5l-7 7 7 7"/></svg></a></div>';
    var title='<div class="title-row"><a class="back back-sm" href="'+(isPriv?'#more-projects':'#all-projects')+'" data-go="all" aria-label="Back to projects"><svg viewBox="0 0 24 24"><path d="M19 12H5M11 5l-7 7 7 7"/></svg></a><h1 class="case-title">'+c.title+'</h1></div>'+(c.subtitle?'<p class="case-sub">'+c.subtitle+'</p>':'');
    var body='', imgs=[];
    if(c.type==='long'){
      imgs=[].concat(c.blocks.filter(function(b){return b.t==='img'}).map(function(b){return b.v}));
      body='<div class="case-lead">'+back+(c.hero?'<div class="case-hero" data-lb="0"><img src="'+im(c.hero)+'" alt="'+esc(c.title)+' — project overview"></div>':'')+'</div>'+(function(){
        var bl=c.blocks, pd=bl.findIndex(function(b){return b.t==='h'&&/project description/i.test(b.v)}), s0, e0;
        if(pd>=0){ s0=pd+1; } else { s0=0; }
        e0=s0; while(e0<bl.length && (bl[e0].t==='p'||bl[e0].t==='ul'||bl[e0].t==='ol')) e0++;
        var intro=bl.slice(s0,e0), rest=bl.slice(0,pd>=0?pd:0).concat(bl.slice(e0));
        return '<div class="case-head">'+title+d.pills+'<div class="case-body intro-lead">'+blocks(intro)+'</div></div>'+
          '<div class="roles">'+d.tiles+'</div>'+
          '<div class="case-body long-body">'+blocks(rest)+'</div>';
      })();
    } else {
      imgs=c.gallery.slice();
      var k0=c.description.findIndex(function(b){return b.t==='h'}); if(k0<0) k0=c.description.length;
      var intro=c.description.slice(0,k0), rest=c.description.slice(k0);
      body='<div class="case-lead">'+back+'<div class="case-hero"><img src="'+im(c.hero)+'" alt="'+esc(c.title)+' — project overview"></div></div>'+
        '<div class="case-head">'+title+d.pills+'<div class="case-body intro-lead">'+blocks(intro)+'</div></div>'+
        '<div class="roles">'+d.tiles+'</div>'+
        '<div class="split-track" id="splitTrack"><div class="split-stage"><div class="split">'+
        '<div class="split-col"><div class="split-in split-media" id="spM">'+c.gallery.map(function(g){return caseFigure({v:g},true);}).join('')+'</div></div>'+
        '<div class="split-col"><div class="split-in split-text" id="spT">'+(rest.length?'<div class="case-body">'+blocks(rest)+'</div>':'')+'</div></div>'+
        '</div></div></div>';
    }
    var more=[1,2,3].map(function(k){ return ORDER[(i+k)%ORDER.length]; });
    var nav='<div class="case-more"><h2 class="section-title">More projects</h2><div class="grid">'+projectGrid(more)+'</div></div>';
    if(RO) root.querySelectorAll('.card').forEach(function(card){RO.unobserve(card);});
    root.innerHTML=body+nav;
    watchOutlines(root);
    SP=null;
    var sm=document.querySelectorAll('#spM img'), left=sm.length;
    sm.forEach(function(i){ if(i.complete){ if(--left===0) splitLayout(); } else i.addEventListener('load',function(){ if(--left===0) splitLayout(); }); });
    setTimeout(splitLayout,60); setTimeout(splitLayout,600);
    var hero=root.querySelector('.case-hero');
    if(hero && c.hero){
      hero.tabIndex=0; hero.setAttribute('role','button'); hero.setAttribute('aria-label','Enlarge project overview');
      var enlargeHero=function(){openLb([c.hero],0,[c.title+' — project overview']);};
      hero.addEventListener('click',enlargeHero);
      hero.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();enlargeHero();}});
    }
    /* lightbox on hero + figures */
    var k=0;
    root.querySelectorAll('.case-body figure, .split-media .shot').forEach(function(el){ var idx=k++; el.addEventListener('click',function(){ openLb(imgs,idx); }); { el.tabIndex=0; el.setAttribute('role','button'); el.setAttribute('aria-label','Enlarge project image'); el.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openLb(imgs,idx); } }); } });
    document.title=c.title.replace(/<[^>]+>/g,'')+' · Daniel Adamus';
    setTimeout(checkReveal,50);
  }

  /* showcase split: columns move together with the page; the shorter one stops at its end (top or bottom) */
  var SP=null;
  function splitLayout(){
    var tr=document.getElementById('splitTrack'); if(!tr){ SP=null; return; }
    if(innerWidth<=900){ tr.style.height=''; SP=null; return; }
    var st=tr.querySelector('.split-stage'), vh=st.clientHeight, m=document.getElementById('spM'), x=document.getElementById('spT');
    var mm=Math.max(0,m.scrollHeight-vh), mt=Math.max(0,x.scrollHeight-vh), L=Math.max(mm,mt);
    tr.style.height=(L+vh)+'px';
    var s=splitS(tr,L);
    SP={tr:tr,m:m,x:x,mm:mm,mt:mt,L:L,last:s,pm:Math.min(s,mm),pt:Math.min(s,mt)};
    splitApply();
  }
  function splitS(tr,L){ var top=parseFloat(getComputedStyle(tr.querySelector('.split-stage')).top)||0; return Math.max(0,Math.min(L,top-tr.getBoundingClientRect().top)); }
  function splitApply(){ SP.m.style.transform='translate3d(0,'+(-SP.pm)+'px,0)'; SP.x.style.transform='translate3d(0,'+(-SP.pt)+'px,0)'; }
  function splitTick(){
    if(!SP) return;
    var s=splitS(SP.tr,SP.L), d=s-SP.last; SP.last=s; if(!d) return;
    SP.pm=Math.max(0,Math.min(SP.mm,SP.pm+d)); SP.pt=Math.max(0,Math.min(SP.mt,SP.pt+d));
    if(s<=0){SP.pm=0;SP.pt=0} if(s>=SP.L){SP.pm=SP.mm;SP.pt=SP.mt}
    splitApply();
  }
  window.addEventListener('scroll',function(){ requestAnimationFrame(splitTick); },{passive:true});
  window.addEventListener('resize',function(){ splitLayout(); });

  /* ---- private projects vault ----
     Content is AES-GCM encrypted at build time; the key is derived from the password with PBKDF2.
     Without the right password the page holds only ciphertext – nothing to reveal by inspecting the source. */
  var VAULT_DATA=null;
  var VAULT={open:false, after:null, fails:0, until:0, cards:[]};
  if(!VAULT_DATA){
    document.querySelector('.lock-card > p').textContent='Two new case studies are in preparation. Password access will be available soon.';
    document.getElementById('lockPass').disabled=true;
    document.getElementById('lockBtn').disabled=true;
    document.getElementById('lockBtn').querySelector('span').textContent='Coming soon';
  }
  function b64(s){ var b=atob(s), u=new Uint8Array(b.length); for(var i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return u; }
  function ub64(buf){ var s='', u=new Uint8Array(buf); for(var i=0;i<u.length;i++) s+=String.fromCharCode(u[i]); return btoa(s); }
  async function deriveKey(pass){
    var base=await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2', salt:b64(VAULT_DATA.salt), iterations:VAULT_DATA.iter, hash:'SHA-256'}, base, {name:'AES-GCM', length:256}, true, ['decrypt']);
  }
  async function openVault(key){
    var pt=await crypto.subtle.decrypt({name:'AES-GCM', iv:b64(VAULT_DATA.iv)}, key, b64(VAULT_DATA.ct));
    var data=JSON.parse(new TextDecoder().decode(pt));
    Object.keys(data.img).forEach(function(k){ IMG[k]=data.img[k]; });
    Object.keys(data.cases).forEach(function(k){ data.cases[k].private=true; CASES[k]=data.cases[k]; });
    VAULT.cards=data.cards.map(function(c){ c.private=true; return c; });
    VAULT.open=true;
  }
  function renderMore(){
    var locked=document.getElementById('moreLocked'), open=document.getElementById('moreOpen');
    locked.hidden=VAULT.open; open.hidden=!VAULT.open;
    if(VAULT.open){
      document.querySelectorAll('#filtersMore button').forEach(function(b){ b.classList.toggle('is-on',b.dataset.f==='all'); b.setAttribute('aria-pressed',String(b.dataset.f==='all')); });
      document.getElementById('more-grid').innerHTML=VAULT.cards.length ? projectGrid(VAULT.cards) : '<p role="status">New projects will appear here soon.</p>';
      watchOutlines(document.getElementById('more-grid'));
    }
    else setTimeout(function(){ var i=document.getElementById('lockPass'); if(i && innerWidth>640) i.focus(); },50);
  }
  document.getElementById('lockForm').addEventListener('submit', async function(e){
    e.preventDefault();
    var err=document.getElementById('lockErr'), btn=document.getElementById('lockBtn'), inp=document.getElementById('lockPass'), card=document.querySelector('.lock-card');
    var now=Date.now();
    if(!VAULT_DATA) return;
    if(now<VAULT.until){ err.textContent='Too many attempts. Try again in '+Math.ceil((VAULT.until-now)/1000)+' s.'; return; }
    if(!(window.crypto&&crypto.subtle)){ err.textContent='This browser can’t unlock protected content.'; return; }
    btn.disabled=true; btn.querySelector('span').textContent='Checking…'; err.textContent='';
    try{
      var key=await deriveKey(inp.value);
      await openVault(key);
      try{ sessionStorage.setItem('adVault', ub64(await crypto.subtle.exportKey('raw', key))); }catch(_){}
      inp.value=''; VAULT.fails=0;
      var go=VAULT.after; VAULT.after=null;
      if(go){ if(go!==location.hash) location.hash=go; else route(); } else { renderMore(); popInGrid('#more-grid'); }
    }catch(ex){
      VAULT.fails++;
      if(VAULT.fails>=3) VAULT.until=Date.now()+Math.min(60000, 5000*Math.pow(2,VAULT.fails-3));
      err.textContent= VAULT.fails>=3 ? 'Wrong password. Please wait a moment before trying again.' : 'Wrong password. Please try again.';
      card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
      inp.select();
    }
    btn.disabled=false; btn.querySelector('span').textContent='Unlock';
  });
  document.getElementById('lockAgain').addEventListener('click',function(){
    try{ sessionStorage.removeItem('adVault'); }catch(_){}
    Object.keys(CASES).forEach(function(k){ if(CASES[k].private) delete CASES[k]; });
    Object.keys(IMG).forEach(function(k){ if(k.indexOf('private/')===0) delete IMG[k]; });
    closeLb(); LB.list=[]; LB.i=0;
    document.getElementById('lbImg').removeAttribute('src');
    document.getElementById('lbC').textContent='';
    if(RO) document.querySelectorAll('#more-grid .card, #caseRoot .card').forEach(function(c){ RO.unobserve(c); });
    document.getElementById('more-grid').replaceChildren();
    document.getElementById('caseRoot').replaceChildren();
    SP=null;
    document.title='Daniel Adamus v2';
    VAULT.open=false; VAULT.cards=[]; VAULT.after=null;
    document.getElementById('lockPass').value='';
    document.getElementById('lockErr').textContent='';
    renderMore();
  });
  function popInGrid(sel){ document.querySelectorAll(sel+' .card').forEach(function(c,i){ c.classList.remove('pop'); void c.offsetWidth; c.style.animationDelay=(i*60)+'ms'; c.classList.add('pop'); }); }
  /* restore an unlocked session in this tab */
  (async function(){
    var raw=null; try{ raw=sessionStorage.getItem('adVault'); }catch(_){}
    if(!VAULT_DATA){ try{ sessionStorage.removeItem('adVault'); }catch(_){} return; }
    if(!raw || !(window.crypto&&crypto.subtle)) return;
    try{
      var key=await crypto.subtle.importKey('raw', b64(raw), {name:'AES-GCM'}, true, ['decrypt']);
      await openVault(key);
      var h=location.hash; if(h==='#more-projects'||h.indexOf('#private/')===0) route();
    }catch(_){ try{ sessionStorage.removeItem('adVault'); }catch(__){} }
  })();
  document.getElementById('filtersMore').addEventListener('click',function(e){
    var b=e.target.closest('button'); if(!b) return;
    this.querySelectorAll('button').forEach(function(x){x.classList.toggle('is-on',x===b); x.setAttribute('aria-pressed',String(x===b))});
    var f=b.dataset.f;
    document.querySelectorAll('#more-grid .card').forEach(function(c){ c.classList.toggle('is-hidden', f!=='all' && (c.dataset.tags||'').toLowerCase().split(', ').indexOf(f)===-1); });
  });

  /* nav state */
  function onScroll(){ nav.classList.toggle('is-scrolled',window.scrollY>40); var fab=document.getElementById('backFab'); var onMore=views.more.classList.contains('is-on'); var onAll=views.all.classList.contains('is-on')||onMore; fab.setAttribute('href', onMore?'#all-projects':(onAll?'#home':(location.hash.indexOf('#private/')===0?'#more-projects':'#all-projects'))); fab.dataset.go=onAll?'home':'all'; fab.classList.toggle('is-on', (views.case.classList.contains('is-on')||onAll) && window.scrollY>(onAll?160:320)); }
  window.addEventListener('scroll',onScroll,{passive:true}); onScroll();

  /* section spy */
  var secs=['home','about','skills','contact'];
  var spy=new IntersectionObserver(function(es){
    es.forEach(function(en){ if(en.isIntersecting){ document.querySelectorAll('.menu a').forEach(function(a){ a.classList.toggle('is-active',a.dataset.sec===en.target.id); }); } });
  },{rootMargin:'-40% 0px -55% 0px'});
  secs.forEach(function(id){ var el=document.getElementById(id); if(el) spy.observe(el); });

  /* reveal on scroll (elements are visible at rest; only pre-hide those below the fold) */
  function checkReveal(){
    var vh=window.innerHeight;
    document.querySelectorAll('.reveal.pre').forEach(function(el){
      var r=el.getBoundingClientRect();
      if(r.top<vh*0.92 && r.bottom>0) el.classList.remove('pre');
    });
    document.querySelectorAll('.btn:not(.seen)').forEach(function(el){
      var r=el.getBoundingClientRect();
      if(r.top<vh*0.85 && r.bottom>0) el.classList.add('seen');
    });
  }
  var ticking=false;
  window.addEventListener('scroll',function(){ if(!ticking){ ticking=true; requestAnimationFrame(function(){ checkReveal(); ticking=false; }); } },{passive:true});
  window.addEventListener('resize',checkReveal);
  function observeAll(){
    document.querySelectorAll('.view.is-on .reveal').forEach(function(el){
      var r=el.getBoundingClientRect();
      if(r.top>window.innerHeight*0.95) el.classList.add('pre');
    });
    setTimeout(checkReveal,50);
  }
  /* stagger cards */
  function popIn(){
    var cards=document.querySelectorAll('#all-grid .card:not(.is-hidden)');
    cards.forEach(function(c,i){ c.classList.remove('pop'); void c.offsetWidth; c.style.animationDelay=(i*60)+'ms'; c.classList.add('pop'); });
  }
  document.querySelectorAll('#featured .card').forEach(function(c,i){ c.style.animationDelay=(i*90)+'ms'; });
  route();

  /* filters */
  var filters=document.getElementById('filters');
  filters.addEventListener('click',function(e){
    var b=e.target.closest('button'); if(!b) return;
    filters.querySelectorAll('button').forEach(function(x){x.classList.toggle('is-on',x===b); x.setAttribute('aria-pressed',String(x===b))});
    var f=b.dataset.f;
    document.querySelectorAll('#all-grid .card').forEach(function(c){
      var tags=(c.dataset.tags||'').toLowerCase();
      c.classList.toggle('is-hidden', f!=='all' && tags.split(', ').indexOf(f)===-1);
    });
    popIn();
  });

  /* contact form (prototype) */
  var form=document.getElementById('contactForm');
  form.addEventListener('submit',function(e){
    e.preventDefault();
    var ok=true;
    form.querySelectorAll('input[required],textarea[required]').forEach(function(i){ var v=i.value.trim(); var bad=!v||(i.type==='email'&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)); i.style.borderBottomColor=bad?'#e07a7a':''; if(bad) ok=false; });
    if(!ok) return;
    var btn=document.getElementById('f-send'); btn.innerHTML='<span class="spin" aria-hidden="true"></span><span>Sending…</span>'; btn.disabled=true;
    var old=form.querySelector('.sent-err'); if(old) old.remove();
    var data=new URLSearchParams(new FormData(form)).toString();
    var t0=Date.now();
    var after=function(fn){ var wait=Math.max(0,2000-(Date.now()-t0)); setTimeout(fn,wait); };
    var ok=function(){ after(function(){ form.innerHTML='<div class="sent">Your message was sent, thank you!</div>'; }); };
    var fail=function(code){ after(function(){
        btn.innerHTML='<span>Send message</span>'; btn.disabled=false;
        var e=document.createElement('div'); e.className='sent sent-err';
        e.textContent='Something went wrong'+(code?' ('+code+')':'')+'. Please try again or write to hello@adamusdaniel.com.';
        form.appendChild(e); }); };
    var post=function(url){ return fetch(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:data}); };
    post('/').then(function(r){ if(r.ok){ ok(); return; }
        return post(location.pathname).then(function(r2){ if(r2.ok) ok(); else fail(r2.status); }); })
      .catch(function(){ fail('no connection'); });
  });
  document.getElementById('yr').textContent=new Date().getFullYear();
  window.addEventListener('hashchange',function(){ setTimeout(function(){ window.dispatchEvent(new Event('resize')); },60); });
  document.querySelectorAll('.btn').forEach(function(b){ b.addEventListener('mousemove',function(e){ var r=b.getBoundingClientRect(); b.style.setProperty('--x',(e.clientX-r.left)+'px'); b.style.setProperty('--y',(e.clientY-r.top)+'px'); }); });

  /* hero typing after the photo has loaded */
  (function(){
    var img=document.getElementById('heroPhoto'), out=document.getElementById('typed'), caret=document.getElementById('caret');
    var text="I'm Daniel", i=0, started=false;
    function type(){ if(i<text.length){ out.textContent+=text.charAt(i++); setTimeout(type, 42+Math.random()*34); } else { document.querySelector('.hero-text').classList.add('typed-done'); } }
    function start(){ if(started) return; started=true; setTimeout(type,500); }
    if(img.complete) start(); else { img.addEventListener('load',start); img.addEventListener('error',start); }
    setTimeout(start,2200);
  })();

  /* years of experience: first role in the CV started 04.2020 */
  (function(){ var s=new Date(2020,3,1), n=new Date(); var y=n.getFullYear()-s.getFullYear(); if(n.getMonth()<s.getMonth()) y--; document.getElementById('yrs').textContent=y; document.querySelectorAll('.yrs-inline').forEach(function(e){e.textContent=y}); })();

  /* recommendations: infinite strip — autoplay to the right, drag / swipe / wheel to browse */
  (function(){
    var track=document.getElementById('quotes'), wrap=document.getElementById('quotesWrap');
    var items=Array.prototype.slice.call(track.children), n=items.length;
    /* three copies: [clones][originals][clones] so the strip can move both ways without a visible jump */
    items.forEach(function(c){ var k=c.cloneNode(true); k.setAttribute('aria-hidden','true'); track.appendChild(k); });
    items.slice().reverse().forEach(function(c){ var k=c.cloneNode(true); k.setAttribute('aria-hidden','true'); track.insertBefore(k,track.firstChild); });
    var x=0, target=0, L=0, step=0, raf, timer, dragging=false, sx=0, sxv=0, moved=false, idle;
    function measure(){ track.style.setProperty('--vw', wrap.clientWidth+'px'); var gap=parseFloat(getComputedStyle(track).columnGap)||24; step=track.children[0].getBoundingClientRect().width+gap; L=step*n; }
    function wrapX(){ if(x>=2*L){x-=L;target-=L;} if(x<0){x+=L;target+=L;} }
    function tick(){
      x+= (target-x)*0.14; if(Math.abs(target-x)<0.3) x=target;
      wrapX();
      track.style.transform='translate3d('+(-x)+'px,0,0)';
      if(step) dots();
      raf=requestAnimationFrame(tick);
    }
    var dotsEl=document.getElementById('qDots'); dotsEl.innerHTML=items.map(function(){return '<i></i>'}).join('');
    function dots(){ var i=((Math.round(target/step)%n)+n)%n; dotsEl.querySelectorAll('i').forEach(function(d,k){d.classList.toggle('on',k===i)}); }
    function snap(){ target=Math.round(target/step)*step; }
    function next(){ target=Math.round(target/step)*step+step; }
    function play(){ clearInterval(timer); timer=setInterval(next,5000); }
    function pause(){ clearInterval(timer); }
    function resumeLater(){ clearTimeout(idle); idle=setTimeout(play,4000); }
    /* wheel / trackpad: horizontal intent only, vertical keeps scrolling the page */
    wrap.addEventListener('wheel',function(e){ if(Math.abs(e.deltaX)>Math.abs(e.deltaY)){ e.preventDefault(); target+=e.deltaX; pause(); clearTimeout(idle); idle=setTimeout(function(){snap();play();},250); } },{passive:false});
    /* pointer drag (mouse + touch) */
    wrap.addEventListener('pointerdown',function(e){ dragging=true; moved=false; sx=e.clientX; sxv=target; pause(); wrap.setPointerCapture(e.pointerId); });
    wrap.addEventListener('pointermove',function(e){ if(!dragging) return; var d=e.clientX-sx; if(Math.abs(d)>4){ moved=true; wrap.classList.add('dragging'); } target=sxv-d; x=target; });
    function up(){ if(!dragging) return; dragging=false; wrap.classList.remove('dragging'); snap(); resumeLater(); }
    wrap.addEventListener('pointerup',up); wrap.addEventListener('pointercancel',up); wrap.addEventListener('lostpointercapture',up);
    wrap.addEventListener('click',function(e){ if(moved){ e.preventDefault(); e.stopPropagation(); } },true);
    wrap.addEventListener('mouseenter',pause); wrap.addEventListener('mouseleave',function(){ if(!dragging) play(); });
    document.addEventListener('visibilitychange',function(){ document.hidden?pause():play(); });
    window.addEventListener('resize',function(){ var i=Math.round(target/step); measure(); target=i*step; x=target; });
    measure(); x=target=L; /* start on the originals */
    tick(); play();
  })();
})();
