// ----- Helpers de foco en móvil -----
function focusRightPanel(){
  const wrap = document.querySelector('.my-domain-wrapper');
  const right = document.getElementById('myDomainRight');
  if (!wrap || !right) return;

  if (window.matchMedia('(max-width: 900px)').matches){
    // intenta con scrollIntoView y, por las dudas, con scrollLeft preciso
    right.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'end' });
    requestAnimationFrame(() => {
      wrap.scrollTo({ left: right.offsetLeft, behavior: 'smooth' });
    });
  }
}

function focusLeftPanel(){
  const wrap = document.querySelector('.my-domain-wrapper');
  if (!wrap) return;
  if (window.matchMedia('(max-width: 900px)').matches){
    wrap.scrollTo({ left: 0, behavior: 'smooth' });
  }
}

// Botón “← Volver” (si existe)
document.getElementById('btnBackToMain')?.addEventListener('click', focusLeftPanel);

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
    <button class="btn-close" aria-label="Cerrar">x</button>
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
  const user_id = selUsr.value;
  if (!user_id){
    // Si deselecciona, volvemos a lo filtrado por CP/Dominio/Categoría
    const data = await postJSON(API.publicaciones, lastQuery);
    return renderGrid(data?.items || []);
  }
  mdContent.innerHTML = `<p class="muted">Cargando publicaciones del usuario…</p>`;
  try {
    const data = await postJSON(API.usuarioPublicaciones, { user_id });
    renderGrid(data?.items || []);
    focusRightPanel(); // 👉 muestra la grilla filtrada
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
    myDomainRight?.scrollIntoView({ behavior:'smooth', block:'start', inline:'nearest' });
  }
}

// Re-render de la grilla con los últimos filtros
async function showListFromLastQuery(){
  if (!window.lastQuery) { 
    mdContent.innerHTML = `<p class="muted">Elegí una categoría…</p>`;
    return;
  }
  mdContent.innerHTML = `<p class="muted">Cargando…</p>`;
  try{
    const data = await postJSON(API.publicaciones, window.lastQuery);
    renderGrid(data?.items || []);
  }catch(e){
    console.error(e);
    mdContent.innerHTML = `<p class="muted">No se pudo cargar.</p>`;
  }
  focusRightOnMobile();
}

// 1A) Delegado: “Lista” del header derecho o back dentro del micrositio
document.addEventListener('click', (e) => {
  const backBtn = e.target.closest('#btnMdBack, [data-ms-back]');
  if (!backBtn) return;
  e.preventDefault();
  // si hay historial SPA, usalo, si no, recarga lista
  if (history.state?.view === 'detail') {
    history.back(); // disparará el popstate abajo
  } else {
    showListFromLastQuery();
  }
});


window.addEventListener('popstate', (e) => {
  // Si no hay estado o no es 'detail', volvemos a la lista
  if (!e.state || e.state.view !== 'detail') {
    showListFromLastQuery();
  }
});


