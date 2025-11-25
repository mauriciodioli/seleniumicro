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

async function chatAmbitoHere(source){
  console.group('[chatAmbitoHere] START');
  console.log('source recibido:', source);

  try{
    let s;

    if (source && source.dataset && source.dataset.scope){
      const rawScope = source.dataset.scope || '{}';
      console.log('[chatAmbitoHere] rawScope:', rawScope);
      s = typeof rawScope === 'string' ? JSON.parse(rawScope) : rawScope;
      console.log('[chatAmbitoHere] s parseado desde dataset.scope:', s);
    } else if (source && typeof source === 'object'){
      console.log('[chatAmbitoHere] source es objeto directo:', source);
      s = source;
    } else {
      console.log('[chatAmbitoHere] usando EMBED_SCOPE + EMBED_CLIENT');
      const esc   = window.EMBED_SCOPE  || {};
      const ecli  = window.EMBED_CLIENT || {};
      s = { ...esc, ...ecli };
      console.log('[chatAmbitoHere] s combinado:', s);
    }

    // ================== QUIÉN ES QUIÉN ==================
    const viewerId = Number(
      (window.usuario_id) ||
      (window.EMBED_CLIENT && window.EMBED_CLIENT.viewer_user_id) ||
      (window.VIEWER_USER_ID) ||
      0
    );

    const EMBED_CLIENT_SAFE = window.EMBED_CLIENT || {};

    // teléfono del que está logueado
    const viewerTel = (
      (window.numTelefono && window.numTelefono[viewerId]) ||
      EMBED_CLIENT_SAFE.viewer_tel ||
      ''
    ).toString().trim();

    if (!viewerId) {
      console.error('[CHAT] No hay viewerId (usuario logueado)');
      console.groupEnd();
      return;
    }

    if (!viewerTel){
      console.warn('[CHAT] viewerTel vacío, sigo pero /open pedirá tel');
    }

    // target = usuario del botón (dueño del ámbito)
    const targetId = Number(
      s.user_id ||
      (source && source.dataset && source.dataset.userId) ||
      0
    );

    if (!targetId) {
      console.error('[CHAT] No hay targetId (user_id en dataset.scope / data-user-id)');
      console.groupEnd();
      return;
    }

    console.log('[chatAmbitoHere] viewerId:', viewerId, 'targetId:', targetId);

    const EMBED_SCOPE_SAFE = window.EMBED_SCOPE || {};

    // ================== SCOPE (contexto) ==================
    const scope = {
      dominio:        s.dominio || s.ambito || EMBED_SCOPE_SAFE.dominio || 'tecnologia',
      locale:         s.locale  || s.idioma  || EMBED_SCOPE_SAFE.locale  || 'es',
      ambito_slug:    s.ambito,
      categoria_slug: s.categoria,
      codigo_postal:  s.cp || EMBED_SCOPE_SAFE.codigo_postal,
    };

    if (s.ambito_id        || s.ambitoId)
      scope.ambito_id = s.ambito_id || s.ambitoId;

    if (s.categoria_id     || s.categoriaId){
      scope.categoria_id = s.categoria_id || s.categoriaId;
    }
    if (!scope.categoria_id && s.categoria && !isNaN(parseInt(s.categoria, 10))) {
      scope.categoria_id = parseInt(s.categoria, 10);
    }
    if (!scope.categoria_id && EMBED_SCOPE_SAFE.categoria_id){
      scope.categoria_id = EMBED_SCOPE_SAFE.categoria_id;
    }

    if (s.codigo_postal_id || s.codigo_postalId)
      scope.codigo_postal_id = s.codigo_postal_id || s.codigo_postalId;
    if (!scope.codigo_postal_id && EMBED_SCOPE_SAFE.codigo_postal)
      scope.codigo_postal_id = EMBED_SCOPE_SAFE.codigo_postal;

    if (s.publicacion_id   || s.pub_id || s.id_publicacion)
      scope.publicacion_id = s.publicacion_id || s.pub_id || s.id_publicacion;
    else if (EMBED_SCOPE_SAFE.publicacion_id)
      scope.publicacion_id = EMBED_SCOPE_SAFE.publicacion_id;

    // dueño del ámbito = target
    scope.owner_user_id = targetId;

    console.log('[chatAmbitoHere] scope FINAL:', scope);

    // ================== CLIENT (EL QUE HABLA = VIEWER) ==================
    const payload = {
      scope,
      client: {
        tel:     viewerTel,
        // si algún día querés alias/email del viewer en el embed, agrégalo también en chat-context.js
        alias:   EMBED_CLIENT_SAFE.alias || null,
        email:   EMBED_CLIENT_SAFE.viewer_email || null,
        user_id: viewerId,
      }
    };

    console.log('[CHAT] payload /api_chat_bp/open:', payload);

    // ... resto de tu lógica / fetch a /api_chat_bp/open ...


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
    console.log('[chatAmbitoHere] respuesta /open:', data);

    if (!r.ok || !data.ok){
      console.error('Error al abrir chat', data);
      if (window.Swal){
        Swal.fire('Chat', data?.error || 'No se pudo abrir el chat', 'error');
      }
      console.groupEnd();
      return;
    }

    Chat.scope          = payload.scope;
    Chat.conversationId = data.conversation_id;

    console.log('[CHAT] conversación abierta, id =', Chat.conversationId);

    setChatHeaderFromOpen(data);

    let msgs = data.messages || [];
    if (data.is_new && data.from_summary){
      msgs = [{
        role: 'system',
        via: 'dpia',
        content_type: 'text',
        content: `Nuevo chat desde ${data.from_summary}`,
        created_at: new Date().toISOString()
      }, ...msgs];
    }

    renderMessages(msgs);

    if (Chat.polling) clearInterval(Chat.polling);
    Chat.polling = setInterval(loadMessages, 2500);

    localStorage.setItem('dpia.chat.last', JSON.stringify({
      conversationId: Chat.conversationId,
      scope: Chat.scope
    }));

    document.getElementById('msgInput')?.focus();

  }catch(e){
    console.error('Scope inválido / error en chatAmbitoHere', e);
    if (window.Swal){
      Swal.fire('Chat', 'Error inesperado en el cliente.', 'error');
    }
  } finally {
    console.groupEnd();
  }
}
