document.addEventListener('DOMContentLoaded', () => {
  const q = document.getElementById('amb-q');
  const btn = document.getElementById('amb-btnSearch');
  const panel = document.getElementById('ambQueryPanel');

  if (!panel) return;

  const open  = () => panel.classList.add('is-open');
  const close = () => panel.classList.remove('is-open');

  // Cerrar por defecto al cargar
  close();

  // Abrir sólo si hay texto o resultados (ajusta esta condición a tu lógica)
  btn?.addEventListener('click', () => {
    const hasQuery = (q?.value || '').trim().length > 0;
    hasQuery ? open() : close();
  });

  // Enter en el input
  q?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const hasQuery = (q.value || '').trim().length > 0;
      hasQuery ? open() : close();
    }
  });

  // Si se borra la query, cerramos
  q?.addEventListener('input', () => {
    if ((q.value || '').trim().length === 0) close();
  });

  // Escape también cierra
  q?.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
});


// === Navegación por tabs User/Domain en móvil ===
(() => {
  const isMobile = () => matchMedia('(max-width:768px)').matches;

  // Devuelve el contenedor de los 3 paneles (acepta .app-grid o .layout-chat)
  const getGrid = () => document.querySelector('.app-grid') || document.querySelector('.layout-chat');

  // Mueve el carrusel por scroll-x (cuando usás el modo "scroll-snap" horizontal)
  function scrollToPanel(panelClass){
    const grid = getGrid();
    if (!grid) return;
    const panels = Array.from(grid.querySelectorAll('.col-identidades, .col-ambitos, .col-chat'));
    const idx = panels.findIndex(p => p.classList.contains(panelClass.replace('.', '')));
    if (idx < 0) return;
    grid.scrollTo({ left: idx * grid.clientWidth, behavior: 'smooth' });
  }

  // Alternativa: usa clases slide-* si estás en ese modo
  function setSlideClass(target){
    
    const root = document.documentElement;
    if (target === 'col-identidades'){
      root.classList.remove('slide-ambitos','slide-chat');
    } else if (target === 'amb-card'){     // tu “Ámbitos”
      root.classList.add('slide-ambitos');
      root.classList.remove('slide-chat');
    } else if (target === 'col-chat'){     // chat
      root.classList.add('slide-chat');
      root.classList.remove('slide-ambitos');
    }
  }

  // Listener único para tabs User/Domain
  document.addEventListener('click', (e) => {
    const tab = e.target.closest('.search-tabs .tab');
    if (!tab) return;

    // marcar activa la tab
    const wrapper = tab.closest('.search-tabs');
    wrapper?.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));

    const goto = tab.dataset.goto; // "col-identidades" | "amb-card" | "col-chat" (según tu HTML)
    if (!goto || !isMobile()) return;

    // 1) carrusel por scroll-x
    if (goto === 'col-identidades') scrollToPanel('col-identidades');
    else if (goto === 'amb-card')   scrollToPanel('col-ambitos');   // tu “Domain/Ámbitos”
    else if (goto === 'col-chat')   scrollToPanel('col-chat');

    // 2) soporte simultáneo para layout con clases slide-*
    setSlideClass(goto);
  });
})();


// ==================== FALLOBACK BOTÓN DE ÁMBITO ====================
document.addEventListener('click', (ev) => {
  const btn = ev.target.closest('.chat-ambito-btn');
  if (!btn) return;

  const name = (btn.textContent || '').trim();
  console.log('[FALLBACK] click en .chat-ambito-btn, name:', name);
  console.log('[FALLBACK] dataset.scope:', btn.dataset.scope);

  // ⬅️ LLAMAMOS DIRECTO AL CORE, NO A window.chatAmbitoHere
  chatAmbitoHere(btn);

  // (opcional) si querés mover a vista chat en mobile:
  if (name && typeof isMobile === 'function' && isMobile()) {
    if (typeof setMobileView === 'function') {
      setMobileView('chat');
    }
  }
});

// ==================== SLIDE MOBILE ====================
(function(){
  const root = document.documentElement;
  console.log('[SLIDE MOBILE] init');

  // Al tocar una identidad -> slide a ámbitos
  document.addEventListener('click', e => {
    const summary = e.target.closest('.id-summary');
    if (!summary) return;

    if (typeof isMobile === 'function' && isMobile()){
      root.classList.remove('slide-chat');
      root.classList.add('slide-ambitos');
    }
  });

  // Guardamos SOLO chatHere anterior
  const originalChatHere = window.chatHere;
  console.log('[SLIDE MOBILE] originalChatHere:', originalChatHere);

  window.chatHere = function(btn){
    console.log('[SLIDE MOBILE] wrapper chatHere, btn:', btn);

    if (typeof originalChatHere === 'function') {
      try {
        originalChatHere(btn);
      } catch (e) {
        console.error('Error en originalChatHere:', e);
      }
    }

    if (typeof isMobile === 'function' && isMobile()){
      root.classList.remove('slide-ambitos');
      root.classList.add('slide-chat');
    }
  };

  // Botón para volver a ámbitos
  document.addEventListener('click', e => {
    if (e.target.closest('#toggleAmbitos') &&
        typeof isMobile === 'function' && isMobile()){
      root.classList.remove('slide-chat');
      root.classList.add('slide-ambitos');
    }
  });

  window.addEventListener('resize', () => {
    if (typeof isMobile === 'function' && !isMobile()){
      root.classList.remove('slide-ambitos','slide-chat');
    }
  });
})();


// ==================== LÓGICA REAL DEL CHAT ====================
async function chatAmbitoHere(source) {
  console.group('[chatAmbitoHere] START');
  console.log('source recibido:', source);

  try {
    let s;

    // 1) Resolver "s" (scope/origen)
    if (source && source.dataset && source.dataset.scope) {
      const rawScope = source.dataset.scope || '{}';
      console.log('[chatAmbitoHere] rawScope:', rawScope);
      s = typeof rawScope === 'string' ? JSON.parse(rawScope) : rawScope;
      console.log('[chatAmbitoHere] s parseado desde dataset.scope:', s);
    } else if (source && typeof source === 'object') {
      console.log('[chatAmbitoHere] source es objeto directo:', source);
      s = source;
    } else {
      console.log('[chatAmbitoHere] usando EMBED_SCOPE + EMBED_CLIENT');
      const esc  = window.EMBED_SCOPE  || {};
      const ecli = window.EMBED_CLIENT || {};
      s = { ...esc, ...ecli };
      console.log('[chatAmbitoHere] s combinado:', s);
    }

    const EMBED_SCOPE_SAFE  = window.EMBED_SCOPE  || {};
    const EMBED_CLIENT_SAFE = window.EMBED_CLIENT || {};

    // 2) Viewer logueado (ID)
    const viewerId = Number(
      (window.usuario_id) ||
      (EMBED_CLIENT_SAFE && EMBED_CLIENT_SAFE.viewer_user_id) ||
      (window.VIEWER_USER_ID) ||
      0
    );

    console.log('[chatAmbitoHere] viewerId resuelto:', {
      usuario_id      : window.usuario_id,
      EMBED_CLIENT    : EMBED_CLIENT_SAFE,
      VIEWER_USER_ID  : window.VIEWER_USER_ID,
      viewerId_final  : viewerId
    });

    // 3) Teléfono del viewer (cliente que escribe)
    const tel = (
      s.tel ||
      s.telefono ||
      EMBED_CLIENT_SAFE.viewer_tel ||
      window.LAST_IDENTITY_TEL ||
      ''
    ).toString().trim();

    console.log('[chatAmbitoHere] tel resuelto:', tel);

    if (!viewerId) {
      console.error('[CHAT] No hay viewerId (usuario logueado)');
      console.groupEnd();
      return;
    }

    if (!tel) {
      console.error('[CHAT] No hay teléfono en scope, EMBED_CLIENT ni LAST_IDENTITY_TEL');
      if (window.Swal) {
        Swal.fire('Chat', 'Falta teléfono del cliente (tel / telefono).', 'error');
      }
      console.groupEnd();
      return;
    }

    // 4) targetId = usuario del botón (dueño del ámbito) si viene en el dataset
    const targetId = Number(
      s.user_id ||
      (source && source.dataset && (source.dataset.userId || source.dataset.userid)) ||
      0
    );
    console.log('[chatAmbitoHere] targetId (botón/user_id):', targetId);

    // 5) Intentar sacar owner desde localStorage: dpia.identityCache.v1
    let ownerFromIdentityCache = null;
    try {
      const cacheStr = localStorage.getItem('dpia.identityCache.v1');
      if (cacheStr) {
        const cache = JSON.parse(cacheStr);
        const entry = cache[tel]; // clave = teléfono
        if (entry) {
          console.log('[IDENTITYCACHE] entry para tel:', tel, entry);
          ownerFromIdentityCache = entry.usuario_id || entry.user_id || null;
        } else {
          console.log('[IDENTITYCACHE] sin entrada para tel:', tel);
        }
      } else {
        console.log('[IDENTITYCACHE] no existe dpia.identityCache.v1 en localStorage');
      }
    } catch (e) {
      console.warn('[IDENTITYCACHE] error al leer/parsing dpia.identityCache.v1', e);
    }

    // 6) Resolver owner_user_id con prioridad:
    //  1) scope s (owner_user_id / ownerId / user_id del botón)
    //  2) EMBED_SCOPE.owner_user_id
    //  3) identityCache[tel].usuario_id
    let ownerUserId = null;

    if (s.owner_user_id || s.ownerId || s.user_id) {
      ownerUserId = s.owner_user_id || s.ownerId || s.user_id;
    } else if (EMBED_SCOPE_SAFE.owner_user_id) {
      ownerUserId = EMBED_SCOPE_SAFE.owner_user_id;
    } else if (ownerFromIdentityCache) {
      ownerUserId = ownerFromIdentityCache;
    }

    console.log('[chatAmbitoHere] fuentes owner_user_id:', {
      s_owner_user_id : s.owner_user_id,
      s_ownerId       : s.ownerId,
      s_user_id       : s.user_id,
      EMBED_SCOPE_SAFE,
      ownerFromIdentityCache,
      ownerUserId_final: ownerUserId
    });

    if (!ownerUserId) {
      console.warn('[CHAT] owner_user_id no resuelto (ni scope, ni EMBED_SCOPE, ni identityCache)');
    }

    // 7) Armar scope final
    const scope = {
      dominio:        s.dominio || s.ambito || EMBED_SCOPE_SAFE.dominio || 'tecnologia',
      locale:         s.locale  || s.idioma || EMBED_SCOPE_SAFE.locale  || 'es',
      ambito_slug:    s.ambito,
      categoria_slug: s.categoria,
      codigo_postal:  s.cp || EMBED_SCOPE_SAFE.codigo_postal,
    };

    if (s.ambito_id || s.ambitoId)
      scope.ambito_id = s.ambito_id || s.ambitoId;

    if (s.categoria_id || s.categoriaId)
      scope.categoria_id = s.categoria_id || s.categoriaId;

    if (!scope.categoria_id && s.categoria && !isNaN(parseInt(s.categoria, 10))) {
      scope.categoria_id = parseInt(s.categoria, 10);
    }

    if (!scope.categoria_id && EMBED_SCOPE_SAFE.categoria_id) {
      scope.categoria_id = EMBED_SCOPE_SAFE.categoria_id;
    }

    if (s.codigo_postal_id || s.codigo_postalId)
      scope.codigo_postal_id = s.codigo_postal_id || s.codigo_postalId;

    if (!scope.codigo_postal_id && EMBED_SCOPE_SAFE.codigo_postal)
      scope.codigo_postal_id = EMBED_SCOPE_SAFE.codigo_postal;

    if (s.publicacion_id || s.pub_id || s.id_publicacion)
      scope.publicacion_id = s.publicacion_id || s.pub_id || s.id_publicacion;
    else if (EMBED_SCOPE_SAFE.publicacion_id)
      scope.publicacion_id = EMBED_SCOPE_SAFE.publicacion_id;

    if (ownerUserId) {
      scope.owner_user_id = Number(ownerUserId);
    }

    console.log('[chatAmbitoHere] scope FINAL (antes de /open):', scope);

    // 8) PUNTO DE CONTROL ANTES DE OPEN: viewer vs botón / owner
    console.log('[CHECKPOINT-OPEN]', {
      viewer_user_id : viewerId,            // logueado
      owner_user_id  : scope.owner_user_id, // dueño ámbito / identity
      targetId_raw   : targetId,            // lo que vino en s.user_id / data-user-id
      tel,
    });

    // 9) Payload final para /open
    const payload = {
      scope,
      client: {
        tel,
        alias: s.alias || EMBED_CLIENT_SAFE.alias || null,
        email: s.email || EMBED_CLIENT_SAFE.viewer_email || null,
        user_id: viewerId,
      }
    };

    console.log('[CHAT] payload /api_chat_bp/open:', payload);

    const r = await fetch('/api/chat/api_chat_bp/open/', {
      method: 'POST',
      headers: {
        'Content-Type':'application/json',
        'Accept':'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

const data = await r.json();

if (!r.ok || !data.ok) {
  console.error('Error al abrir chat', data);
  if (window.Swal) {
    Swal.fire('Chat', data?.error || 'No se pudo abrir el chat', 'error');
  }
  return;
}

// ======================
//  MERGE DE SCOPES
// ======================
const scopeFromFront = payload.scope || {};
const scopeFromBack  = data.scope   || {};

// 👉 Ahora la verdad viene del backend: owner_user_id / client_user_id
const ownerFromBack  = Number(scopeFromBack.owner_user_id  ?? 0) || null;
const clientFromBack = Number(scopeFromBack.client_user_id ?? 0) || null;

const mergedScope = {
  // el front puede aportar cosas "soft"
  ...scopeFromFront,
  // pero los IDs duros los manda el backend
  ...scopeFromBack,
  viewer_user_id: viewerId,
  owner_user_id: ownerFromBack,
  client_user_id: clientFromBack,
};

// ======================
//  GUARDAR EN ESTADO
// ======================
Chat.scope          = mergedScope;
Chat.conversationId = data.conversation_id;
Chat.isClient       = !!data.is_client;
Chat.isServer       = !!data.is_server;
Chat.viewerRole     = data.viewer_role;
// 🔍 ÚNICO DEBUG IMPORTANTE
console.log('[CHAT OPEN] convId=%s viewerId=%s owner=%s client=%s role=%s isClient=%s isServer=%s',
  Chat.conversationId,
  viewerId,
  mergedScope.owner_user_id,
  mergedScope.client_user_id,
  Chat.viewerRole,
  Chat.isClient,
  Chat.isServer
);
// opcional, por si querés usarlo sin el objeto Chat
window.currentChatScope = Chat.scope;

// header del chat
setChatHeaderFromOpen(data);

// mensajes iniciales
let msgs = data.messages || [];

if (data.is_new && data.from_summary) {
  const nowIso = new Date().toISOString();

  msgs = [
    {
      id:           `system-${nowIso}`, // algo único para el frontend
      role:         'system',
      via:          'dpia',
      content_type: 'text',
      content:      `Nuevo chat desde ${data.from_summary}`,
      created_at:   nowIso,
      delivered_at: nowIso,   // ya está “entregado” al abrir
      read_at:      null,     // nadie lo “leyó” explícitamente
    },
    ...msgs,
  ];
}

renderMessages(msgs);



    if (Chat.polling) clearInterval(Chat.polling);
    Chat.polling = setInterval(loadMessages, 2500);

    localStorage.setItem('dpia.chat.last', JSON.stringify({
      conversationId: Chat.conversationId,
      scope: Chat.scope
    }));

    document.getElementById('msgInput')?.focus();

  } catch (e) {
    console.error('Scope inválido / error en chatAmbitoHere', e);
    if (window.Swal) {
      Swal.fire('Chat', 'Error inesperado en el cliente.', 'error');
    }
  } finally {
    console.groupEnd();
  }
}

