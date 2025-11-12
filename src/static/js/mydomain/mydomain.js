document.addEventListener('DOMContentLoaded', () => {
  const mainGrid     = document.querySelector('.app-grid');      // vista 3 columnas
  const myDomainView = document.getElementById('myDomainView');  // vista 2 columnas
  const btnMyDomain  = document.getElementById('btnMyDomain');   // botón de la navbar
  const btnBackMain  = document.getElementById('btnBackToMain'); // botón dentro de MyDomain
  const btnMdBack    = document.getElementById('btnMdBack');     // boton mobile dentro de MyDomain
  const mdLeft       = document.getElementById('myDomainLeft');
  const mdContent    = document.getElementById('mdContent');     // panel derecho donde renderizamos

  // --- 1) abrir desde la navbar (My domain)
  btnMyDomain?.addEventListener('click', openMyDomain);

  // --- 2) abrir desde cualquier botón "Domain" del index
  document.addEventListener('click', (e) => {
    // si ya estoy dentro de MyDomain, no hago nada acá
    if (myDomainView?.classList.contains('show')) return;

    const domainBtn =
      e.target.closest('[data-mode="domain"]') ||
      e.target.closest('[data-goto="my-domain"]');
    if (!domainBtn) return;

    // este "Domain" viene del index → abrir MyDomain
    openMyDomain();
  });

  // --- 3) volver a la vista normal (desktop)
  btnBackMain?.addEventListener('click', closeMyDomain);

  // --- 4) volver a la lista dentro de MyDomain (mobile)
  document.getElementById('btnMdBack')?.addEventListener('click', () => {
  document.getElementById('myDomainRight')?.removeAttribute('data-view');
});


  // --- 5) click en una categoría de la izquierda dentro de MyDomain
  mdLeft?.addEventListener('click', (e) => {
    const btn = e.target.closest('.md-cat, [data-categoria]');
    if (!btn) return;

    const ambito    = btn.dataset.ambito || '';      // dom
    const categoria = btn.dataset.categoria || '';   // cat (id numérico en string)
    const userId    = btn.dataset.userId || '';      // opcional

    // cargar publicaciones del endpoint POST /api/cascade/publicaciones/sinCP/
    loadPubsInMyDomain(ambito, categoria, userId);

    // en mobile → deslizar a la derecha
  // reemplazá donde diga myDomainView.setAttribute('data-view', 'right')
const myDomainRight = document.getElementById('myDomainRight');
if (window.matchMedia('(max-width: 767px)').matches) {
  myDomainRight?.setAttribute('data-view', 'right');
}

  });

  // --- 6) delegación: acciones sobre cada tarjeta renderizada en mdContent
  myDomainView?.addEventListener('click', (e) => {
    // abrir micrositio / ver más
    const btnOpen = e.target.closest('[data-open="pub"]');
    if (btnOpen) {
      const pubId = btnOpen.getAttribute('data-id');
      // acá dejé el hook para que hagas lo que necesites (cargar micrositio, modal, etc)
      // por ejemplo: openMicrositio(pubId);
      return;
    }
  });

  // ===== helpers =====
  function openMyDomain(){
    if (mainGrid) mainGrid.style.display = 'none';
    if (myDomainView){
      myDomainView.classList.add('show');
      myDomainView.setAttribute('data-view', 'left');
    }
  }

  function closeMyDomain(){
    if (mainGrid) mainGrid.style.display = '';
    if (myDomainView) myDomainView.classList.remove('show');
  }

  async function loadPubsInMyDomain(dom, cat, user_id){
    if (!mdContent) return;
    mdContent.innerHTML = '<p class="muted">Cargando…</p>';

    const payload = { dom, cat };
    if (user_id && String(user_id).trim() !== '') payload.user_id = user_id;

    try{
      const r = await fetch('/api/cascade/publicaciones/sinCP/', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Accept':'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      // Intento leer texto primero para tener debug claro
      const raw = await r.text();
      let data;
      try { data = JSON.parse(raw); } catch { data = { ok:false, error: raw || 'JSON inválido' }; }

      if (!r.ok || !data?.ok){
        mdContent.innerHTML = `<p class="error">Error: ${data?.error || 'No se pudo cargar.'}</p>`;
        return;
      }

      const items = Array.isArray(data.items) ? data.items : [];
      mdContent.innerHTML = renderPubs(items);

    }catch(err){
      mdContent.innerHTML = `<p class="error">Error de red: ${err?.message || err}</p>`;
    }
  }

  function renderPubs(list){
    if (!list.length) return '<p class="muted">Sin resultados.</p>';

    return `
      <div class="grid-cards">
        ${list.map(cardHTML).join('')}
      </div>
    `;
  }

  function cardHTML(p){
    const fecha = safeDateIso(p?.fecha_creacion);
    const img   = p?.imagen ? `<img class="md-card-img" src="${escapeAttr(p.imagen)}" alt="">` : '';
    const desc  = p?.descripcion ? `<p class="md-card-desc">${escapeHtml(p.descripcion).slice(0,160)}${p.descripcion.length>160?'…':''}</p>` : '';

    return `
      <article class="md-card" data-id="${p.id}">
        <header class="md-card-head">
          <h4 class="md-card-title">${escapeHtml(p.titulo || '—')}</h4>
          <span class="md-chip">${escapeHtml(p.ambito || '')}</span>
        </header>
        ${img}
        <div class="md-card-meta">
          <span class="md-meta">Cat: ${escapeHtml(String(p.categoria_id || ''))}</span>
          ${p.codigo_postal ? `<span class="md-meta">CP: ${escapeHtml(p.codigo_postal)}</span>` : ''}
          ${fecha ? `<span class="md-meta">${fecha}</span>` : ''}
        </div>
        ${desc}
        <footer class="md-card-actions">
          <button class="btn btn-sm" data-open="pub" data-id="${p.id}">Ver más</button>
        </footer>
      </article>
    `;
  }

  // utils chicos
  function escapeHtml(s=''){
    return String(s)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }
  function escapeAttr(s=''){ return escapeHtml(s).replace(/"/g,'&quot;'); }
  function safeDateIso(iso){
    if (!iso) return '';
    try{
      const d = new Date(iso);
      if (isNaN(d)) return '';
      // dd/mm/yyyy HH:MM
      const pad = n => String(n).padStart(2,'0');
      return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }catch{ return ''; }
  }
});
