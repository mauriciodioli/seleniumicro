// ==========================================================
// busqueda.js — versión con "Volver" correcto a la IZQUIERDA
// ==========================================================

// --- Helper global de foco (idempotente) ---
(function ensureUIFocus(){
  if (window.UIFocus) return;
  window.UIFocus = {
    wrap:  () => document.querySelector('.my-domain-wrapper'),
    right: () => document.getElementById('myDomainRight'),
    left:  () => document.getElementById('myDomainLeft'),
    toRight(){
      const wrap = this.wrap(); const right = this.right();
      if (!wrap || !right) return;
      if (window.matchMedia('(max-width: 900px)').matches){
        right.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'end' });
        requestAnimationFrame(() => {
          wrap.scrollTo({ left: right.offsetLeft, behavior: 'smooth' });
        });
      }
    },
    toLeft(){
      const wrap = this.wrap();
      if (!wrap) return;
      if (window.matchMedia('(max-width: 900px)').matches){
        wrap.scrollTo({ left: 0, behavior: 'smooth' });
      }
    }
  };
})();

// ----- Helpers de foco en móvil (compat) -----
function focusRightPanel(){
  // conserva tu lógica + compat con helper centralizado
  const wrap = document.querySelector('.my-domain-wrapper');
  const right = document.getElementById('myDomainRight');
  if (!wrap || !right) return;
  if (window.matchMedia('(max-width: 900px)').matches){
    right.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'end' });
    requestAnimationFrame(() => {
      wrap.scrollTo({ left: right.offsetLeft, behavior: 'smooth' });
    });
  }
  // sincroniza helper
  window.UIFocus?.toRight?.();
}

function focusLeftPanel(){
  const wrap = document.querySelector('.my-domain-wrapper');
  if (!wrap) return;
  if (window.matchMedia('(max-width: 900px)').matches){
    wrap.scrollTo({ left: 0, behavior: 'smooth' });
  }
  // sincroniza helper
  window.UIFocus?.toLeft?.();
}

// Botón “← Volver” (si existe, estático)
document.getElementById('btnBackToMain')?.addEventListener('click', (e) => {
  e.preventDefault();
  focusLeftPanel();
});

document.addEventListener('DOMContentLoaded', () => {
  const $ = s => document.querySelector(s);

  // --- endpoints (solo POST) ---
  const API = {
    cps:           '/api/cascade/cps',            // POST -> {ok, items:[{cp, ciudad, ...}]}
    dominios:      '/api/cascade/dominios',       // POST {cp}
    categorias:    '/api/cascade/categorias',     // POST {cp, dom}
    publicaciones: '/api/cascade/publicaciones',  // POST {cp, dom, cat, [user_id]}
    usuarios:      '/api/cascade/usuarios',       // POST {cp, dom, cat}
    usuarioPublicaciones: '/api/cascade/usuario/publicaciones', 
    publicacion:   '/api/cascade/publicacion'     // POST {id}
  };

  let lastQuery = { cp:null, dom:null, cat:null };

  const boton   = document.getElementById('botonAbrirCascada') || document.getElementById('btnAbrirCascada');
  const box     = $('#boxCascada');
  const selLoc  = $('#selLoc');
  const selDom  = $('#selDom');
  const selCat  = $('#selCat');
  const selPub  = $('#selPub');
  const selUsr  = $('#selUsr');
  const mdContent = $('#mdContent');

  if (!boton || !box || !selLoc || !selDom || !selCat || !selPub || !selUsr || !mdContent){
    console.error('Faltan elementos del DOM para la cascada'); return;
  }

  function fillSelect(sel, items, getVal, getTxt, placeholder){
    sel.innerHTML = `<option value="">${placeholder}</option>` +
      items.map(it => `<option value="${getVal(it)}">${getTxt(it)}</option>`).join('');
    sel.disabled = false; sel.hidden = false;
  }

  async function postJSON(url, body){
    const r = await fetch(url, {
      method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body: JSON.stringify(body || {})
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  const fmtFecha = iso => { try { return new Date(iso).toLocaleDateString('es-ES',{day:'2-digit',month:'long',year:'numeric'});} catch { return iso||''; } };
  const starHTML = (score=4.3, count=42) => {
    const full = Math.floor(score), half = (score-full)>=.5;
    return `<span class="stars">${'★'.repeat(full)}${half?'☆':''}</span> <span class="muted">(${count})</span>`;
  };
  function cardHTML(p){
    const titulo = p.titulo || '—';
    const img = p.imagen || '';
    const badge = p.ambito || '—';
    const fecha = fmtFecha(p.fecha_creacion);
    const autor = p.user_id ? `Usuario ${p.user_id}` : '—';
    const wppHref = `https://wa.me/?text=${encodeURIComponent(`Hola, vi tu publicación "${titulo}" en DPIA.`)}`;

    return `
    <article class="tarjeta" data-id="${p.id}">
      <span class="badge">${badge}</span>
      <button class="btn-close" type="button" aria-label="Cerrar">x</button>
      <div class="imgbox">${img ? `<img src="${img}" alt="${titulo}" loading="lazy">` : ''}</div>
      <h4>${titulo}</h4>
      <div>${starHTML(p.score || 4.3, p.reviews || 42)}</div>
      <p class="excerpt">${p.descripcion || ''}</p>
      <div class="muted">${fecha}</div>
      <div class="muted">Publicado por: ${autor}</div>

      <!-- 👇 en vez de link, botón SPA -->
      <a class="cta ver-mas" href="#" data-id="${p.id}">Ver más</a>

      <a class="wpp" href="${wppHref}" target="_blank" rel="noopener" aria-label="WhatsApp">
        <svg viewBox="0 0 24 24"><path d="M20.52 3.48A11.77 11.77 0 0 0 12.06 0 12 12 0 0 0 0 12a11.87 11.87 0 0 0 1.65 6L0 24l6.22-1.63A12 12 0 0 0 12 24 12 12 0 0 0 24 12a11.77 11.77 0 0 0-3.48-8.52Z"/></svg>
      </a>
    </article>`;
  }

  function renderGrid(pubs){
    
    const items = Array.isArray(pubs) ? pubs : (pubs?.items || []);
    mdContent.innerHTML = items.length
      ? `<div class="grid-cards">${ items.map(cardHTML).join('') }</div>`
      : `<p class="muted">Sin resultados.</p>`;
  }

  function resetCascadaUI(){
    [selLoc, selDom, selCat, selPub, selUsr].forEach(s => {
      s.value = ''; s.hidden = true; s.disabled = true; s.innerHTML = '';
    });
  }

  // --- abrir/ocultar cascada ---
  boton.addEventListener('click', async () => {
    box.hidden = !box.hidden;
    if (!box.hidden){
      [selLoc, selDom, selCat, selPub, selUsr].forEach(s => { s.hidden=true; s.disabled=true; s.value=''; });
      const data = await postJSON(API.cps);
      const rows = data?.items || [];
      fillSelect(selLoc, rows, it=>it.cp, it=> (it.ciudad ? `${it.ciudad} — ${it.cp}` : it.cp), '— Elegí CP/Ciudad —');
    }
  });

  // Loc -> Dominios
  selLoc.addEventListener('change', async () => {
    [selDom, selCat, selPub, selUsr].forEach(s => { s.hidden=true; s.disabled=true; s.value=''; });
    if (!selLoc.value) return;
    const data = await postJSON(API.dominios, { cp: selLoc.value });
    fillSelect(selDom, data?.items || [], d=>d.valor, d=>d.label, '— Elegí dominio —');
    mdContent.innerHTML = `<p class="hint">Elegí dominio…</p>`;
    focusRightPanel(); // 👉 lleva la vista al panel derecho
  });

  // Dominio -> Categorías
  selDom.addEventListener('change', async () => {
    [selCat, selPub, selUsr].forEach(s => { s.hidden=true; s.disabled=true; s.value=''; });
    if (!selDom.value) return;
    const data = await postJSON(API.categorias, { cp: selLoc.value, dom: selDom.value });
    const cats = (data?.items || []).map(c => ({ id:c.id, nombre:c.label }));
    fillSelect(selCat, cats, c=>c.id, c=>c.nombre, '— Elegí categoría —');
    mdContent.innerHTML = `<p class="hint">Elegí categoría…</p>`;
    focusRightPanel();
  });

  // Categoría -> publicaciones + usuarios
  selCat.addEventListener('change', async () => {
    [selPub, selUsr].forEach(s => { s.hidden=true; s.disabled=true; s.value=''; });
    const cp = selLoc.value, dom = selDom.value, cat = selCat.value; if (!cat) return;
    lastQuery = { cp, dom, cat };
    window.lastQuery = lastQuery; // conserva tu convención global

    // publicaciones
    const dataP = await postJSON(API.publicaciones, lastQuery);
    const pubs  = dataP?.items || [];
    renderGrid(pubs);
    fillSelect(selPub, pubs, p=>p.id, p=>p.titulo, '— Opcional: una publicación —');
    focusRightPanel(); // 👉 muestra grilla a la vista
    focusRightOnMobile();

    // usuarios
    const dataU = await postJSON(API.usuarios, lastQuery);
    const usrs  = (dataU?.items || []).map(u => ({ id:u.id, nombre:`${u.nombre} (${u.n})` }));
    if (usrs.length){
      fillSelect(selUsr, usrs, u=>u.id, u=>u.nombre, '— Opcional: un usuario —');
    } else {
      selUsr.innerHTML = `<option value="">— Sin usuarios —</option>`;
      selUsr.hidden = false; selUsr.disabled = true;
    }
  });
// Usuario -> filtra publicaciones
selUsr.addEventListener('change', async () => {
  const user_id = Number(selUsr.value);
  if (!user_id){
    const data = await postJSON(API.publicaciones, lastQuery);
    return renderGrid(data); // <<<<<< cambia esto (antes pasabas data?.items)
  }

  mdContent.innerHTML = `<p class="muted">Cargando publicaciones del usuario…</p>`;
  try {
    const payload = { ...(lastQuery || {}), user_id }; // por si el backend lo pide
    const data = await postJSON(API.usuarioPublicaciones, payload);
    renderGrid(data);                  // <<<<<< cambia esto (antes pasabas data?.items || [])
    window.UIFocus?.toRight?.();       // o focusRightPanel();
  } catch (e) {
    console.error(e);
    mdContent.innerHTML = `<p class="muted">Error cargando publicaciones del usuario.</p>`;
  }
});


  // Publicación -> SOLO esa publicación (limpia la cascada)
  selPub.addEventListener('change', async () => {
    const id = selPub.value; if (!id) return;
    mdContent.innerHTML = `<p class="muted">Cargando publicación…</p>`;
    try {
      const data = await postJSON(API.publicacion, { id: Number(id) });
      const p = data?.item;
      if (!p){ mdContent.innerHTML = `<p class="muted">No encontrada.</p>`; return; }
      resetCascadaUI();
      mdContent.innerHTML = cardHTML(p);
      focusRightPanel(); // 👉 enfoca la tarjeta
      focusRightOnMobile();
    } catch (e) {
      console.error(e);
      mdContent.innerHTML = `<p class="muted">Error cargando publicación.</p>`;
    }
  });
});

function focusRightOnMobile(){
  if (window.matchMedia('(max-width: 900px)').matches){
    const el = document.getElementById('myDomainRight');
    el?.scrollIntoView({ behavior:'smooth', block:'start', inline:'nearest' });
  }
}

// Re-render de la grilla con los últimos filtros
async function showListFromLastQuery(){
  const mdContent = document.getElementById('mdContent');
  if (!window.lastQuery) { 
    if (mdContent) mdContent.innerHTML = `<p class="muted">Elegí una categoría…</p>`;
    return;
  }
  if (mdContent) mdContent.innerHTML = `<p class="muted">Cargando…</p>`;
  try{
    // postJSON y renderGrid están definidos arriba en este mismo archivo
    const data = await (await fetch('/api/cascade/publicaciones', {
      method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'},
      body: JSON.stringify(window.lastQuery)
    })).json();
    // Reutilizamos la lógica de renderGrid local:
    const items = Array.isArray(data?.items) ? data.items : [];
    mdContent.innerHTML = items.length
      ? `<div class="grid-cards">${ items.map(p => {
          const fecha = (()=>{ try { return new Date(p.fecha_creacion).toLocaleDateString('es-ES',{day:'2-digit',month:'long',year:'numeric'});} catch { return p.fecha_creacion||''; }})();
          const star = (score=4.3, count=42)=>{ const full = Math.floor(score), half=(score-full)>=.5; return `<span class="stars">${'★'.repeat(full)}${half?'☆':''}</span> <span class="muted">(${count})</span>`; };
          const wppHref = `https://wa.me/?text=${encodeURIComponent(`Hola, vi tu publicación "${p.titulo||'—'}" en DPIA.`)}`;
          return `
            <article class="tarjeta" data-id="${p.id}">
              <span class="badge">${p.ambito || '—'}</span>
              <button class="btn-close" type="button" aria-label="Cerrar">x</button>
              <div class="imgbox">${p.imagen ? `<img src="${p.imagen}" alt="${p.titulo||'—'}" loading="lazy">` : ''}</div>
              <h4>${p.titulo || '—'}</h4>
              <div>${star(p.score || 4.3, p.reviews || 42)}</div>
              <p class="excerpt">${p.descripcion || ''}</p>
              <div class="muted">${fecha}</div>
              <div class="muted">Publicado por: ${p.user_id ? `Usuario ${p.user_id}` : '—'}</div>
              <a class="cta ver-mas" href="#" data-id="${p.id}">Ver más</a>
              <a class="wpp" href="${wppHref}" target="_blank" rel="noopener" aria-label="WhatsApp">
                <svg viewBox="0 0 24 24"><path d="M20.52 3.48A11.77 11.77 0 0 0 12.06 0 12 12 0 0 0 0 12a11.87 11.87 0 0 0 1.65 6L0 24l6.22-1.63A12 12 0 0 0 12 24 12 12 0 0 0 24 12a11.77 11.77 0 0 0-3.48-8.52Z"/></svg>
              </a>
            </article>`;
        }).join('') }`
      : `<p class="muted">Sin resultados.</p>`;
  }catch(e){
    console.error(e);
    if (mdContent) mdContent.innerHTML = `<p class="muted">No se pudo cargar.</p>`;
  }
  focusRightOnMobile();
}

// 1A) Delegado: “Lista” del header derecho o back dentro del micrositio
// 1A) Delegado: “Lista” del header derecho o back dentro del micrositio -> ir SIEMPRE a panel IZQUIERDO
(function attachBackToLeftFromHeader(){
  function goPanelLeft(){
    // Ajustá el contenedor principal de la vista si existe
    const view = document.getElementById('myDomainView');
    if (view){
      // normalizamos el estado visual a "left"
      view.dataset.view = 'left';               // <div id="myDomainView" data-view="left">
      view.classList.add('show');               // por si tu CSS usa .show
    }
    // opcional: darle foco al panel izquierdo
    const left = document.getElementById('myDomainLeft');
    if (left) try { left.focus(); } catch {}

    // y desplazamos en mobile
    window.UIFocus?.toLeft?.();
  }

  document.addEventListener('click', (e) => {
    const backBtn = e.target.closest('#btnMdBack, [data-ms-back]');
    if (!backBtn) return;
    e.preventDefault();

    // No usamos history.back() ni showListFromLastQuery() aquí.
    // La consigna es volver al panel IZQUIERDO sin tocar la lógica de datos.
    // Si estabas en detalle, solo marcamos que ya no estás en modo micrositio.
    if (window.__MICROSITIO_MODE__) window.__MICROSITIO_MODE__ = false;

    goPanelLeft();
  });
})();


window.addEventListener('popstate', () => {
  const st = history.state || {};
  if (st.scope === 'micrositio') {
    const mdContent = document.getElementById('mdContent');
    if (window.lastQuery){
      if (mdContent) mdContent.innerHTML = `<p class="muted">Cargando…</p>`;
      fetch('/api/cascade/publicaciones', {
        method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'},
        body: JSON.stringify(window.lastQuery)
      })
      .then(r => r.json())
      .then(d => {
        const items = d?.items || [];
        if (mdContent) {
          mdContent.innerHTML = items.length
            ? `<div class="grid-cards">${ items.map(it => `<article class="tarjeta" data-id="${it.id}">
                <span class="badge">${it.ambito || '—'}</span>
                <button class="btn-close" type="button" aria-label="Cerrar">x</button>
                <div class="imgbox">${it.imagen ? `<img src="${it.imagen}" alt="${it.titulo||'—'}" loading="lazy">` : ''}</div>
                <h4>${it.titulo || '—'}</h4>
                <a class="cta ver-mas" href="#" data-id="${it.id}">Ver más</a>
              </article>`).join('') }</div>`
            : `<p class="muted">Sin resultados.</p>`;
        }
      })
      .catch(() => { if (mdContent) mdContent.innerHTML = `<p class="muted">No se pudo cargar.</p>`; })
      .finally(() => window.UIFocus?.toLeft?.());
    } else {
      if (mdContent) mdContent.innerHTML = `<p class="muted">Elegí un ámbito/categoría de la izquierda.</p>`;
      window.UIFocus?.toLeft?.();
    }
  }
});

// Cerrar tarjeta (delegado global)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-close');
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation(); // evita que dispare otros clicks (p.ej. "Ver más")

  const card = btn.closest('.tarjeta');
  if (card) card.remove();

  // Si no quedó ninguna tarjeta, volvemos a la lista anterior o mostramos hint
  const grid = document.querySelector('.grid-cards');
  const mdContent = document.getElementById('mdContent');
  if (!document.querySelector('.tarjeta')) {
    if (typeof showListFromLastQuery === 'function') {
      showListFromLastQuery();
    } else if (mdContent) {
      mdContent.innerHTML = `<p class="muted">Elegí una categoría…</p>`;
    }
  } else if (grid && grid.children.length === 0) {
    // limpieza defensiva
    typeof showListFromLastQuery === 'function'
      ? showListFromLastQuery()
      : (mdContent.innerHTML = `<p class="muted">Sin resultados.</p>`);
  }
});




