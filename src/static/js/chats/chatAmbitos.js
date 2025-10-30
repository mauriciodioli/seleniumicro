document.addEventListener('DOMContentLoaded', () => {
  const q = document.getElementById('amb-q');
  const btn = document.getElementById('amb-btnSearch');
  const panel = document.getElementById('ambQueryPanel');

  if (!panel) return;

  const open  = () => panel.classList.add('is-open');
  const close = () => panel.classList.remove('is-open');

  // Cerrar por defecto al cargar
  close();

  // Abrir sólo si hay texto o resultados (ajusta esta condición a tu lógica)
  btn?.addEventListener('click', () => {
    const hasQuery = (q?.value || '').trim().length > 0;
    hasQuery ? open() : close();
  });

  // Enter en el input
  q?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const hasQuery = (q.value || '').trim().length > 0;
      hasQuery ? open() : close();
    }
  });

  // Si se borra la query, cerramos
  q?.addEventListener('input', () => {
    if ((q.value || '').trim().length === 0) close();
  });

  // Escape también cierra
  q?.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
});


// === Navegación por tabs User/Domain en móvil ===
(() => {
  const isMobile = () => matchMedia('(max-width:768px)').matches;

  // Devuelve el contenedor de los 3 paneles (acepta .app-grid o .layout-chat)
  const getGrid = () => document.querySelector('.app-grid') || document.querySelector('.layout-chat');

  // Mueve el carrusel por scroll-x (cuando usás el modo "scroll-snap" horizontal)
  function scrollToPanel(panelClass){
    const grid = getGrid();
    if (!grid) return;
    const panels = Array.from(grid.querySelectorAll('.col-identidades, .col-ambitos, .col-chat'));
    const idx = panels.findIndex(p => p.classList.contains(panelClass.replace('.', '')));
    if (idx < 0) return;
    grid.scrollTo({ left: idx * grid.clientWidth, behavior: 'smooth' });
  }

  // Alternativa: usa clases slide-* si estás en ese modo
  function setSlideClass(target){
    
    const root = document.documentElement;
    if (target === 'col-identidades'){
      root.classList.remove('slide-ambitos','slide-chat');
    } else if (target === 'amb-card'){     // tu “Ámbitos”
      root.classList.add('slide-ambitos');
      root.classList.remove('slide-chat');
    } else if (target === 'col-chat'){     // chat
      root.classList.add('slide-chat');
      root.classList.remove('slide-ambitos');
    }
  }

  // Listener único para tabs User/Domain
  document.addEventListener('click', (e) => {
    const tab = e.target.closest('.search-tabs .tab');
    if (!tab) return;

    // marcar activa la tab
    const wrapper = tab.closest('.search-tabs');
    wrapper?.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));

    const goto = tab.dataset.goto; // "col-identidades" | "amb-card" | "col-chat" (según tu HTML)
    if (!goto || !isMobile()) return;

    // 1) carrusel por scroll-x
    if (goto === 'col-identidades') scrollToPanel('col-identidades');
    else if (goto === 'amb-card')   scrollToPanel('col-ambitos');   // tu “Domain/Ámbitos”
    else if (goto === 'col-chat')   scrollToPanel('col-chat');

    // 2) soporte simultáneo para layout con clases slide-*
    setSlideClass(goto);
  });
})();
