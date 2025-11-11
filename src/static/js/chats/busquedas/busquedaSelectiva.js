document.addEventListener('DOMContentLoaded', () => {
  const $ = s => document.querySelector(s);

  // --- endpoints (POST-only) ---
  const API = {
    cps:               '/api/cascade/cps', // POST -> {ok, items:[{cp,ciudad,...}]}
    dominios:          '/api/cascade/dominios', // POST body:{cp}
    categorias:        '/api/cascade/categorias', // POST body:{cp,dom}
    publicaciones:     '/api/cascade/publicaciones', // POST body:{cp,dom,cat}
    publicacionDetalle: (id) => `/api/cascade/publicacion/${id}` // GET -> {ok,item}
  };

  const boton   = document.getElementById('botonAbrirCascada') || document.getElementById('btnAbrirCascada');
  const box     = $('#boxCascada');
  const selLoc  = $('#selLoc');
  const selDom  = $('#selDom');
  const selCat  = $('#selCat');
  const selPub  = $('#selPub');
  const selUsr  = $('#selUsr');
  const mdContent = $('#mdContent');

  if (!boton || !box || !selLoc || !selDom || !selCat || !selPub || !selUsr || !mdContent){
    console.error('Faltan elementos del DOM para la cascada');
    return;
  }

  function fillSelect(sel, items, getVal, getTxt, placeholder){
    sel.innerHTML = `<option value="">${placeholder}</option>` +
      items.map(it => `<option value="${getVal(it)}">${getTxt(it)}</option>`).join('');
    sel.disabled = false;
    sel.hidden = false;
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
const fmtFecha = iso => {
  try { return new Date(iso).toLocaleDateString('es-ES', {day:'2-digit', month:'long', year:'numeric'}); }
  catch { return iso || ''; }
};

const starHTML = (score=4.3, count=42) => {
  const full = Math.floor(score), half = (score - full) >= .5;
  let s = '';
  for (let i=0;i<full;i++) s += '★';
  if (half) s += '☆'; // si querés media estrella real, reemplazá por SVG
  return `<span class="stars">${s}</span> <span class="muted">(${count})</span>`;
};
function cardHTML(p){
  const titulo = p.titulo || '—';
  const img = p.imagen || '';
  const badge = (p.ambito || 'Médicos'); // ajustá si tenés nombre de categoría
  const fecha = fmtFecha(p.fecha_creacion);
  const autor = p.user_id ? `Usuario ${p.user_id}` : '—';
  const linkMas = `/publicacion/${p.id}`;
  const wppMsg = encodeURIComponent(`Hola, vi tu publicación "${titulo}" en DPIA.`);
  const wppHref = `https://wa.me/?text=${wppMsg}`;

  return `
  <article class="tarjeta" data-id="${p.id}">
    <span class="badge">${badge}</span>
    <button class="btn-close" aria-label="Cerrar">x</button>

    <div class="imgbox">
      ${img ? `<img src="${img}" alt="${titulo}" loading="lazy">` : ''}
    </div>

    <h4>${titulo}</h4>
    <div>${starHTML(p.score || 4.3, p.reviews || 42)}</div>

    <p class="excerpt">${p.descripcion || ''}</p>

    <div class="muted">${fecha}</div>
    <div class="muted">Publicado por: ${autor}</div>

    <a class="cta" href="${linkMas}">Ver más</a>

    <a class="wpp" href="${wppHref}" target="_blank" rel="noopener" aria-label="WhatsApp">
      <svg viewBox="0 0 24 24"><path d="M20.52 3.48A11.77 11.77 0 0 0 12.06 0 12 12 0 0 0 0 12a11.87 11.87 0 0 0 1.65 6L0 24l6.22-1.63A12 12 0 0 0 12 24 12 12 0 0 0 24 12a11.77 11.77 0 0 0-3.48-8.52ZM12 21.8a9.7 9.7 0 0 1-4.95-1.35l-.36-.21-3.69 1 1-3.6-.24-.37A9.8 9.8 0 1 1 12 21.8Zm5.42-7.33c-.3-.15-1.77-.87-2.04-.97s-.47-.15-.67.15-.77.97-.94 1.17-.35.22-.65.07a7.94 7.94 0 0 1-2.33-1.44 8.74 8.74 0 0 1-1.61-2c-.17-.3 0-.46.13-.61s.3-.35.45-.52.22-.3.34-.5a.55.55 0 0 0 0-.52c-.08-.15-.67-1.62-.92-2.22s-.49-.5-.67-.5h-.56a1.08 1.08 0 0 0-.77.37 3.23 3.23 0 0 0-1 2.4 5.61 5.61 0 0 0 1.17 2.94 12.86 12.86 0 0 0 4.94 4.77 16.9 16.9 0 0 0 1.69.62 4 4 0 0 0 1.83.11 3 3 0 0 0 2-1.42 2.5 2.5 0 0 0 .17-1.42c-.07-.12-.27-.19-.57-.35Z"/></svg>
    </a>
  </article>`;
}

  // === pinta lista completa en la grilla ===
function renderGrid(pubs){
  const items = Array.isArray(pubs) ? pubs : (pubs?.items || []);
  if (!items.length){ mdContent.innerHTML = `<p class="muted">Sin resultados.</p>`; return; }
  mdContent.innerHTML = `<div class="grid-cards">${ items.map(cardHTML).join('') }</div>`;
}

async function focusOne(id){
  const r = await fetch(`/api/cascade/publicacion/${id}`);
  const data = await r.json();
  const p = data?.item;
  if (!p){ mdContent.innerHTML = `<p class="muted">No encontrada.</p>`; return; }
  mdContent.innerHTML = cardHTML(p);
}
  // === cargar CPs ===
  async function loadCps(){
    selLoc.disabled = true; selLoc.hidden = true;
    try{
      const data = await postJSON(API.cps);
      const rows = data?.items || [];
      fillSelect(selLoc, rows, it=>it.cp, it=> (it.ciudad ? `${it.ciudad} — ${it.cp}` : it.cp), '— Elegí CP/Ciudad —');
    }catch(e){
      console.error('CPs error', e);
    }
  }

  // abrir/ocultar cascada
  boton.addEventListener('click', async () => {
    box.hidden = !box.hidden;
    if (!box.hidden){
      [selLoc, selDom, selCat, selPub, selUsr].forEach(s => { s.hidden=true; s.disabled=true; s.value=''; });
      await loadCps();
    }
  });

  // Loc -> Dominios
  selLoc.addEventListener('change', async () => {
    [selDom, selCat, selPub, selUsr].forEach(s => { s.hidden=true; s.disabled=true; s.value=''; });
    const cp = selLoc.value; if (!cp) return;
    const data = await postJSON(API.dominios, {cp});
    const doms = data?.items || [];
    fillSelect(selDom, doms, d=>d.valor, d=>d.label, '— Elegí dominio —');
    mdContent.innerHTML = `<p class="hint">Elegí dominio…</p>`;
  });

  // Dominio -> Categorías
  selDom.addEventListener('change', async () => {
    [selCat, selPub, selUsr].forEach(s => { s.hidden=true; s.disabled=true; s.value=''; });
    const cp = selLoc.value, dom = selDom.value; if (!dom) return;
    const data = await postJSON(API.categorias, {cp, dom});
    const cats = (data?.items || []).map(c => ({id:c.id, nombre:c.label}));
    fillSelect(selCat, cats, c=>c.id, c=>c.nombre, '— Elegí categoría —');
    mdContent.innerHTML = `<p class="hint">Elegí categoría…</p>`;
  });

  // Categoría -> Publicaciones
  selCat.addEventListener('change', async () => {
    [selPub, selUsr].forEach(s => { s.hidden=true; s.disabled=true; s.value=''; });
    const cp = selLoc.value, dom = selDom.value, cat = selCat.value; if (!cat) return;
    const data = await postJSON(API.publicaciones, {cp, dom, cat});
    const pubs = data?.items || [];
    renderGrid(pubs);
    fillSelect(selPub, pubs, p=>p.id, p=>p.titulo, '— Opcional: una publicación —');
  });

  // Publicación -> Usuario opcional + foco
  selPub.addEventListener('change', async () => {
    selUsr.hidden = true; selUsr.disabled = true; selUsr.value='';
    const id = selPub.value; if (!id) return;
    await focusOne(id);
    // Si luego querés cargar usuarios, pegale a tu endpoint real:
    // const usrs = await postJSON('/api/...', {pubId:id});
    // fillSelect(selUsr, usrs.items || [], u=>u.id, u=>u.nombre, '— Opcional: un usuario —');
  });
});


function observeInfinite(){
  const sentinel = document.getElementById('sentinel');
  const rootEl = document.getElementById('mdContent'); // 👈 contenedor scrolleable
  const io = new IntersectionObserver((entries) => {
    if (entries.some(e => e.isIntersecting)) fetchPage();
  }, { root: rootEl, rootMargin: '600px' });           // 👈 root definido
  io.observe(sentinel);
}
