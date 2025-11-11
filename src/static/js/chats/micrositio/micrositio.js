// helpers locales
const micrositioAPI = '/api/micrositio/detalle';
let lastListItems = [];  // para volver a la grilla
const myDomainRight = document.getElementById('myDomainRight');
const mdContent = document.getElementById('mdContent');

function scrollRightFocus(){
  // fuerza el foco al panel derecho en mobile
  myDomainRight?.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'nearest' });
}

function micrositioHTML(pub, media=[]){
  const fecha = fmtFecha(pub.fecha_creacion);
  const portada = (media.find(m=>m.type==='image') || {}).src || pub.imagen || '';
  const gal = media.map(m => m.type==='image'
    ? `<figure class="ms-item"><img src="${m.src}" alt="${m.title||''}"></figure>`
    : `<figure class="ms-item"><video controls src="${m.src}"></video></figure>`
  ).join('');

  return `
  <article class="ms-wrap">
    <div class="ms-head">
      <button class="btn btn-sm" data-ms-back="1">← Volver</button>
    </div>

    <section class="ms-hero">
      ${portada ? `<img class="ms-hero-img" src="${portada}" alt="${pub.titulo}">` : ''}
      <div class="ms-hero-body">
        <span class="badge">${pub.ambito || '—'}</span>
        <h1 class="ms-title">${pub.titulo || '—'}</h1>
        <div class="stars">★★★★★ <span class="muted">(42)</span></div>
        <p class="muted">${fecha} · ${pub.idioma || ''} · ${pub.codigo_postal || ''}</p>
        ${pub.descripcion ? `<div class="ms-desc">${pub.descripcion}</div>` : ''}
      </div>
    </section>

    ${media.length ? `
    <section class="ms-gallery">
      <h3>Galería</h3>
      <div class="ms-grid">${gal}</div>
    </section>` : ''}

  </article>`;
}

// Delegación: click en “Ver más” dentro de la grilla
mdContent.addEventListener('click', async (e) => {
  const btn = e.target.closest('.ver-mas');
  if (!btn) return;
  e.preventDefault();

  const id = Number(btn.dataset.id);
  if (!id) return;

  // cacheo la lista actual para poder “volver”
  const cards = mdContent.querySelectorAll('.tarjeta');
  lastListItems = Array.from(cards).map(card => card.dataset.id); // por si querés re-hidratar desde ids

  mdContent.innerHTML = `<p class="muted">Cargando publicación…</p>`;
  try{
    const r = await fetch(micrositioAPI, {
      method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body: JSON.stringify({ id })
    });
    const data = await r.json();
    if (!data?.ok) throw new Error(data?.error || 'error');

    mdContent.innerHTML = micrositioHTML(data.pub, data.media || []);
    scrollRightFocus();
  }catch(err){
    console.error(err);
    mdContent.innerHTML = `<p class="muted">No se pudo cargar la publicación.</p>`;
  }
});

// Botón “Volver” del micrositio → re-render de la grilla previa
mdContent.addEventListener('click', async (e) => {
  const back = e.target.closest('[data-ms-back]');
  if (!back) return;
  e.preventDefault();

  // Estrategia simple: re-consultar con los últimos filtros (si ya tenés lastQuery)
  if (window.lastQuery){
    mdContent.innerHTML = `<p class="muted">Cargando…</p>`;
    try{
      const data = await postJSON(API.publicaciones, window.lastQuery);
      renderGrid(data?.items || []);
      // repoblá select de publicación si querés
    }catch(err){
      console.error(err);
      mdContent.innerHTML = `<p class="muted">No se pudo cargar.</p>`;
    }
  }else{
    // Si no hay filtros, simplemente limpiá
    mdContent.innerHTML = `<p class="muted">Elegí una categoría…</p>`;
  }
  scrollRightFocus();
});
