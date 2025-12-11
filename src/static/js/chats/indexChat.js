(async function(){
  const res = await fetch('/api/boot');           // lee cookie o inicializa
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
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 (function(){
    const root = document.documentElement; // o document.body
    const btnCollapse = document.getElementById('btnCollapseAmbitos');
    const handle = document.getElementById('ambitosHandle');

    function setCollapsed(on){
      root.classList.toggle('ambitos-collapsed', on);
      // Mostrar/ocultar handle
      if(handle){
        handle.classList.toggle('hidden', !on);
        // Chevrón direccional según breakpoint
        if (window.matchMedia('(max-width:768px)').matches){
          handle.textContent = '▼'; // reabrir desde arriba en móvil
        } else {
          handle.textContent = '⟶'; // reabrir desde la izquierda en desktop
        }
      }
    }

    btnCollapse?.addEventListener('click', ()=> setCollapsed(true));
    handle?.addEventListener('click', ()=> setCollapsed(false));

    // Ajustar icono al redimensionar
    window.addEventListener('resize', ()=>{
      if(!root.classList.contains('ambitos-collapsed')) return;
      if (window.matchMedia('(max-width:768px)').matches){
        handle.textContent = '▼';
      } else {
        handle.textContent = '⟶';
      }
    });

    // Accesos rápidos: Ctrl+K colapsa / Ctrl+J expande
    window.addEventListener('keydown', (e)=>{
      if(e.ctrlKey && e.key.toLowerCase()==='k'){ e.preventDefault(); setCollapsed(true); }
      if(e.ctrlKey && e.key.toLowerCase()==='j'){ e.preventDefault(); setCollapsed(false); }
    });
  })();

// ================== HELPER DE VISTA (MOBILE “pantallas”) ==================
function setView(viewName) {
  const root = document.documentElement; // <html>
  root.classList.remove('view-identidades', 'view-ambitos', 'view-chat');
  if (viewName) {
    root.classList.add(viewName);
  }
  console.log('[setView]', root.className);
}


// ================== SCROLL VERTICAL POR data-goto (DENTRO DE ÁMBITOS) ==================
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-goto]');
  if (!btn) return;

  const to = btn.getAttribute('data-goto');
  console.log('[indexChat] data-goto click', { to });

  // Solo mantenemos el comportamiento que ya tenías:
  if (to === 'amb-card') {
    const card = document.getElementById('amb-card');
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  // OJO: acá NO tocamos columnas, eso lo maneja setView() arriba.
});


// ================== ATAJOS EXISTENTES (nombre de usuario / ámbitos / chat) ==================

// 1) Clic en "nombre de usuario" (badge o header) -> ir a Ámbitos (pantalla ámbitos)
document.addEventListener('click', (e) => {
  if (e.target.closest('.ctx-badge') || e.target.closest('.user-name')) {
    setView('view-ambitos');
  }
});

// 2) Clic en un item de ámbitos -> ir al Chat
document.addEventListener('click', (e) => {
  if (e.target.closest('.ambito-item') || e.target.closest('[data-open-chat]')) {
    setView('view-chat');
  }
});

// 3) Botones “volver” (si los usás)
//    backToAmbitos  -> vuelve a ámbitos
//    backToIdentidades -> vuelve a identidades
document.addEventListener('click', (e) => {
  if (e.target.matches('#backToAmbitos')) {
    setView('view-ambitos');
  }
  if (e.target.matches('#backToIdentidades')) {
    setView('view-identidades');
  }
});


// ================== TABS "USER" / "DOMAIN" EN ÁMBITOS ==================
document.addEventListener('DOMContentLoaded', () => {
  const tabUser   = document.getElementById('tabUser');
  const tabDomain = document.getElementById('tabDomain');

  console.log('[indexChat] tabs ámbitos:', { tabUser, tabDomain });
  if (!tabUser || !tabDomain) return;

  // USER → volver a la pantalla de identidades (como WhatsApp: lista de contactos)
  tabUser.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('[indexChat] CLICK User');

    document.body.classList.remove('mode-domain');
    tabUser.classList.add('active');
    tabDomain.classList.remove('active');

    setView('view-identidades');
  });

  // DOMAIN → ir a la pantalla de ámbitos (el comportamiento que ya veías)
  tabDomain.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('[indexChat] CLICK Domain');

    document.body.classList.add('mode-domain');
    tabDomain.classList.add('active');
    tabUser.classList.remove('active');

    // Vista de ámbitos
    setView('view-ambitos');

    // Además, si querés que baje hasta la card de dominios:
    const card = document.getElementById('amb-card');
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' }); 
    }
  });
});
