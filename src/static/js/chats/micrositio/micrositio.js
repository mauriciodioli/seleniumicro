// micrositio.js — portada grande + grilla (compatible cover+gallery o media[])
(function () {
  if (window.__micrositioMounted) return;
  window.__micrositioMounted = true;
  window.__MICROSITIO_MODE__ = false;

  const micrositioAPI = '/api/micrositio/detalle';
  const getRight   = () => document.getElementById('myDomainRight');
  const getContent = () => document.getElementById('mdContent');

  // Combina respuestas {media[]} o {cover, gallery[]}
  function extractMedia(data){
    if (Array.isArray(data?.media)) return data.media;
    const cover = data?.cover ? [data.cover] : [];
    const gallery = Array.isArray(data?.gallery) ? data.gallery : [];
    return [...cover, ...gallery];
  }

  function setMdContent(html){
    const c = getContent();
    if (!c) return;
    c.replaceChildren();
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    while (tmp.firstChild) c.appendChild(tmp.firstChild);
  }

  function scrollRightFocus(){
    getRight()?.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'nearest' });
  }

  // visor principal (img o video)
  function renderViewer(item){
    if (!item) return `<div class="ms-viewer ms-empty"><div class="muted">Sin media</div></div>`;
    if (item.type === 'video'){
      return `<div class="ms-viewer" data-type="video">
                <video controls playsinline src="${item.src}" class="ms-view"></video>
              </div>`;
    }
    return `<div class="ms-viewer" data-type="image">
              <img src="${item.src}" alt="${item.title||''}" class="ms-view" />
            </div>`;
  }

  // HTML del micrositio (portada = media[0], thumbs = todo el array para que se vea completo)
  function micrositioHTML(pub, mediaInput){
    const media = Array.isArray(mediaInput) ? mediaInput.slice() : [];
    const fecha = (typeof fmtFecha === 'function') ? fmtFecha(pub.fecha_creacion) : (pub.fecha_creacion || '');

    const cover = media[0] || (pub.imagen ? { type:'image', src: pub.imagen, title: pub.titulo } : null);

    const thumbsHTML = media.map((m, idx) => {
      const isVideo = m.type === 'video';
      const active = (idx === 0) ? ' is-active' : '';
      return `<button class="ms-thumb${active}${isVideo?' is-video':''}" data-ms-thumb="${idx}" aria-label="media ${idx}">
                ${isVideo
                  ? `<div class="ms-thumb-video"><span class="ms-play">▶</span></div>`
                  : `<img loading="lazy" src="${m.src}" alt="${m.title||''}">`
                }
              </button>`;
    }).join('');

    return `
    <article class="ms-wrap">
      <div class="ms-head">
        <button class="btn btn-sm" data-ms-back="1">← Volver</button>
      </div>

      <section class="ms-hero">
        <div class="ms-hero-left">${renderViewer(cover)}</div>
        <div class="ms-hero-body">
          <span class="badge">${pub.ambito || '—'}</span>
          <h1 class="ms-title">${pub.titulo || '—'}</h1>
          <div class="stars">★★★★★ <span class="muted">(42)</span></div>
          <p class="muted">${fecha} · ${pub.idioma || ''} · ${pub.codigo_postal || ''}</p>
          ${pub.descripcion ? `<div class="ms-desc">${pub.descripcion}</div>` : ''}
        </div>
      </section>

      <section class="ms-gallery">
        <h3>Galería <small class="muted">(items: ${media.length})</small></h3>
        <div class="ms-grid" id="msGrid">
          ${thumbsHTML || `<div class="muted">No hay miniaturas para mostrar.</div>`}
        </div>
      </section>
    </article>`;
  }
// justo arriba de init()
// Bloquea que el router global “secuestré” anclas dentro del micrositio,
// pero NO corta la propagación de nuestros propios handlers.
function shieldMicrositioClicks(){
  const right = getRight();
  if (!right) return;

  // Captura: corre antes que listeners en bubbling
  right.addEventListener('click', (e) => {
    const wrap = e.target.closest('.ms-wrap');
    if (!wrap) return; // fuera del micrositio, no tocamos nada

    const a = e.target.closest('a[href]');
    if (!a) return;

    const href = a.getAttribute('href') || '';
    const isControl = a.classList.contains('ver-mas') || a.matches('[data-ms-back]');
    const isExternal = /^https?:\/\//i.test(href) || a.hasAttribute('target');

    // Si es un enlace “interno” (hash, vacío, o relativo) y NO es un control nuestro,
    // prevenimos la navegación para que no se vaya a otra vista.
    if (!isExternal && !isControl) {
      e.preventDefault();
      // IMPORTANTE: no cortamos propagación aquí, para no romper nuestros handlers.
      // Si tu router global sigue capturando, recién ahí podríamos considerar e.stopPropagation(),
      // pero habría que duplicar la lógica de nuestros clicks.
    }
  }, true);
}


  function init(){
    // Sanea duplicados de mdContent si algún include rompió IDs
    (function ensureUniqueMdContent(){
      const all = document.querySelectorAll('#mdContent');
      if (all.length > 1){
        all.forEach((el, i) => { if (i>0) el.id = `mdContent__dup${i}`; });
        console.warn('Había IDs mdContent duplicados; renombrados:', all.length-1);
      }
    })();

    const right = getRight();
    if (!right) { console.warn('myDomainRight no existe'); return; }

    // “Ver más” → carga micrositio
    right.addEventListener('click', async (e) => {
      const btn = e.target.closest('.ver-mas');
      if (!btn) return;
      e.preventDefault();

      if (!getContent()) return;
      const id = Number(btn.dataset.id);
      if (!id) return;

      window.__MICROSITIO_MODE__ = true;
      setMdContent(`<p class="muted">Cargando publicación…</p>`);
      try{
        const r = await fetch(micrositioAPI, {
          method:'POST',
          headers:{'Content-Type':'application/json','Accept':'application/json'},
          body: JSON.stringify({ id, media_limit: 32 }) // opcional: subí el límite
        });
        const data = await r.json();
        if (!data?.ok) throw new Error(data?.error || 'Error de API');

        const mediaArr = extractMedia(data);
        // Debug opcional:
        // console.log('[micrositio] pub:', data?.pub?.id, 'mediaLen:', mediaArr.length, data);

        setMdContent(micrositioHTML(data.pub, mediaArr));
     
        // guardar para thumbs
        const c = getContent();
        c.__msMedia = mediaArr;

        scrollRightFocus();
      }catch(err){
        console.error(err);
        setMdContent(`<p class="muted">No se pudo cargar la publicación.</p>`);
      }
    });

    // “← Volver”
  right.addEventListener('click', async (e) => {
  const back = e.target.closest('#btnMdBack, [data-ms-back]');
  if (!back) return;
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  window.__MICROSITIO_MODE__ = false;

  // Limpia cualquier hash que haya quedado (defensivo)
  if (location.hash) {
    history.replaceState(history.state, '', location.pathname + location.search);
  }

  // Re-render local sin tocar el history del browser
  if (window.lastQuery){
    setMdContent(`<p class="muted">Cargando…</p>`);
    try{
      const data = await postJSON(API.publicaciones, window.lastQuery);
      renderGrid(data?.items || []);
    }catch(err){
      console.error(err);
      setMdContent(`<p class="muted">No se pudo cargar.</p>`);
    }
  }else{
    setMdContent(`<p class="muted">Elegí un ámbito/categoría de la izquierda.</p>`);
  }
  scrollRightFocus();
});



    // Click en miniatura → reemplaza visor principal
    right.addEventListener('click', (e) => {
      const thumb = e.target.closest('[data-ms-thumb]');
      if (!thumb) return;

      const c = getContent();
      const media = c?.__msMedia || [];
      const idx = parseInt(thumb.getAttribute('data-ms-thumb'), 10);
      const item = media[idx];
      if (!item) return;

      const heroLeft = c.querySelector('.ms-hero-left');
      if (!heroLeft) return;

      heroLeft.innerHTML = renderViewer(item);

      c.querySelectorAll('.ms-thumb.is-active').forEach(t => t.classList.remove('is-active'));
      thumb.classList.add('is-active');
    });
     shieldMicrositioClicks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.MICROSITIO_isActive = () => !!window.__MICROSITIO_MODE__;
})();
