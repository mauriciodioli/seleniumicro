// static/js/chat-context.js
(function initChatContext() {
  const params = new URLSearchParams(window.location.search);

  const numOrNull = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const get = (k) => {
    const v = params.get(k);
    return v !== null ? v : null;
  };

  // ===== 1) Contexto real desde la URL =====
  const ctx = {
    dominio:        get('dominio')        || 'tecnologia',
    dominio_id:     numOrNull(get('dominio_id')),
    categoria_id:   numOrNull(get('categoria_id')),
    cp:             get('cp'),
    lang:           get('lang')           || 'es',
    viewer_user_id: numOrNull(get('viewer_user_id')),
    viewer_email:   get('viewer_email'),
    viewer_tel:     get('viewer_tel'),
    publication_id: numOrNull(get('publication_id')),
    owner_user_id:  numOrNull(get('owner_user_id')), // por si lo agregamos luego
  };

  // ===== 2) MOCK para desarrollo local SIN query =====
  const isLocalDev = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  const noUserInQuery = !ctx.viewer_user_id && !ctx.viewer_email && !ctx.viewer_tel;

  if (isLocalDev && noUserInQuery) {
    Object.assign(ctx, {
      dominio:        'Salud',
      dominio_id:     4,
      categoria_id:   26,
      cp:             '4139',
      lang:           'es',
      viewer_user_id: 22,
      viewer_email:   'mauriciodioli@gmail.com',
      viewer_tel:     '+393445977100',
      publication_id: 369,
      owner_user_id:  21, // si querés, o null
    });
    console.warn('[CHAT-CONTEXT] Usando MOCK de desarrollo local:', ctx);
  } else {
    console.log('[CHAT-CONTEXT] Contexto desde query:', ctx);
  }

  // ===== 3) Exponer global para el resto de los JS =====
  window.CHAT_CTX = ctx;
})();




