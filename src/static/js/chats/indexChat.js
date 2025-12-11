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

// ================== FUNCIÓN EXCLUSIVA PARA EL BOTÓN "USER" ==================
function goToUserIndexView() {
  console.log('[indexChat] goToUserIndexView → volver a index / identidades');

  const root = document.documentElement;

  // 1) Cerrar MyDomain si está abierto (móvil o desktop)
  const backMd   = document.getElementById('btnMdBack');      // móvil
  const backMain = document.getElementById('btnBackToMain');  // desktop

  const visibleBack =
    (backMd   && backMd.offsetParent   !== null) ? backMd   :
    (backMain && backMain.offsetParent !== null) ? backMain :
    null;

  if (visibleBack) {
    console.log('[indexChat] MyDomain overlay activo, cerrando via botón visible');
    visibleBack.click();
  }

  // 1.b) MATAR a la fuerza el overlay de MyDomain (mobile + desktop)
  // Panel fijo en mobile
  const myDomainRight = document.getElementById('myDomainRight');
  if (myDomainRight) {
    myDomainRight.removeAttribute('data-view');      // quita "right"
    myDomainRight.style.transform = 'translateX(100%)';
    myDomainRight.style.display   = 'none';          // lo sacamos del flujo
  }

  // Contenedor general de MyDomain si existe
  const myDomainView = document.getElementById('myDomainView');
  if (myDomainView) {
    myDomainView.classList.remove('show');
    myDomainView.style.display = 'none';
  }

  // Y aseguramos que el GRID principal esté visible
  const mainWrap = document.querySelector('.wrap');   // el que envuelve .app-grid
  if (mainWrap) {
    mainWrap.style.display = '';    // deja que el CSS lo ponga como antes (flex/block)
    mainWrap.classList.remove('hidden');
  }

  // 2) Modo USER en el body
  document.body.classList.remove('mode-domain', 'domain-right');
  document.body.classList.add('mode-user');

  // 3) Vista identidades (pantalla lógica)
  setView('view-identidades');   // maneja view-*

  // 4) Resetear el slide en <html> / <body> y dejar identidades
  root.classList.remove('slide-ambitos', 'slide-chat', 'slide-identidades');
  root.classList.add('slide-identidades');

  document.body.classList.remove('slide-ambitos', 'slide-chat');
  document.body.classList.add('slide-identidades');

  // 5) Forzar carrusel visual a la primera columna (por si usa scroll)
  const appGrid = document.querySelector('.app-grid');
  if (appGrid) {
    appGrid.scrollLeft = 0;
  }

  console.log('[indexChat] after goToUserIndexView', {
    html: root.className,
    body: document.body.className,
    wrapDisplay: mainWrap && getComputedStyle(mainWrap).display,
    myDomainRight: myDomainRight && {
      display: getComputedStyle(myDomainRight).display,
      transform: getComputedStyle(myDomainRight).transform,
      dataView: myDomainRight.getAttribute('data-view'),
    }
  });

  // 6) Tabs
  const tabUser   = document.getElementById('tabUser');
  const tabDomain = document.getElementById('tabDomain');
  if (tabUser)   tabUser.classList.add('active');
  if (tabDomain) tabDomain.classList.remove('active');

  // 7) Mobile: si además usás gotoPanel, lo mantenemos
  if (typeof gotoPanel === 'function') {
    gotoPanel('col-identidades');
  }

  // 8) Guardar estado (opcional)
  try {
    localStorage.setItem('CHAT_MAIN_VIEW', 'user');
  } catch (e) {
    console.warn('[indexChat] No se pudo guardar CHAT_MAIN_VIEW', e);
  }
}









// ================== TAB USER (SOLO USER) ==================
document.addEventListener('click', (e) => {
  const btnUser = e.target.closest('#tabUser');
  if (!btnUser) return;              // si no es el botón User, ignoramos

  e.preventDefault();
  console.log('[indexChat] CLICK User (delegado)', e.target);

  goToUserIndexView();
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

