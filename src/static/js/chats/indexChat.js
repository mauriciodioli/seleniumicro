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





// --- Helper: navegar entre paneles (solo mueve en mobile) ---
function gotoPanel(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const isMobile = matchMedia('(max-width: 768px)').matches;
  if (isMobile) el.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
}

// --- Delegación ÚNICA ---
document.addEventListener('click', (e) => {
  const el = e.target.closest(
    '[data-goto], .ctx-badge, .user-name, .ambito-item, #backToAmbitos, #backToIdentidades'
  );
  if (!el) return;

  // Si el click ocurre dentro de <summary>, evitá el toggle automático
  if (el.closest('summary')) {
    e.preventDefault();
    e.stopPropagation();
  }

  // Normalizar destino
  let to = el.getAttribute('data-goto');
  if (!to) {
    if (el.matches('.ctx-badge, .user-name, #backToAmbitos')) to = 'amb-card';
    else if (el.matches('.ambito-item')) to = 'chat';
    else if (el.matches('#backToIdentidades')) to = 'identidades';
  }
  if (!to) return;

  // Mapear destino → columna
  const col =
    to === 'amb-card' ? 'col-ambitos' :
    to === 'chat' ? 'col-chat' :
    to === 'identidades' ? 'col-identidades' : null;

  if (col) gotoPanel(col);
});
