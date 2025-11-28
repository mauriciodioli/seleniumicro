// ===================== HEADER DEL CHAT (ctxBadge) =====================

function setChatHeaderFromOpen(data) {
  const badge = document.getElementById('ctxBadge');
  if (!badge) return;

  // usamos la estructura <div id="ctxBadge"><span class="ctx-pill"><span class="ctx-dot"></span>...</span></div>
  const pill = badge.querySelector('.ctx-pill') || badge;

  const client = data.client || {};
  const scope  = data.scope  || {};

  // QUIÉN: la persona con la que hablo (Ola, Carlos, etc.)
  let who =
    client.alias ||
    client.email ||
    client.tel ||
    'Contacto';

  if (client.alias && !client.alias.startsWith('@')) {
    who = '@' + client.alias;
  }

  // CONTEXTO: dominio / categoría / idioma / CP
  const partes = [];

  if (who) partes.push(who);

  if (scope.dominio) {
    partes.push(scope.dominio);
  }

  if (scope.categoria_slug) {
    partes.push(scope.categoria_slug);
  } else if (scope.categoria_nombre) {
    partes.push(scope.categoria_nombre);
  } else if (scope.categoria_id) {
    partes.push('cat ' + scope.categoria_id);
  }

  if (scope.locale) {
    partes.push(scope.locale);
  }

  if (scope.codigo_postal) {
    partes.push('CP ' + scope.codigo_postal);
  }

  const label = partes.join(' · ') || 'sin contexto';

  pill.innerHTML = `<span class="ctx-dot"></span>${label}`;
}


// ==================== TOGGLE ÁMBITOS (columna del medio) ====================
(() => {
  const root = document.documentElement;
  const btn  = document.getElementById('toggleAmbitos');
  if (!btn) return;

  const isMobile = () => matchMedia('(max-width:768px)').matches;
  const setIcon = () => {
    const col = root.classList.contains('ambitos-collapsed');
    btn.textContent = isMobile()
      ? (col ? '▲' : '▼')
      : (col ? '⟶' : '⟵');
  };

  btn.addEventListener('click', () => {
    root.classList.toggle('ambitos-collapsed');
    setIcon();
  });

  addEventListener('resize', setIcon);
  setIcon();
})();


// ==================== ESTADO GLOBAL DEL CHAT ====================
const Chat = {
  scope: null,            // contexto DPIA
  conversationId: null,   // ID en "conversation"
  polling: null           // setInterval
};


// ==================== CONTEXTO / BADGE ====================
function normalizeScope(raw){
  const s = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
  return {
    ambito:        (s.ambito || s.micrositio || '').toString().trim().toLowerCase(),
    categoria:     (s.categoria || '').toString().trim().toLowerCase(),
    subcategoria:  (s.subcategoria || '').toString().trim().toLowerCase(),
    idioma:        (s.idioma || '').toString().trim().toLowerCase(),
    cp:            (s.cp || s.codigo_postal || '').toString().trim(),
    alias:         (s.alias || '').toString().trim(),
    tel:           (s.tel || s.telefono || '').toString().trim()
  };
}

function setCtxBadge(s){
  const pill = document.querySelector('#ctxBadge .ctx-pill');
  if (!pill) return;

  const label = [
    s.ambito       && `ámbito: ${s.ambito}`,
    s.categoria    && `cat: ${s.categoria}`,
    s.subcategoria && `sub: ${s.subcategoria}`,
    s.idioma       && `idioma: ${s.idioma}`,
    s.cp           && `CP: ${s.cp}`
  ].filter(Boolean).join(' · ');

  pill.innerHTML = `<span class="ctx-dot"></span>${label || 'sin contexto'}`;
}







function getViewerId() {
  // usa lo que ya tengas para el usuario logueado
  const v =
    window.usuario_id ??
    window.VIEWER_USER_ID ??
    window.viewer_user_id ??
    null;

  const num = v != null ? Number(v) : null;

  console.log('%c[CHAT][getViewerId]', 'color:#0af', {
    raw: v,
    parsed: num
  });

  return num;
}

function viewerIsOwner() {
  // La verdad viene del backend en /open
  const soyOwner = !!Chat.isServer || Chat.viewerRole === 'owner';

  // Debug mínimo
  console.log('[CHAT][viewerIsOwner]', {
    soyOwner,
    viewerRole: Chat.viewerRole,
    isServer: Chat.isServer,
    isClient: Chat.isClient
  });

  return soyOwner;
}

// ==================== RENDER DE MENSAJES ====================
function renderMessages(list){
  const box = document.getElementById('msgs');
  if (!box) {
    console.warn('[CHAT][renderMessages] sin #msgs');
    return;
  }

  const msgs = Array.isArray(list) ? list : [];

  // --- 1) Medimos scroll ANTES de repintar ---
  const prevScrollTop    = box.scrollTop;
  const prevScrollHeight = box.scrollHeight;
  const clientHeight     = box.clientHeight || 1;

  const wasAtBottom = (prevScrollHeight - (prevScrollTop + clientHeight)) < 40;

  // --- 2) Placeholder si no hay mensajes ---
  if (!msgs.length){
    console.log('[CHAT][renderMessages] sin mensajes, muestro placeholder');
    box.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:center; height:100%; opacity:.7; text-align:center; padding:20px">
        <div>
          <div style="font-size:28px; line-height:1">💬</div>
          <div style="margin-top:6px">
            Elegí un ámbito/categoría en el panel del medio y tocá <b>“Chatear”</b>.
          </div>
        </div>
      </div>`;
    box.scrollTop = box.scrollHeight;
    return;
  }

  const scope    = (window.Chat && Chat.scope) || {};
  const soyOwner = viewerIsOwner();

  console.groupCollapsed('%c[CHAT][renderMessages] estado inicial', 'color:#fb0');
  console.log('cantidad msgs:', msgs.length);
  console.log('scope:', scope);
  console.log('soyOwner:', soyOwner);
  console.groupEnd();

   // --- 3) Repintar mensajes ---
  box.innerHTML = msgs.map((m, idx) => {
    // Mensajes del sistema / IA
    if (m.role === 'system' || m.role === 'ia') {
      const textSys = (m.content || '').replace(/\n/g, '<br>');
      console.log('[CHAT][msg]', idx, 'system/ia', { role: m.role });
      return `
        <div class="msg msg-system">
          <div class="msg-body">${textSys}</div>
          <div class="msg-meta">${m.created_at || ''}</div>
        </div>`;
    }

    // Mensajes humanos: decidir si SON MÍOS o del otro
    const isMine = soyOwner ? (m.role === 'owner') : (m.role === 'client');
    const cls    = isMine ? 'msg me msg-client' : 'msg msg-owner';

    console.log('[CHAT][msg]', idx, {
      id: m.id,
      role: m.role,
      soyOwner,
      isMine,
      claseFinal: cls
    });

    const text = (m.content || '').replace(/\n/g, '<br>');

    // 🔴🔵🟢 Estado para el puntito de color
    let statusClass = 'msg-status-sent';
    let statusLabel = 'Enviado';

    if (m.read_at) {
      statusClass = 'msg-status-read';
      statusLabel = 'Leído';
    } else if (m.delivered_at) {
      statusClass = 'msg-status-delivered';
      statusLabel = 'Entregado';
    }

    // ✅ Solo mensajes salientes (mis mensajes) muestran el puntito
    const isHuman = (m.role !== 'ia' && m.role !== 'system');
    const showDot = isHuman && isMine;

    console.log('[CHAT][msg-status]', idx, {
      id: m.id,
      role: m.role,
      isMine,
      statusClass,
      showDot
    });

    return `
      <div class="${cls}">
        <div class="msg-body">${text}</div>
        <div class="msg-meta">
          ${showDot ? `<span class="msg-status-dot ${statusClass}" title="${statusLabel}"></span>` : ''}
          <span class="msg-meta-text">${m.created_at || ''}</span>
        </div>
      </div>`;
  }).join('');


  // --- 4) Ajuste de scroll DESPUÉS de repintar ---
  const newScrollHeight = box.scrollHeight;

  if (wasAtBottom) {
    box.scrollTop = newScrollHeight;
  } else {
    const delta = newScrollHeight - prevScrollHeight;
    box.scrollTop = Math.max(0, prevScrollTop + delta);
  }
}

window.renderMessages = renderMessages;




// ==================== CARGAR MENSAJES (POST) ====================
async function loadMessages(){
  if (!Chat.conversationId) {
    console.warn('[CHAT] loadMessages sin conversationId');
    return;
  }

  try{
    const r = await fetch('/api/chat/api_chat_bp/messages/', {
      method: 'POST',
      headers: {
        'Content-Type':'application/json',
        'Accept':'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ conversation_id: Chat.conversationId })
    });
    
    const data = await r.json();
    if (!r.ok || !data.ok){
      console.error('[CHAT] error en /messages', data);
      return;
    }

    renderMessages(data.messages || []);
  }catch(err){
    console.error('[CHAT] excepción en loadMessages', err);
  }
}
async function sendMessage(text) {
  if (!Chat.conversationId){
    console.warn('[CHAT] sendMessage sin conversationId');
    alert('Abrí primero un chat tocando “Chatear”.');
    return;
  }

  const box = document.getElementById('msgs');
  if (!box) return;

  const cleanText = (text || '').trim();
  if (!cleanText) return;

  // pinta optimista
  const div = document.createElement('div');
  div.className = 'msg me';
  div.textContent = cleanText;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;

  // 🔹 rol SEGÚN LO QUE DIJO EL BACKEND EN /open
  const role = Chat.viewerRole || (Chat.isServer ? 'owner' : 'client');

  console.log('[ROLE SEND]', {
    role,
    viewerRole: Chat.viewerRole,
    isServer: Chat.isServer,
    isClient: Chat.isClient
  });
debugger;
  try {
    const r = await fetch('/api/chat/api_chat_bp/send/', {
      method: 'POST',
      headers: {
        'Content-Type':'application/json',
        'Accept':'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        conversation_id: Chat.conversationId,
        text: cleanText,
        role: role
      })
    });

    const data = await r.json();
    if (!r.ok || !data.ok){
      console.error('[CHAT] error en /send', data);
      // opcional: revertir mensaje optimista
    }
  } catch (err) {
    console.error('[CHAT] excepción en sendMessage', err);
  }
}




// input de texto
const msgInput = document.getElementById('msgInput');
const btnSend  = document.getElementById('sendBtnSenMessage');

// === función que usa el botón y el módulo de media ===
function enviarTexto(){
  if (!msgInput) return;
  const text = (msgInput.value || '').trim();
  if (!text) return;

  // usa tu función existente
  sendMessage(text);

  // limpia el input
  msgInput.value = '';
}

// si querés que Enter también envíe
if (msgInput) {
  msgInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarTexto();
    }
  });
}


// si querés que el click simple del botón también envíe (ojo: en media.js ya manejamos mousedown/mouseup; si usas lo nuevo, podés omitir este listener)
if (btnSend) {
  btnSend.addEventListener('click', (e) => {
    e.preventDefault();
    enviarTexto();
  });
}


function renderMessageBubble(m) {
  const scope    = Chat.scope || window.currentChatScope || {};
  const viewerId = (window.getViewerUserId ? window.getViewerUserId() : null);

  const ownerId  = scope.owner_user_id ?? null;
  const clientId = scope.client_user_id ?? null;

  let side   = 'msg--in'; // por defecto, entrante
  let isMine = false;

  if (m.role === 'ia' || m.role === 'system') {
    side   = 'msg--bot';
    isMine = false;
  } else if (viewerId != null) {
    isMine =
      (m.role === 'client' && viewerId === clientId) ||
      (m.role === 'owner'  && viewerId === ownerId);

    side = isMine ? 'msg--out' : 'msg--in';
  }

  console.log('[CHAT][bubble-side]', {
    id: m.id,
    role: m.role,
    viewerId,
    ownerId,
    clientId,
    isMine,
    side
  });

  let innerHTML = '';

  if (m.content_type === 'text') {
    innerHTML = `<div class="msg-body">${escapeHTML(m.content || '')}</div>`;
  } else if (m.content_type === 'image') {
    innerHTML = `<div class="msg-body"><img src="${m.content}" class="msg-img" alt="imagen"></div>`;
  } else if (m.content_type === 'audio') {
    innerHTML = `
      <div class="msg-body">
        <div class="msg-audio msg-audio--unread">
          <audio controls src="${m.content}"></audio>
        </div>
      </div>
    `;
  }

  // 🔴🔵🟢 Estado de entrega/lectura (solo visual)
  let meta = '';
  if (m.created_at) {
    let statusClass = 'msg-status-sent';
    let statusLabel = 'Enviado';

    if (m.read_at) {
      statusClass = 'msg-status-read';
      statusLabel = 'Leído';
    } else if (m.delivered_at) {
      statusClass = 'msg-status-delivered';
      statusLabel = 'Entregado';
    }

    // ✅ Solo mensajes humanos salientes (msg--out) muestran el puntito
    const isHuman = (m.role !== 'ia' && m.role !== 'system');
    const showDot = isHuman && (side === 'msg--out');

    console.log('[CHAT][bubble-status]', {
      id: m.id,
      role: m.role,
      isMine,
      side,
      statusClass,
      showDot
    });

    meta = `
      <div class="msg-meta">
        ${showDot ? `<span class="msg-status-dot ${statusClass}" title="${statusLabel}"></span>` : ''}
        <span class="msg-meta-text">${m.created_at}</span>
      </div>
    `;
  }

  const div = document.createElement('div');
  div.className = `msg ${side} msg-${m.role || 'unk'}`;
  div.dataset.id = m.id;
  div.innerHTML = innerHTML + meta;

  return div;
}



window.appendMessageFromServer = function (m) {
  const container = document.getElementById('chatMessages');
  if (!container) return;
  const node = renderMessageBubble(m);
  container.appendChild(node);
  container.scrollTop = container.scrollHeight;
};



































// === Contexto cuando el chat viene embebido en un iframe ===
const urlParams = new URLSearchParams(window.location.search);

const EMBED_SCOPE = {
  dominio:        urlParams.get('dominio') || null,
  locale:         urlParams.get('lang')    || null,
  codigo_postal:  urlParams.get('cp')      || null,
  categoria_id:   urlParams.get('categoria_id')
                    ? Number(urlParams.get('categoria_id'))
                    : null,
  publicacion_id: urlParams.get('publicacion_id')
                    ? Number(urlParams.get('publicacion_id'))
                    : 0,
  owner_user_id:  urlParams.get('owner_user_id')
                    ? Number(urlParams.get('owner_user_id'))
                    : null,
};

// datos del usuario que mira el iframe (si los tenés)
const EMBED_CLIENT = {
  user_id: window.CURRENT_USER_ID    || null,
  email:   window.CURRENT_USER_EMAIL || null,
  tel:     window.CURRENT_USER_TEL   || null,
};






// ==================== COMPOSER / BOTONES ====================
document.addEventListener('DOMContentLoaded', () => {
  console.log('[CHAT] DOMContentLoaded');

  const input   = document.getElementById('msgInput');
  const sendBtn = document.getElementById('sendBtnSenMessage');

  console.log('[CHAT] refs:', { input, sendBtn });

  // restaurar último chat si existe
  try{
    const raw = localStorage.getItem('dpia.chat.last');
    if (raw){
      const saved = JSON.parse(raw);
      if (saved.conversationId){
        Chat.conversationId = saved.conversationId;
        Chat.scope          = saved.scope || null;
        console.log('[CHAT] restaurando convId desde localStorage:', Chat.conversationId);
        loadMessages();
        Chat.polling = setInterval(loadMessages, 2500);
      }
    }
  }catch(err){
    console.warn('[CHAT] error leyendo localStorage', err);
  }

  // ✅ CLICK EN BOTÓN ENVIAR
 // ✅ CLICK EN BOTÓN ENVIAR (con preventDefault)
sendBtn?.addEventListener('click', (e) => {
  e.preventDefault();      // 👈 frena el submit del <form>

  const text = (input.value || '').trim();
  if (!text) return;
  console.log('[CHAT] click sendBtnSenMessage, text=', text, 'convId=', Chat.conversationId);
  sendMessage(text);
  input.value = '';
  input.focus();
});


  // Enter en el input
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey){
      e.preventDefault();
      const text = (input.value || '').trim();
      if (!text) return;
      console.log('[CHAT] Enter en input, text=', text, 'convId=', Chat.conversationId);
      sendMessage(text);
      input.value = '';
    }
  });

  window.addEventListener('beforeunload', () => {
    if (Chat.polling) clearInterval(Chat.polling);
  });
});


// ==================== ASEGURAR ESTRUCTURA DEL BADGE ====================
(() => {
  const badge = document.getElementById('ctxBadge');
  if (badge && !badge.querySelector('.ctx-pill')){
    badge.innerHTML = '<span class="ctx-pill"><span class="ctx-dot"></span>default</span>';
  }
})();




// ==================== FIX VH ====================
function setVh(){
  document.documentElement.style
    .setProperty('--vh', (window.innerHeight * 0.01) + 'px');
}
setVh();
addEventListener('resize', setVh);
