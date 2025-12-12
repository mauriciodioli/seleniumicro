// ================== BOOT ==================
(async function(){
  const res  = await fetch('/api/boot');   // lee cookie o inicializa
  const boot = await res.json();
  console.log('BOOT', boot);

  // ejemplo de cambio rápido:
  // await fetch('/api/mock/update', {
  //   method:'POST', headers:{'Content-Type':'application/json'},
  //   body: JSON.stringify({ user:{...boot.user, idioma:'es', cp:'4139'},
  //                          scope:{ambito:'tecnologia', categoria:'informatica'} })
  // });

  // reset:
  // await fetch('/api/mock/reset', {method:'POST'});
})();


// ================== COLAPSAR ÁMBITOS ==================
(function(){
  const root       = document.documentElement;
  const btnCollapse = document.getElementById('btnCollapseAmbitos');
  const handle      = document.getElementById('ambitosHandle');

  function setCollapsed(on){
    root.classList.toggle('ambitos-collapsed', on);
    if (handle){
      handle.classList.toggle('hidden', !on);
      if (window.matchMedia('(max-width:768px)').matches){
        handle.textContent = '▼';   // reabrir desde arriba en móvil
      } else {
        handle.textContent = '⟶';   // reabrir desde la izquierda en desktop
      }
    }
  }

  btnCollapse?.addEventListener('click', ()=> setCollapsed(true));
  handle?.addEventListener('click',      ()=> setCollapsed(false));

  window.addEventListener('resize', ()=>{
    if(!root.classList.contains('ambitos-collapsed')) return;
    if (window.matchMedia('(max-width:768px)').matches){
      handle.textContent = '▼';
    } else {
      handle.textContent = '⟶';
    }
  });

  window.addEventListener('keydown', (e)=>{
    if(e.ctrlKey && e.key.toLowerCase()==='k'){ e.preventDefault(); setCollapsed(true); }
    if(e.ctrlKey && e.key.toLowerCase()==='j'){ e.preventDefault(); setCollapsed(false); }
  });
})();


// ================== HELPER DE VISTA (MOBILE “pantallas”) ==================
function setView(viewName) {
  const root = document.documentElement; // <html>
  root.classList.remove('view-identidades', 'view-ambitos', 'view-chat');
  if (viewName) root.classList.add(viewName);
  console.log('[setView]', root.className);
}


// ================== SCROLL VERTICAL POR data-goto (DENTRO DE ÁMBITOS) ==================
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-goto]');
  if (!btn) return;

  const to = btn.getAttribute('data-goto');
  console.log('[indexChat] data-goto click', { to });

  if (to === 'amb-card') {
    const card = document.getElementById('amb-card');
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
});


// ================== ATAJOS EXISTENTES (nombre de usuario / ámbitos / chat) ==================
document.addEventListener('click', (e) => {
  if (e.target.closest('.ctx-badge') || e.target.closest('.user-name')) {
    setView('view-ambitos');
  }
});

document.addEventListener('click', (e) => {
  if (e.target.closest('.ambito-item') || e.target.closest('[data-open-chat]')) {
    setView('view-chat');
  }
});

document.addEventListener('click', (e) => {
  if (e.target.matches('#backToAmbitos')) {
    setView('view-ambitos');
  }
  if (e.target.matches('#backToIdentidades')) {
    setView('view-identidades');
  }
});
















// ================== TAB USER (SOLO USER) ==================
// ================== TAB USER ==================
document.addEventListener('click', (e) => {
  const btnUser = e.target.closest('#tabUser');
  if (!btnUser) return;

  e.preventDefault();
  console.log('[indexChat] CLICK User');

  // 👉 Si MyDomain está abierto, lo cerramos
  const mdOpen =
    document.getElementById('myDomainView')?.classList.contains('show');

  if (mdOpen && typeof window.closeMyDomain === 'function') {
    console.log('[indexChat] User → closeMyDomain()');
    window.closeMyDomain();
    return;
  }

  // 👉 Si NO está abierto, User no hace nada especial
  // (queda como tab visual / futura navegación)
});



// ================== TAB DOMAIN (TOTALMENTE SEPARADO) ==================
document.addEventListener('click', (e) => {
  const btnDomain = e.target.closest('tabDomain');
  if (!btnDomain) return;            // si no es el botón Domain, ignoramos

  e.preventDefault();
  console.log('[indexChat] CLICK Domain (delegado)', e.target);

  // modo domain ON
  document.body.classList.add('mode-domain');

  // estados visuales de tabs
  const tabUser   = document.getElementById('tabUser');
  const tabDomain = document.getElementById('tabDomain');
  if (tabDomain) tabDomain.classList.add('active');
  if (tabUser)   tabUser.classList.remove('active');

  // vista ámbitos
  setView('view-ambitos');

  // scroll a la card de dominios si existe
  const card = document.getElementById('amb-card');
  if (card) {
    card.scrollIntoView({
      behavior: 'smooth',
      inline: 'start',
      block: 'nearest'
    });
  }

  try {
    localStorage.setItem('CHAT_MAIN_VIEW', 'domain');
  } catch (e2) {
    console.warn('[indexChat] No se pudo guardar CHAT_MAIN_VIEW', e2);
  }
});

