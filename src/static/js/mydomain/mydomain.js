// Limpia a E.164 básico (solo dígitos, opcional +)
function normalizePhone(raw=''){
  const s = String(raw).replace(/[^\d+]/g,'');
  if (!s) return '';
  // si empieza con 0 o no tiene +, podés prefijar país por defecto (ej: Italia 39)
  if (s.startsWith('+')) return s;
  // Ajustá tu default si querés: 39 = Italia, 48 = Polonia, 54 = Argentina, etc.
  const DEFAULT_CC = '39';
  return s.replace(/^0+/, '').match(/^\d+$/) ? `${DEFAULT_CC}${s}` : s;
}

// Arma link WA con o sin número
function waLink({ phone='', text='' } = {}){
  const msg = encodeURIComponent(text || '');
  const num = normalizePhone(phone);
  return num ? `https://wa.me/${num}?text=${msg}` : `https://wa.me/?text=${msg}`;
}




document.addEventListener('DOMContentLoaded', () => {
  const mainGrid     = document.querySelector('.app-grid');      // vista 3 columnas
  const myDomainView = document.getElementById('myDomainView');  // vista 2 columnas (si existe)
  const btnMyDomain  = document.getElementById('btnMyDomain');   // botón de la navbar
  const btnBackMain  = document.getElementById('btnBackToMain'); // botón dentro de MyDomain
  const mdLeft       = document.getElementById('myDomainLeft');
  const mdContent    = document.getElementById('mdContent');     // panel derecho donde renderizamos

  // 1) abrir desde la navbar
  btnMyDomain?.addEventListener('click', openMyDomain);

  // 2) abrir desde cualquier botón "Domain" del index
  document.addEventListener('click', (e) => {
    if (myDomainView?.classList.contains('show')) return;
    const domainBtn =
      e.target.closest('[data-mode="domain"]') ||
      e.target.closest('[data-goto="my-domain"]');
    if (!domainBtn) return;
    openMyDomain();
  });

  // 3) volver a la vista normal (desktop)
  btnBackMain?.addEventListener('click', closeMyDomain);

  // 4) volver a la lista dentro de MyDomain (mobile, overlay)
  document.getElementById('btnMdBack')?.addEventListener('click', () => {
    document.getElementById('myDomainRight')?.removeAttribute('data-view');
  });

  // 5) click en categoría (izquierda) → carga publicaciones y en mobile muestra panel derecho
  mdLeft?.addEventListener('click', (e) => {
    const btn = e.target.closest('.md-cat, [data-categoria]');
    if (!btn) return;

    const ambito    = btn.dataset.ambito || '';
    const categoria = btn.dataset.categoria || '';
    const userId    = btn.dataset.userId || '';

    loadPubsInMyDomain(ambito, categoria, userId);

    const myDomainRight = document.getElementById('myDomainRight');
    if (window.matchMedia('(max-width: 767px)').matches) {
      myDomainRight?.setAttribute('data-view', 'right');
    }
  });

  // 6) delegación legacy (NO rompe flujo): mantiene tu handler existente
  myDomainView?.addEventListener('click', (e) => {
    const btnOpen = e.target.closest('[data-open="pub"]');
    if (btnOpen) {
      const pubId = btnOpen.getAttribute('data-id');
      // Hook legacy: acá podrías abrir otra UI si quisieras.
      // micrositio.js se engancha por .ver-mas en #myDomainRight, así que no hacemos nada más.
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

  // Helper global para micrositio.js
  window.postJSON = window.postJSON || (async function(url, body){
    const r = await fetch(url, {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Accept':'application/json' },
      credentials:'include',
      body: JSON.stringify(body||{})
    });
    const text = await r.text();
    let data; try { data = JSON.parse(text); } catch { data = { ok:false, error:text }; }
    if (!r.ok || data?.ok === false) throw new Error(data?.error || 'Request failed');
    return data;
  });

  async function loadPubsInMyDomain(dom, cat, user_id){
    if (!mdContent) return;
    mdContent.innerHTML = '<p class="muted">Cargando…</p>';

    const payload = { dom, cat };
    if (user_id && String(user_id).trim() !== '') payload.user_id = user_id;

    // Exponer para micrositio.js (volver a la grilla)
    window.API = window.API || {};
    window.API.publicaciones = '/api/cascade/publicaciones/sinCP/';
    window.lastQuery = payload;

    try{
      const r = await fetch(window.API.publicaciones, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Accept':'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const raw = await r.text();
      let data;
      try { data = JSON.parse(raw); } catch { data = { ok:false, error: raw || 'JSON inválido' }; }

      if (!r.ok || !data?.ok){
        mdContent.innerHTML = `<p class="error">Error: ${data?.error || 'No se pudo cargar.'}</p>`;
        return;
      }

      const items = Array.isArray(data.items) ? data.items : [];

      // renderizador global para “← Volver” del micrositio
      window.renderGrid = function(pubs){
        const list = Array.isArray(pubs) ? pubs : (pubs?.items || []);
        mdContent.innerHTML = list.length
          ? `<div class="grid-cards">${ list.map(cardHTML).join('') }</div>`
          : `<p class="muted">Sin resultados.</p>`;
      };

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
  const desc  = p?.descripcion ? `${p.descripcion}` : '';
  const title = p?.titulo || '—';

  // intenta deducir teléfono (ajustá el nombre del campo si tu API usa otro)
  const phone = p?.whatsapp || p?.telefono || '';

  // Texto que se envía por WA
  const shareText = `${title}\n${p?.ambito||''} · Cat:${p?.categoria_id||''}${p?.codigo_postal?` · CP:${p.codigo_postal}`:''}`;

  // Link final de WhatsApp
  const waHref = waLink({ phone, text: shareText });

  return `
    <article class="md-card" data-id="${p.id}">
      <header class="md-card-head">
        <h4 class="md-card-title">${escapeHtml(title)}</h4>
        <span class="md-chip">${escapeHtml(p.ambito || '')}</span>
      </header>
      ${img}
      <div class="md-card-meta">
        <span class="md-meta">Cat: ${escapeHtml(String(p.categoria_id || ''))}</span>
        ${p.codigo_postal ? `<span class="md-meta">CP: ${escapeHtml(p.codigo_postal)}</span>` : ''}
        ${fecha ? `<span class="md-meta">${fecha}</span>` : ''}
      </div>
      ${desc ? `<p class="md-card-desc">${escapeHtml(desc).slice(0,160)}${desc.length>160?'…':''}</p>` : ''}

      <footer class="md-card-actions" style="display:flex;gap:8px;align-items:center;">
        <button class="btn btn-sm ver-mas" data-open="pub" data-id="${p.id}">Ver más</button>

        <!-- Botón WhatsApp (link) -->
       ${ phone ? `
          <a class="wpp" href="${waHref}" target="_blank" rel="noopener" title="Chatear por WhatsApp" aria-label="WhatsApp"> ...svg... </a>
        ` : '' }

          <!-- Ícono SVG WhatsApp -->
          <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
            <path d="M19.11 17.27a.86.86 0 0 0-1.23-.19l-.42.31a1 1 0 0 1-1.14.06 6.47 6.47 0 0 1-2.03-1.46 6.1 6.1 0 0 1-1.23-1.85 1 1 0 0 1 .2-1.13l.36-.4a.86.86 0 0 0 .05-1.23l-1.09-1.24a.87.87 0 0 0-1.21-.08c-.55.48-1.07 1.05-1.2 1.74-.29 1.54.51 3.38 2.5 5.37s3.83 2.79 5.37 2.5c.69-.13 1.26-.65 1.74-1.2a.87.87 0 0 0-.08-1.21l-1.22-.99z" fill="#fff"/>
            <path d="M26.5 14.5A10.5 10.5 0 1 0 5.87 22.1L5 27l4.98-1a10.48 10.48 0 0 0 16.52-8.5zm-10.5 9a8.5 8.5 0 1 1 0-17 8.5 8.5 0 0 1 0 17z" fill="#fff"/>
          </svg>
        </a>
      </footer>
    </article>
  `;
}

  // utils
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
      const pad = n => String(n).padStart(2,'0');
      return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }catch{ return ''; }
  }
});