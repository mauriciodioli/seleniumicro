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

// ==================== RENDER DE MENSAJES ====================
function renderMessages(list){
  const box = document.getElementById('msgs');
  if (!box) return;

  const msgs = Array.isArray(list) ? list : [];

  // --- 0) Contexto para saber quién soy ---
  const scope    = (window.Chat && Chat.scope) || window.currentChatScope || {};
  const viewerId = (window.getViewerUserId ? window.getViewerUserId() : null);

  const ownerId  = scope.owner_user_id ?? null;
  const clientId = scope.client_user_id ?? null;

  // --- 1) Medimos el scroll ANTES de repintar ---
  const prevScrollTop    = box.scrollTop;
  const prevScrollHeight = box.scrollHeight;
  const clientHeight     = box.clientHeight || 1;

  // ¿El usuario estaba "abajo"? margen de 40px para contemplar pequeños offsets
  const wasAtBottom = (prevScrollHeight - (prevScrollTop + clientHeight)) < 40;

  // --- 2) Si no hay mensajes, mostramos el placeholder ---
  if (!msgs.length){
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

  // --- 3) Repintamos mensajes ---
  box.innerHTML = msgs.map(m => {
    // ¿es un mensaje del sistema / IA?
    if (m.role === 'system' || m.role === 'ia') {
      const textSys = (m.content || '').replace(/\n/g, '<br>');
      return `
        <div class="msg msg-system">
          <div class="msg-body">${textSys}</div>
          <div class="msg-meta">${m.created_at || ''}</div>
        </div>`;
    }

    // Mensajes humanos: decidir si son míos o del otro
    let isMine = false;

    if (viewerId != null) {
      if (m.role === 'client' && viewerId === clientId) {
        isMine = true;
      } else if (m.role === 'owner' && viewerId === ownerId) {
        isMine = true;
      }
    }

    // Clases:
    //  - "msg me msg-client"  -> burbuja mía (derecha, azul)
    //  - "msg msg-owner"      -> burbuja del otro (izquierda, verde)
    const cls = isMine ? 'msg me msg-client' : 'msg msg-owner';

    const text = (m.content || '').replace(/\n/g, '<br>');
    return `
      <div class="${cls}">
        <div class="msg-body">${text}</div>
        <div class="msg-meta">${m.created_at || ''}</div>
      </div>`;
  }).join('');

  // --- 4) Ajustamos scroll DESPUÉS del repintado ---
  const newScrollHeight = box.scrollHeight;

  if (wasAtBottom) {
    box.scrollTop = newScrollHeight;     // dejar al usuario en el último mensaje
  } else {
    const delta = newScrollHeight - prevScrollHeight;
    box.scrollTop = Math.max(0, prevScrollTop + delta); // preserva posición
  }
}

// la dejamos global como ya usás en otros lados
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
// ==================== ENVIAR MENSAJE (POST) ====================
async function sendMessage(text){
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

  // 🔹 decidir si mando como "owner" o como "client"
  const viewerId = Number(window.usuario_id || window.VIEWER_USER_ID || 0);
  const ownerId  = Chat.scope && Chat.scope.owner_user_id
    ? Number(Chat.scope.owner_user_id)
    : null;

  const role = (ownerId && viewerId === ownerId) ? 'owner' : 'client';

  try{
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
        as: role
      })
    });

    const data = await r.json();
    if (!r.ok || !data.ok){
      console.error('[CHAT] error en /send', data);
    }
  }catch(err){
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

  let side = 'msg--in'; // por defecto, entrante

  if (m.role === 'ia') {
    side = 'msg--bot';
  } else if (viewerId != null) {
    const isMine =
      (m.role === 'client' && viewerId === clientId) ||
      (m.role === 'owner'  && viewerId === ownerId);

    side = isMine ? 'msg--out' : 'msg--in';
  }

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

  const meta = m.created_at
    ? `<div class="msg-meta">${m.created_at}</div>`
    : '';

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
