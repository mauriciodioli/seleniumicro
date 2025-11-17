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

  // --- 1) Medimos el scroll ANTES de repintar ---
  const prevScrollTop    = box.scrollTop;
  const prevScrollHeight = box.scrollHeight;
  const clientHeight     = box.clientHeight || 1;

  // ¿El usuario estaba "abajo"?
  // margen de 40px para contemplar pequeños offsets
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
    // primer estado: lo dejamos abajo igual
    box.scrollTop = box.scrollHeight;
    return;
  }

  // --- 3) Repintamos mensajes ---
  box.innerHTML = msgs.map(m => {
    const isMine = (m.role === 'client'); // “yo”

    const cls =
      isMine             ? 'msg me msg-client' :
      m.role === 'owner' ? 'msg msg-owner'     :
                           'msg msg-system';

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
    // Usuario estaba abajo → lo dejamos ver el último mensaje
    box.scrollTop = newScrollHeight;
  } else {
    // Usuario estaba leyendo arriba → preservamos posición relativa
    const delta = newScrollHeight - prevScrollHeight;
    box.scrollTop = Math.max(0, prevScrollTop + delta);
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

  // pinta optimista
  const div = document.createElement('div');
  div.className = 'msg me';
  div.textContent = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;

  try{
    const r = await fetch('/api/chat/api_chat_bp/send', {
      method: 'POST',
      headers: {
        'Content-Type':'application/json',
        'Accept':'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        conversation_id: Chat.conversationId,
        text,
        as: 'client'
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





























async function chatAmbitoHere(source){
  try{
    let s;

    if (source && source.dataset && source.dataset.scope){
      const rawScope = source.dataset.scope || '{}';
      s = typeof rawScope === 'string' ? JSON.parse(rawScope) : rawScope;
    } else if (source && typeof source === 'object'){
      s = source;
    } else {
      console.error('[CHAT] chatAmbitoHere sin scope válido', source);
      return;
    }

    const tel = (s.tel || s.telefono || window.LAST_IDENTITY_TEL || '').toString().trim();
    if (!tel){
      console.error('[CHAT] No hay teléfono en scope ni en LAST_IDENTITY_TEL, no abro chat');
      if (window.Swal){
        Swal.fire('Chat', 'Falta teléfono del cliente (tel / telefono).', 'error');
      }
      return;
    }
   
    const scope = {
      dominio:        s.dominio || s.ambito || 'tecnologia',
      locale:         s.locale  || s.idioma  || 'es',
      ambito_slug:    s.ambito,
      categoria_slug: s.categoria,
      codigo_postal:  s.cp,
    };

    if (s.ambito_id        || s.ambitoId)        scope.ambito_id        = s.ambito_id        || s.ambitoId;
    if (s.categoria_id     || s.categoriaId)     scope.categoria_id     = s.categoria_id     || s.categoriaId;
    if (s.codigo_postal_id || s.codigo_postalId) scope.codigo_postal_id = s.codigo_postal_id || s.codigo_postalId;
    if (s.publication_id   || s.pub_id || s.id_publicacion)
      scope.publication_id = s.publication_id || s.pub_id || s.id_publicacion;
    if (s.owner_user_id    || s.ownerId || s.user_id)
      scope.owner_user_id  = s.owner_user_id  || s.ownerId || s.user_id;
    
    const payload = {
      scope,
      client: {
        tel,
        alias:  s.alias || null,
        email:  s.email || null,
        user_id: s.user_id || null
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
    if (!r.ok || !data.ok){
      console.error('Error al abrir chat', data);
      if (window.Swal){
        Swal.fire('Chat', data?.error || 'No se pudo abrir el chat', 'error');
      }
      return;
    }

    Chat.scope          = payload.scope;
    Chat.conversationId = data.conversation_id;

    console.log('[CHAT] conversación abierta, id=', Chat.conversationId);

    setCtxBadge({
      ambito:       s.ambito || s.micrositio,
      categoria:    s.categoria,
      subcategoria: s.subcategoria,
      idioma:       payload.scope.locale,
      cp:           s.cp || s.codigo_postal
    });

    // armamos los mensajes a renderizar
    let msgs = data.messages || [];
    if (data.is_new && data.from_summary){
      // prepend “mensaje sistema” solo si es chat nuevo
      msgs = [{
        role: 'system',
        via: 'dpia',
        content_type: 'text',
        content: `Nuevo chat desde ${data.from_summary}`,
        created_at: new Date().toISOString()
      }, ...msgs];
    }

    // pintamos una sola vez
    renderMessages(msgs);

    // polling, persistencia y foco SIEMPRE después
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
  }
}

window.chatAmbitoHere = chatAmbitoHere;
window.chatHere       = chatAmbitoHere;




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


// ==================== SLIDE MOBILE ====================
(function(){
  const root = document.documentElement;
  const isMobile = () => matchMedia('(max-width:768px)').matches;

  document.addEventListener('click', e => {
    const name = e.target.closest('.id-summary');
    if (name && isMobile()){
      root.classList.remove('slide-chat');
      root.classList.add('slide-ambitos');
    }
  });
  
  const originalChatHere = window.chatHere || window.chatAmbitoHere;
  window.chatHere = window.chatAmbitoHere = function(btn){
    if (typeof originalChatHere === 'function') originalChatHere(btn);
    if (isMobile()){
      root.classList.remove('slide-ambitos');
      root.classList.add('slide-chat');
    }
  };

  document.addEventListener('click', e => {
    if (e.target.closest('#toggleAmbitos') && isMobile()){
      root.classList.remove('slide-chat');
      root.classList.add('slide-ambitos');
    }
  });

  window.addEventListener('resize', () => {
    if (!isMobile()){
      root.classList.remove('slide-ambitos','slide-chat');
    }
  });
})();


// ==================== FIX VH ====================
function setVh(){
  document.documentElement.style
    .setProperty('--vh', (window.innerHeight * 0.01) + 'px');
}
setVh();
addEventListener('resize', setVh);
