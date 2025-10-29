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


  // --- Helpers de navegación horizontal móvil ---
const strip = document.querySelector('.app-grid');

function gotoPanel(id) {
  const el = document.getElementById(id);
  if (!el) return;
  // En mobile usamos scrollIntoView; en desktop no hacemos nada
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  if (isMobile) el.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
}

// Delegación global: dispara por data-goto
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-goto]');
  if (!btn) return;

  const to = btn.getAttribute('data-goto');
  if (to === 'ambitos') gotoPanel('col-ambitos');
  else if (to === 'chat') gotoPanel('col-chat');
  else if (to === 'identidades') gotoPanel('col-identidades');
});

// Atajos específicos que ya tenés en UI:
// 1) Clic en "nombre de usuario" (badge o header) -> ir a Ámbitos
document.addEventListener('click', (e) => {
  if (e.target.closest('.ctx-badge') || e.target.closest('.user-name')) {
    gotoPanel('col-ambitos');
  }
});

// 2) Clic en un item de ámbitos -> ir al Chat
document.addEventListener('click', (e) => {
  if (e.target.closest('.ambito-item') || e.target.closest('[data-open-chat]')) {
    gotoPanel('col-chat');
  }
});

// 3) Botones “volver” (si querés)
document.addEventListener('click', (e) => {
  if (e.target.matches('#backToAmbitos')) gotoPanel('col-ambitos');
  if (e.target.matches('#backToIdentidades')) gotoPanel('col-identidades');
});
