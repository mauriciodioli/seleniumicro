// micrositio.js — versión robusta con IIFE (evita "Illegal return statement")
(function () {
  // Evita doble montaje si el script se incluye dos veces
  if (window.__micrositioMounted) return;
  window.__micrositioMounted = true;

  // Flag global para bloquear renders legacy cuando estás dentro del micrositio
  window.__MICROSITIO_MODE__ = false;

  // Endpoint
  const micrositioAPI = '/api/micrositio/detalle';

  // Helpers DOM seguros
  const getRight   = () => document.getElementById('myDomainRight');
  const getContent = () => document.getElementById('mdContent');

  // Limpieza fuerte + set de contenido (sin innerHTML +=)
  function setMdContent(html){
    const c = getContent();
    if (!c) return;
    c.replaceChildren();               // limpia nodos existentes
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    while (tmp.firstChild) c.appendChild(tmp.firstChild);
  }

  // Scroll al panel derecho (mobile-friendly)
  function scrollRightFocus(){
    getRight()?.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'nearest' });
  }

  // HTML del micrositio
  function micrositioHTML(pub, media=[]){
    const fecha   = (typeof fmtFecha === 'function') ? fmtFecha(pub.fecha_creacion) : (pub.fecha_creacion || '');
    const portada = (media.find(m=>m.type==='image') || {})?.src || pub.imagen || '';
    const gal = (media||[]).map(m => m.type === 'image'
      ? `<figure class="ms-item"><img src="${m.src}" alt="${m.title||''}"></figure>`
      : `<figure class="ms-item"><video controls src="${m.src}"></video></figure>`
    ).join('');

    return `
    <article class="ms-wrap">
      <div class="ms-head">
        <button class="btn btn-sm" data-ms-back="1">← Volver</button>
      </div>

      <section class="ms-hero">
        ${portada ? `<img class="ms-hero-img" src="${portada}" alt="${pub.titulo || ''}">` : ''}
        <div class="ms-hero-body">
          <span class="badge">${pub.ambito || '—'}</span>
          <h1 class="ms-title">${pub.titulo || '—'}</h1>
          <div class="stars">★★★★★ <span class="muted">(42)</span></div>
          <p class="muted">${fecha} · ${pub.idioma || ''} · ${pub.codigo_postal || ''}</p>
          ${pub.descripcion ? `<div class="ms-desc">${pub.descripcion}</div>` : ''}
        </div>
      </section>

      ${gal ? `
      <section class="ms-gallery">
        <h3>Galería</h3>
        <div class="ms-grid">${gal}</div>
      </section>` : ''}
    </article>`;
  }

  function init(){
    // --- Sanea duplicados de mdContent si algún include rompió IDs ---
    (function ensureUniqueMdContent(){
      const all = document.querySelectorAll('#mdContent');
      if (all.length > 1){
        all.forEach((el, i) => { if (i>0) el.id = `mdContent__dup${i}`; });
        console.warn('Había IDs mdContent duplicados; renombrados:', all.length-1);
      }
    })();

    const right = getRight();
    if (!right) { console.warn('myDomainRight no existe'); return; }

    // Delegación: click en “Ver más”
    right.addEventListener('click', async (e) => {
      const btn = e.target.closest('.ver-mas');
      if (!btn) return;
      e.preventDefault();

      if (!getContent()) return;

      const id = Number(btn.dataset.id);
      if (!id) return;

      // Entramos a modo micrositio: bloquea renders legacy
      window.__MICROSITIO_MODE__ = true;

      setMdContent(`<p class="muted">Cargando publicación…</p>`);
      try{
        const r = await fetch(micrositioAPI, {
          method:'POST',
          headers:{'Content-Type':'application/json','Accept':'application/json'},
          body: JSON.stringify({ id })
        });
        const data = await r.json();
        if (!data?.ok) throw new Error(data?.error || 'Error de API');

        setMdContent(micrositioHTML(data.pub, data.media || []));
        scrollRightFocus();
      }catch(err){
        console.error(err);
        setMdContent(`<p class="muted">No se pudo cargar la publicación.</p>`);
      }
    });

    // Delegación: botón “← Volver”
    right.addEventListener('click', async (e) => {
      const back = e.target.closest('[data-ms-back]');
      if (!back) return;
      e.preventDefault();

      if (!getContent()) return;

      // Salimos de modo micrositio: habilita renders de grilla legacy
      window.__MICROSITIO_MODE__ = false;

      if (window.lastQuery){
        setMdContent(`<p class="muted">Cargando…</p>`);
        try{
          // API.publicaciones y renderGrid deben existir en tu app
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
  }

  // Montaje cuando el DOM esté listo (soporta defer o no)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  // Helper global para que tus renderers legacy puedan chequear el modo
  window.MICROSITIO_isActive = () => !!window.__MICROSITIO_MODE__;
})();
