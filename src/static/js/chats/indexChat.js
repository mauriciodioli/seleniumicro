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