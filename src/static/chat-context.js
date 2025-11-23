// static/chat-context.js
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

  // ===== 1) Contexto desde la URL (tal como viene del iframe de DPIA) =====

  // Lo que describe el “scope” del chat (dominio/ámbito, categoría, CP, publicación, owner)
  const EMBED_SCOPE = {
    dominio:        get('dominio')        || 'tecnologia',
    dominio_id:     numOrNull(get('dominio_id')),
    categoria_id:   numOrNull(get('categoria_id')),
    codigo_postal:  get('cp'),
    locale:         get('lang')           || 'es',
    publicacion_id: numOrNull(get('publicacion_id')),
    owner_user_id:  numOrNull(get('owner_user_id')),
    owner_email:    get('owner_email'),
  };

  // Lo que identifica al viewer (el usuario que está usando el chat)
  const EMBED_CLIENT = {
    viewer_user_id: numOrNull(get('viewer_user_id')),
    viewer_email:   get('viewer_email'),
    viewer_tel:     get('viewer_tel'),
  };

  // ===== 2) MOCK para desarrollo local SIN datos de usuario =====
  const isLocalDev   = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  const noUserInQuery =
    !EMBED_CLIENT.viewer_user_id &&
    !EMBED_CLIENT.viewer_email &&
    !EMBED_CLIENT.viewer_tel;

  if (isLocalDev && noUserInQuery) {
    Object.assign(EMBED_SCOPE, {
      dominio:        'Salud',
      dominio_id:     4,
      categoria_id:   26,
      codigo_postal:  '4139',
      locale:         'es',
      publicacion_id: 369,
      owner_user_id:  21,
      owner_email:    'dr.carlos@example.com',
    });

    Object.assign(EMBED_CLIENT, {
      viewer_user_id: 22,
      viewer_email:   'mauriciodioli@gmail.com',
      viewer_tel:     '+393445977100',
    });

    console.warn('[CHAT-CONTEXT] Usando MOCK de desarrollo local:', {
      EMBED_SCOPE,
      EMBED_CLIENT,
    });
  } else {
    console.log('[CHAT-CONTEXT] Contexto desde query:', {
      EMBED_SCOPE,
      EMBED_CLIENT,
    });
  }

  // ===== 3) CHAT_CTX de compatibilidad (lo que ya usabas antes) =====
  const CHAT_CTX = {
    dominio:        EMBED_SCOPE.dominio,
    dominio_id:     EMBED_SCOPE.dominio_id,
    categoria_id:   EMBED_SCOPE.categoria_id,
    cp:             EMBED_SCOPE.codigo_postal,
    lang:           EMBED_SCOPE.locale,
    viewer_user_id: EMBED_CLIENT.viewer_user_id,
    viewer_email:   EMBED_CLIENT.viewer_email,
    viewer_tel:     EMBED_CLIENT.viewer_tel,
    publicacion_id: EMBED_SCOPE.publicacion_id,
    owner_user_id:  EMBED_SCOPE.owner_user_id,
    owner_email:    EMBED_SCOPE.owner_email,
  };

  // ===== 4) Exponer global para el resto de los JS =====
  window.EMBED_SCOPE  = EMBED_SCOPE;
  window.EMBED_CLIENT = EMBED_CLIENT;
  window.CHAT_CTX     = CHAT_CTX;

  // VIEWER_USER_ID unificado
  let VIEWER_USER_ID = null;
  if (EMBED_CLIENT.viewer_user_id != null) {
    VIEWER_USER_ID = String(EMBED_CLIENT.viewer_user_id);
  }
  window.VIEWER_USER_ID = VIEWER_USER_ID;

  // helper: obtener id del viewer como string (sin localStorage, sin magia rara)
  window.getViewerUserId = function () {
    return (window.VIEWER_USER_ID || '').toString();
  };
})();
