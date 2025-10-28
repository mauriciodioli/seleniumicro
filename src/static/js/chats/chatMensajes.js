(() => {
  const root = document.documentElement;
  const btn  = document.getElementById('toggleAmbitos');
  const isMobile = () => matchMedia('(max-width:768px)').matches;
  const setIcon = () => {
    const col = root.classList.contains('ambitos-collapsed');
    btn.textContent = isMobile() ? (col ? '▲' : '▼') : (col ? '⟶' : '⟵');
  };
  btn.addEventListener('click', () => { root.classList.toggle('ambitos-collapsed'); setIcon(); });
  addEventListener('resize', setIcon);
  setIcon();
})();






// ===== Estado global simple =====
  const Chat = {
    scope: null,     // {ambito, categoria, subcategoria, idioma, cp, alias, tel}
    roomId: null,    // string estable derivado del scope
    polling: null    // setInterval id
  };

  // Normaliza y ordena el scope
  function normalizeScope(raw){
    const s = typeof raw === 'string' ? JSON.parse(raw) : (raw||{});
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

  // Genera un roomId determinista por contexto (sin PII)
  function scopeToRoomId(s){
    const parts = [
      s.ambito || '_',
      s.categoria || '_',
      s.subcategoria || '_',
      s.idioma || '_',
      s.cp || '_'
    ];
    return parts.join('|'); // ej: "salud|medicos|turnos_online|es|28080"
  }

  // Pintar encabezado contextual
  function setCtxBadge(s){
    const pill = document.querySelector('#ctxBadge .ctx-pill');
    if(!pill) return; // guard
    const label = [
      s.ambito && `ámbito: ${s.ambito}`,
      s.categoria && `cat: ${s.categoria}`,
      s.subcategoria && `sub: ${s.subcategoria}`,
      s.idioma && `idioma: ${s.idioma}`,
      s.cp && `CP: ${s.cp}`
    ].filter(Boolean).join(' · ');
    pill.innerHTML = `<span class="ctx-dot"></span>${label || 'sin contexto'}`;
  }

  // Render de mensajes
  function renderMessages(items){
    const box = document.getElementById('messages');
    if(!box) return;
    box.innerHTML = '';
    if(!items || !items.length){
      // hint vacío
      const hint = document.createElement('div');
      hint.className = 'msg-hint';
      hint.innerHTML = `<div>💬</div><div>No hay mensajes aún. Escribí el primero.</div>`;
      box.appendChild(hint);
      return;
    }
    for(const m of items){
      const div = document.createElement('div');
      div.className = 'msg ' + (m.author==='me' ? 'me' : 'other');
      div.textContent = m.text;
      box.appendChild(div);
    }
    box.scrollTop = box.scrollHeight;
  }

  // Cargar mensajes (fetch simple)
  async function loadMessages(){
    if(!Chat.roomId) return;
    try{
      const qs = new URLSearchParams({ room_id: Chat.roomId });
      const r = await fetch(`/api/chat/messages?${qs.toString()}`, { credentials:'same-origin' });
      if(!r.ok) return;
      const data = await r.json();
      renderMessages(data.messages || []);
    }catch(_){}
  }

  // Enviar mensaje
  async function sendMessage(text){
    if(!Chat.roomId) return;
    const box = document.getElementById('messages');
    // pinta optimista
    const div = document.createElement('div');
    div.className = 'msg me';
    div.textContent = text;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;

    try{
      await fetch(`/api/chat/send`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        credentials:'same-origin',
        body:JSON.stringify({ room_id: Chat.roomId, text, scope: Chat.scope })
      });
    }catch(_){
      // silencioso: el próximo load corrige si falló
    }
  }

  // Handler principal: llamado por los botones "Chatear" externos
  // ejemplo: <button onclick="chatAmbitoHere(this)" data-scope='{"micrositio":"salud","idioma":"es","cp":"06049"}'>Chatear</button>
  function chatAmbitoHere(btn){
    try{
      const scope = normalizeScope(btn.dataset.scope || '{}');
      Chat.scope = scope;
      Chat.roomId = scopeToRoomId(scope);
      setCtxBadge(scope);
      loadMessages();
      if(Chat.polling) clearInterval(Chat.polling);
      Chat.polling = setInterval(loadMessages, 2500);
      document.getElementById('msgInput')?.focus();
    }catch(e){
      console.error('Scope inválido', e);
    }
  }
  window.chatAmbitoHere = chatAmbitoHere; // expone a global

  // Composer
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('composer');
    const input = document.getElementById('msgInput');
    form?.addEventListener('submit', (e)=>{
      e.preventDefault();
      const text = (input.value||'').trim();
      if(!text) return;
      sendMessage(text);
      input.value = '';
      input.focus();
    });
    // cleanup
    window.addEventListener('beforeunload', ()=> Chat.polling && clearInterval(Chat.polling));
  });

  // asegura estructura del badge
(() => {
  const badge = document.getElementById('ctxBadge');
  if (badge && !badge.querySelector('.ctx-pill')) {
    badge.innerHTML = '<span class="ctx-pill"><span class="ctx-dot"></span>default</span>';
  }
})();

