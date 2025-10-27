  // Estado de modo de búsqueda
  let searchMode = 'user';

  // Cambiar modo al hacer clic en tabs
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('.search-tabs .tab');
    if(!btn) return;
    searchMode = btn.dataset.mode;           // 'user' o 'domain'
    document.querySelectorAll('.search-tabs .tab')
            .forEach(b=>b.classList.toggle('active', b===btn));

    const q = document.getElementById('q');
    if(searchMode === 'user'){
      q.placeholder = "Buscar por teléfono +E.164, @alias o nombre…  Ej: +54938385478 o @DrPeralta";
    }else{
      q.placeholder = "Buscar por Ámbito/Domain…  Ej: salud, tecnología, turismo, CP:28080, idioma:es";
    }
    q.focus();
  });

  // Buscar con botón o Enter
  document.getElementById('btnSearch').addEventListener('click', performSearch);
  document.getElementById('q').addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){ performSearch(); }
  });

  function performSearch(){
    const term = (document.getElementById('q').value || '').trim();
    if(!term) return;

    if(searchMode === 'user'){
      // === BÚSQUEDA DE USUARIO ===
      // Soportá: +E.164, @alias, nombre libre
      // Acá llamás a tu endpoint actual de usuarios
      // Ejemplo:
      // fetch(`/api/search/user?q=${encodeURIComponent(term)}`)
      //   .then(r=>r.json()).then(renderIdentidades);
      console.log('[SEARCH:user]', term);
      buscarUsuario(term); // <-- tu función existente si ya la tenés
    }else{
      // === BÚSQUEDA POR ÁMBITOS / DOMAIN ===
      // Soportá: ámbito, CP:nnnnn, idioma:xx
      // Ejemplo de parseo simple:
      const payload = parseDomainQuery(term);
      console.log('[SEARCH:domain]', payload);
      // fetch(`/api/search/domain`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)})
      //   .then(r=>r.json()).then(renderAmbitos);
      buscarAmbitos(payload); // <-- crea/usa tu función para ámbitos
    }
  }

  // Parser muy simple: "salud CP:28080 idioma:es"
  function parseDomainQuery(q){
    const out = { texto:'', cp:null, idioma:null, ambito:null };
    const parts = q.split(/\s+/);
    for(const p of parts){
      if(/^cp:\d+$/i.test(p)) out.cp = p.split(':')[1];
      else if(/^idioma:\w{2}$/i.test(p)) out.idioma = p.split(':')[1].toLowerCase();
      else if(!out.ambito) out.ambito = p.toLowerCase(); // primera palabra libre = ámbito
      else out.texto += (out.texto?' ':'') + p;
    }
    return out;
  }

  // Stubs para no romper nada si todavía no tenés las funciones
  function buscarUsuario(q){ /* TODO: integrar con tu backend */ }
  function buscarAmbitos(filters){ /* TODO: integrar con tu backend */ }