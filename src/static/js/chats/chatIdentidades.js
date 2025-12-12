// ===================== RENDER BADGE CONTEXTO =====================
//parche


  
  
  
  function renderCtxBadge(){
  const el = document.getElementById('ctxBadge');
  if (!el) return;
  const scope = threads[activeThreadId]?.scope || {};
  // Orden y nombres legibles
  const order = ['ambito','categoria','subcategoria','micrositio','cp','idioma','query','publicacion_id'];
  const nice = {
    ambito: 'ámbito', categoria:'categoría', subcategoria:'subcategoría',
    micrositio:'micrositio', cp:'CP', idioma:'idioma', query:'búsqueda', publicacion_id:'pub'
  };
  const parts = [];
  for (const k of order){
    if (scope[k] != null) parts.push(`${nice[k]||k}: ${scope[k]}`);
  }
  const label = parts.length ? parts.join(' · ') : 'default';
  el.innerHTML = `<span class="ctx-pill"><span class="ctx-dot"></span>${label}</span>`;
}

/* ===================== TEMA (light/dark) ===================== */
/* ===================== TEMA (light/dark) ===================== */
(function initTheme(){
  const body = document.body;

  // leer preferencia guardada
  const saved = localStorage.getItem('theme');
  if (saved === 'light') {
    body.classList.add('theme-light');
  } else if (!saved && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    body.classList.add('theme-light');
  }

  const toggle = document.getElementById('toggleTheme');
  if (!toggle) return;

  const applyLabel = () => {
    const isLight = body.classList.contains('theme-light');
    toggle.textContent = isLight ? '🌙 Oscuro' : '☀️ Claro';
  };

  applyLabel();

  toggle.addEventListener('click', () => {
    body.classList.toggle('theme-light');
    const isLight = body.classList.contains('theme-light');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    applyLabel();
  });
})();



/* ===================== CHAT: ESTADO ===================== */
const threads = {};              // { id: { scope, messages: [], title } }
let activeThreadId = null;

/* ===================== HELPERS ===================== */
function scopeKey(scope){
  if (!scope || Object.keys(scope).length === 0) return 'default';
  const o = {}; Object.keys(scope).sort().forEach(k => o[k] = scope[k]);
  return 'ctx:' + btoa(unescape(encodeURIComponent(JSON.stringify(o))));
}
function scopeTitle(scope){
  if (!scope || Object.keys(scope).length === 0) return 'default';
  return Object.entries(scope).map(([k,v]) => `${k}:${v}`).join(' · ');
}
function ensureThread(scope){
  const id = scopeKey(scope);
  if (!threads[id]) threads[id] = { scope: scope ? {...scope} : {}, messages: [], title: scopeTitle(scope) };
  return id;
}

/* ===================== RENDER ===================== */

function renderMessages() {
  const box = document.getElementById('msgs');
  if (!box) {
    console.warn('No se encontró #msgs en el DOM');
    return;
  }
  box.innerHTML = '';
  const msgs = threads[activeThreadId]?.messages || [];
  msgs.forEach(m => {
    const b = document.createElement('div');
    b.className = 'bubble' + (m.me ? ' me' : '');
    b.textContent = m.text;
    box.appendChild(b);
  });
  box.scrollTop = box.scrollHeight;
}

function setActiveThread(id){
  activeThreadId = id;
  renderCtxBadge();   // <-- muestra “default” o el contexto actual
  renderMessages();   // solo mensajes
}



/* ===================== ACCIONES ===================== */
function pushMsg(text, me=false){
  if (!activeThreadId) setActiveThread(ensureThread(null));
  threads[activeThreadId].messages.push({ text, me, ts: Date.now() });
  renderMessages();
}
// helpers
const esc = s => String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const ctxBadgeEl = () => document.getElementById('ctxBadge');

function buildCtxLabel(scope){
  const parts = [];
  if (scope.micrositio)   parts.push(`ámbito: ${esc(scope.micrositio)}`);
  if (scope.categoria)    parts.push(`categoría: ${esc(scope.categoria)}`);
  if (scope.subcategoria) parts.push(`subcategoría: ${esc(scope.subcategoria)}`);
  if (scope.cp)           parts.push(`CP: ${esc(scope.cp)}`);
  if (scope.idioma)       parts.push(`idioma: ${esc(scope.idioma)}`);
  if (scope.alias)        parts.push(`alias: ${esc(scope.alias)}`);   // ← AQUI el alias
  return parts.join(' · ');
}

window.chatHere = function(btn){
  try{
    
    const scope = JSON.parse(btn.getAttribute('data-scope') || '{}');
    const id = ensureThread(scope);
    setActiveThread(id);

    // pinta badge con alias incluido
    const badge = ctxBadgeEl();
    if (badge){
      const label = buildCtxLabel(scope);
      badge.innerHTML = `<span class="ctx-text">${label}</span>`;
      badge.setAttribute('title', label); // tooltip con el texto completo
    }

    // ---- marcado visual (lo que ya tenías) ----
    document.querySelectorAll('.ambito, .ambito-card').forEach(el => el.classList.remove('is-active-ambito'));
    document.querySelectorAll('.subcard').forEach(el => el.classList.remove('is-active-subcard'));
    document.querySelectorAll('.mini-card, .subcard .btn').forEach(el => el.classList.remove('is-active-item'));

    const mini = btn.closest('.mini-card');
    if (mini) mini.classList.add('is-active-item');
    if (btn.closest('.subcard') && !mini) btn.classList.add('is-active-item');

    const subcard = btn.closest('.subcard');
    if (subcard) subcard.classList.add('is-active-subcard');

    const ambito = btn.closest('.ambito, .ambito-card');
    if (ambito) ambito.classList.add('is-active-ambito');

    if (!window.matchMedia('(max-width: 768px)').matches) {
      (mini || subcard || ambito)?.scrollIntoView({ behavior:'smooth',inline: 'start', block:'nearest' });
    }

    // 🔹 NUEVO: refrescar ámbitos/categorías para este par
    const viewerIdRaw = window.VIEWER_USER_ID ?? window.usuario_id ?? null;
    const viewerId = viewerIdRaw ? Number(viewerIdRaw) : null;

    const otherKey =
      scope.tel ||
      scope.phone ||
      scope.email ||
      scope.correo ||
      null;

    if (viewerId && otherKey && typeof window.refreshAmbitosForPair === 'function') {
      console.log('[chatHere] refreshAmbitosForPair', { viewerId, otherKey, scope });
      window.refreshAmbitosForPair(viewerId, otherKey);
    } else {
      console.log('[chatHere] NO refreshAmbitosForPair', {
        hasViewer: !!viewerId,
        otherKey,
        hasFn: typeof window.refreshAmbitosForPair === 'function'
      });
    }

  }catch(e){
    console.error(e);
    Swal.fire('Error', 'Scope inválido', 'error');
  }
};



























window.elevateScope = function(){
    
  Swal.fire({
    title:'Nuevo contexto',
    html:`<input id="sc1" class="swal2-input" placeholder="clave:valor">
          <input id="sc2" class="swal2-input" placeholder="otra:valor">`,
    focusConfirm:false,
  
    preConfirm:()=>{
      const p=v=>v.includes(':') ? v.split(':',2) : null;
      const a=p((document.getElementById('sc1').value||'').trim());
      const b=p((document.getElementById('sc2').value||'').trim());
      const s={}; if(a) s[a[0]]=a[1]; if(b) s[b[0]]=b[1]; return s;
    }
  }).then(res=>{
    if(res.isConfirmed){
      const id = ensureThread(res.value);
      setActiveThread(id);
      // (sin logs de sistema)
    }
  });
};
window.clearScope = function(){
  setActiveThread(ensureThread(null));
  // (sin logs de sistema)
};

/* ===================== HANDLERS UI ===================== */
(function(){
  const $ = (id) => document.getElementById(id);

  // ---- Enviar mensaje (solo si están ambos)
  const sendBtn = $('sendBtn');
  const msgInput = $('msgText');

  if (sendBtn && msgInput) {
    if (!sendBtn._wired) {
      sendBtn.addEventListener('click', () => {
        const msg = (msgInput.value || '').trim();
        if (!msg) return;
        if (typeof pushMsg === 'function') pushMsg(msg, true);
        msgInput.value = '';
      });
      sendBtn._wired = true;
    }
  } else {
    // Opcional: log para saber qué falta
    console.warn('[chatIdentidades] faltan #sendBtn o #msgText en esta vista');
  }

  // ---- Botón de búsqueda simple (IDs: btnSearch / q)
  const simpleSearchBtn = $('btnSearch');
  const simpleSearchInput = $('q');

  if (simpleSearchBtn && simpleSearchInput) {
    if (!simpleSearchBtn._wired) {
      simpleSearchBtn.addEventListener('click', () => {
        const q = (simpleSearchInput.value || '').trim();
        if (!q) {
          if (window.Swal) Swal.fire('Buscar','Ingresá teléfono +E.164, @alias o nombre','info');
          return;
        }
        if ((q.startsWith('+') || q.startsWith('@')) && typeof ensureThread === 'function' && typeof setActiveThread === 'function') {
          const scope = { query: q };
          const id = ensureThread(scope);
          setActiveThread(id);
        }
      });
      simpleSearchBtn._wired = true;
    }
  } else {
    // En esta vista quizá usás #amb-btnSearch y #amb-q: se ignora sin romper
    console.warn('[chatIdentidades] faltan #btnSearch o #q en esta vista');
  }
})();


/* ===================== INIT ===================== */
(function init(){
  setActiveThread(ensureThread(null));
  // (sin tip en mensajes)
})();


(function(){
  const cardSel = '.id-card';
  const listSel = '.id-accordion';
  const itemSel = '.id-item';

  function computeMaxHeight(){
    const card = document.querySelector(cardSel);
    const list = document.querySelector(listSel);
    if(!card || !list) return;

    // Alturas a restar: título (h4) + header de búsqueda
    const h4 = card.querySelector('h4');
    const header = card.querySelector('.panel-header');

    const h4H = h4 ? h4.offsetHeight : 0;
    const headH = header ? header.offsetHeight : 0;

    const cs = getComputedStyle(card);
    const padTop = parseFloat(cs.paddingTop||0);
    const padBot = parseFloat(cs.paddingBottom||0);

    const max = card.clientHeight - h4H - headH - padTop - padBot;
    list.style.maxHeight = Math.max(120, max) + 'px'; // seguridad mínimo
  }

  function updateAccordionScroll(){
    const list = document.querySelector(listSel);
    if(!list) return;

    const count = list.querySelectorAll(itemSel).length;
    const shouldScroll = count >= 9;

    list.classList.toggle('scrolling', shouldScroll);
    if(shouldScroll){
      computeMaxHeight();
    }else{
      list.style.maxHeight = '';
    }
  }

  // Inicializa al cargar
  window.addEventListener('DOMContentLoaded', ()=>{
    updateAccordionScroll();
    // Recalcula al redimensionar
    window.addEventListener('resize', ()=>{
      const list = document.querySelector(listSel);
      if(list && list.classList.contains('scrolling')) computeMaxHeight();
    });

    // Observa cambios (si agregás/quitas usuarios dinámicamente)
    const list = document.querySelector(listSel);
    if(list){
      const mo = new MutationObserver(()=> updateAccordionScroll());
      mo.observe(list, { childList:true, subtree:false });
    }
  });
})();


(function(){
  const list = document.querySelector('.id-accordion');
  if(!list) return;
  const toggle = ()=> list.classList.toggle('force-scroll', list.querySelectorAll('.id-item').length >= 9);
  new MutationObserver(toggle).observe(list, {childList:true});
  window.addEventListener('DOMContentLoaded', toggle);
})();



document.addEventListener('DOMContentLoaded', ()=>{
  const list = document.querySelector('.id-accordion');
  const foot = document.querySelector('.id-footer');
  if(!list || !foot) return;
  const fit = ()=>{
    const h = foot.getBoundingClientRect().height || 56;
    list.style.paddingBottom = (h + 12) + 'px';
  };
  new ResizeObserver(fit).observe(foot);
  fit();
});

 const isMobile = () => matchMedia('(max-width:768px)').matches;













(function(){
 
window.setMobileView = function(view){  // 'identidades' | 'ambitos' | 'chat'
  if(!isMobile()) return;
  const root = document.documentElement;
  root.classList.remove('view-identidades','view-ambitos','view-chat');
  root.classList.add('view-' + view);
};

 
  function setMobileView(view){  // 'identidades' | 'ambitos' | 'chat'
    if(!isMobile()) return;
    const root = document.documentElement;
    root.classList.remove('view-identidades','view-ambitos','view-chat');
    root.classList.add('view-' + view);
  }

  // Vista inicial en móvil: Identidades
  document.addEventListener('DOMContentLoaded', () => {
    if(isMobile()){
      // si ya estabas en otra, no toco; sino, muestro identidades
      const r = document.documentElement;
      if(!r.classList.contains('view-identidades') &&
         !r.classList.contains('view-ambitos') &&
         !r.classList.contains('view-chat')){
        r.classList.add('view-identidades');
      }
    }
  });


  
// === NUEVA FUNCIÓN: SCROLL HORIZONTAL ENTRE PANELES ===
function scrollToSection(view){        // 'identidades' | 'ambitos' | 'chat'
  if (!isMobile()) return;

  const grid = document.querySelector('.app-grid');
  if (!grid) return;

  let target = null;
  if (view === 'identidades') {
    target = document.getElementById('col-identidades');
  } else if (view === 'ambitos') {
    target = document.getElementById('col-ambitos');
  } else if (view === 'chat') {
    target = document.getElementById('col-chat');
  }

  if (!target) return;

  const x = target.offsetLeft;   // posición horizontal del panel
  grid.scrollTo({ left: x, behavior: 'smooth' });
}







function bumpIdentityToTop(fromEl){
  const details = fromEl?.closest?.('details.id-item');
  if (!details) return;

  const list = details.parentElement; // el contenedor que contiene los details
  if (!list) return;

  // si ya está primero, no hagas nada
  if (list.firstElementChild !== details) {
    list.insertBefore(details, list.firstElementChild);
  }
}

document.addEventListener('click', function onGoto(e){
  const el = e.target.closest('.id-name[data-goto="amb-card"]');
  if (!el) return;

  bumpIdentityToTop(el);  // ✅ vuelve a subir el contacto seleccionado

  e.preventDefault();
  e.stopPropagation();
  if (e.stopImmediatePropagation) e.stopImmediatePropagation(); // ✅ evita que otro capture lo pise

  const details = el.closest('details');
  if (details && details.open) details.open = false;

  // ✅ cache -> renderChatAmbitos (copiado del badge)
  const summary  = el.closest('summary.id-summary') || el.closest('summary');
  let   scopeStr = summary?.getAttribute('data-scope') || '{}';
  scopeStr = String(scopeStr).replace(/&quot;|&#34;/g, '"').replace(/&amp;/g, '&');

  let scope = {};
  try { scope = JSON.parse(scopeStr); } catch { scope = {}; }

  const cached =
    (window.IdentityCache?.get && (window.IdentityCache.get(JSON.stringify(scope)) || window.IdentityCache.get(scope)))
    || (typeof window.getCachedIdentity === 'function' ? window.getCachedIdentity(scope) : null);

  if (cached && typeof window.renderChatAmbitos === 'function') {
    window.renderChatAmbitos(cached);
    document.getElementById('ambQueryPanel')?.classList.add('is-open');
  } else {
    console.warn('[id-name→ambitos] Sin datos en cache para scope:', scope);
  }

  // ✅ LO QUE TE FALTABA: disparar la misma carga que el badge (refreshAmbitosForPair / entrantes)
  const tmp = document.createElement('button');
  tmp.setAttribute('data-scope', scopeStr);
  (window.chatHere || window.chatAmbitoHere)?.(tmp);

  // tu flujo actual (solo móvil)
  if (window.matchMedia('(max-width: 768px)').matches) {
    document.documentElement.classList.add('hide-scrollbar');
    window.setMobileView && window.setMobileView('ambitos');

    setTimeout(() => {
      const a = document.getElementById('amb-card');
      if (a) a.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      setTimeout(() => {
        document.documentElement.classList.remove('hide-scrollbar');
      }, 350);
    }, 200);
  }
}, { capture: true });









// Captura CLIC en <span class="id-badge" data-goto="chat">...</span>
document.addEventListener('click', function (e) {
  const badge = e.target.closest('span.id-badge[data-goto="chat"]');
  if (!badge) return;

  e.preventDefault();
  e.stopPropagation();
  if (e.stopImmediatePropagation) e.stopImmediatePropagation();

  const summary  = badge.closest('summary.id-summary') || badge.closest('summary');
  let   scopeStr = summary?.getAttribute('data-scope') || '{}';

  // --- desescapar y parsear scope ---
  scopeStr = String(scopeStr).replace(/&quot;|&#34;/g, '"').replace(/&amp;/g, '&');
  let scope = {};
  try { scope = JSON.parse(scopeStr); } catch { scope = {}; }

  // --- tomar del cache y pintar Ámbitos ---
  const cached =
    (window.IdentityCache?.get && (window.IdentityCache.get(JSON.stringify(scope)) || window.IdentityCache.get(scope)))
    || (typeof window.getCachedIdentity === 'function' ? window.getCachedIdentity(scope) : null);

  if (cached && typeof window.renderChatAmbitos === 'function') {
    window.renderChatAmbitos(cached);
    // (opcional) abrir panel de ámbitos
    document.getElementById('ambQueryPanel')?.classList.add('is-open');
  } else {
    console.warn('[badge→ambitos] Sin datos en cache para scope:', scope);
  }

  // --- abrir chat (como ya hacías) ---
  const tmp = document.createElement('button');
  tmp.setAttribute('data-scope', scopeStr);
  (window.chatHere || window.chatAmbitoHere)?.(tmp);

  // --- UI slide ---
  document.documentElement.classList.add('slide-chat');
  document.documentElement.classList.remove('slide-ambitos');
  pintarDesdeCacheAmbitosYChat(badge);
}, { capture: true });















  // 2.a Al tocar un usuario -> ir a Ámbitos (solo móvil)
document.addEventListener('click', (e) => {
  const summary = e.target.closest('.id-summary');  // <summary class="id-summary">
    
  if (!summary) return;

  if (isMobile()) {
    summary.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });  // 👈 desliza a la columna del medio
    setMobileView('ambitos');
    //setTimeout(focusAmbAnchor, 300);
  }
}, ); // ← CAMBIO MÍNIMO


  // 2.b Cuando se pulsa “Chatear …” en ámbitos/mini-cards -> ir a Chat (solo móvil)
  const _origChatHere = window.chatHere || window.chatAmbitoHere;
  window.chatHere = window.chatAmbitoHere = function(btn){
    try{
      if(typeof _origChatHere === 'function') _origChatHere(btn);
    }finally{
      setMobileView('chat');
    }
  };

  // 2.c Botón “flecha” del header del chat como “volver a Ámbitos” en móvil
  const backBtn = document.getElementById('toggleAmbitos');
  if(backBtn){
    backBtn.addEventListener('click', () => {
      if(isMobile()) setMobileView('ambitos');
    });
  }

  // 2.d Si rotás la pantalla, mantené la vista coherente
  addEventListener('resize', () => {
    const r = document.documentElement;
    if(!isMobile()){
      // limpiá las clases móviles para volver al layout de 3 columnas
      r.classList.remove('view-identidades','view-ambitos','view-chat');
    }else if(!r.classList.contains('view-identidades') &&
             !r.classList.contains('view-ambitos') &&
             !r.classList.contains('view-chat')){
      r.classList.add('view-identidades');
    }
  });
})();













// === helpers ===
window.identityCache = window.identityCache || new Map();

function getKeyFromDom(el){
  return el?.closest('.id-item')?.dataset?.key?.trim() || '';
}

function getKeyFromScope(scope={}){
  return (scope.tel || scope.alias || scope.nombre || '').trim();
}

function getCachedByKeyOrScope(key, scope){
  if (key && identityCache.has(key)) return identityCache.get(key);
  const alt = getKeyFromScope(scope);
  if (alt && identityCache.has(alt)) return identityCache.get(alt);
  return null;
}

function pintarDesdeCacheAmbitosYChat(badgeEl){
  // 1) summary + scope (viene escapado en tu HTML)
  const summary = badgeEl.closest('summary.id-summary') || badgeEl.closest('summary');
  let scopeStr = (summary?.getAttribute('data-scope') || '{}')
      .replace(/&quot;|&#34;/g, '"').replace(/&amp;/g, '&');
  let scope = {}; try { scope = JSON.parse(scopeStr); } catch { scope = {}; }

  // 2) key desde DOM o desde scope
  const keyDom = getKeyFromDom(badgeEl);
  const cached = getCachedByKeyOrScope(keyDom, scope);

  // 3) pintar si hay caché
  if (cached){
    const k = (keyDom || getKeyFromScope(scope));
    console.groupCollapsed('%c[CACHE HIT → badge/chat]', 'color:green;font-weight:700;', k);
    console.log('key:', k);
    console.log('user:', cached.user);
    console.log('resumen:', {
      publicaciones: cached.publicaciones?.length || 0,
      ambitos: cached.ambitos?.length || 0,
      cp: cached.codigos_postales?.length || 0,
      idiomas: cached.idiomas?.length || 0
    });
    console.groupEnd();

    // Pinta Ámbitos + tarjeta identidad y marca activo
    window.renderChatAmbitos?.(cached);
    window.renderIdentityResult?.(cached.user, { userKeyOverride: k });
    window.setActiveIdentity?.(k);

    // abre panel de ámbitos (si lo usás)
    document.getElementById('ambQueryPanel')?.classList.add('is-open');
  } else {
    console.warn('[CACHE MISS → badge/chat] keyDom:', keyDom, 'scope:', scope);
  }

  // 4) invocar tu chatHere/chatAmbitoHere conservando conducta actual
  const tmp = document.createElement('button');
  tmp.setAttribute('data-scope', scopeStr);
  (window.chatHere || window.chatAmbitoHere)?.(tmp);

  // 5) UI slide
  document.documentElement.classList.add('slide-chat');
  document.documentElement.classList.remove('slide-ambitos');

  // 6) móvil: pasar a vista chat
  if (typeof isMobile === 'function' && isMobile()){
    window.setMobileView?.('chat');
  }
}













// ==== Helpers de scope desde CACHE de identidad ====

function buildScopeFromIdentityCache(identityKey){
  if (!window.getCachedIdentity){
    console.warn('[CHAT] No existe getCachedIdentity, no puedo armar scope identidad');
    return null;
  }

  const data = getCachedIdentity(identityKey);
  if (!data){
    console.warn('[CHAT] Sin datos en cache para identidad:', identityKey);
    return null;
  }

  const u    = data.user || {};
  const tels = (u.tel || u.telefono || identityKey || '').toString().trim();

  // tomamos primer cp / idioma si hay
  const cps     = Array.isArray(data.codigos_postales) ? data.codigos_postales : [];
  const idiomas = Array.isArray(data.idiomas) ? data.idiomas : [];

  const cpVal   = cps[0] || '';      // ej. "52-200"
  const langVal = idiomas[0] || 'es';

  // ámbito/categoría “personal” por defecto (puede venir en ambitos)
  const ambs = Array.isArray(data.ambitos) ? data.ambitos : [];
  const ambPersonal = ambs[0] || {};   // si tenés uno específico de personal, filtralo

  // owner_user_id = el dueño del micrositio personal (probablemente vos)
  const ownerId = window.CURRENT_USER_ID || window.currentUserId || null;

  const scope = {
    tel:       tels,
    ambito:    ambPersonal.nombre || ambPersonal.valor || 'personal',
    ambito_id: ambPersonal.id || null,
    categoria: 'personal',
    categoria_id: null,
    cp:        cpVal,
    idioma:    langVal,
    dominio:   'personal',
    owner_user_id: ownerId
  };

  console.log('[CHAT] scope desde cache identidad:', scope);
  return scope;
}


// Click en "Chatear aquí" desde IDENTIDADES
document.addEventListener('click', (e) => {
  const btnId = e.target.closest('[data-chat-identity]');
  if (!btnId) return;

  const identityKey = btnId.dataset.chatIdentity; // ej. tel o clave cache
  if (!identityKey){
    console.warn('[CHAT] data-chat-identity vacío');
    return;
  }

  const scope = buildScopeFromIdentityCache(identityKey);
  if (!scope) return;

  // abrimos chat pasando scope directo (no botón)
  chatAmbitoHere(scope);
});


















// ===== Menú contextual de identidades =====

(function setupIdentityContextMenu() {
  // crear el menú una sola vez
  let menu = document.getElementById('identityContextMenu');
  if (!menu) {
    menu = document.createElement('div');
    menu.id = 'identityContextMenu';
    menu.className = 'identity-context-menu';
    menu.innerHTML = `
      <button type="button" data-action="delete-all">
        🗑 Eliminar usuario + historial + caché
      </button>
      <button type="button" data-action="delete-cache">
        🧹 Eliminar sólo caché
      </button>
    `;
    document.body.appendChild(menu);
  }

  let currentKey = null;

  // mostrar menú cerca del botón
  window.showIdentityContextMenu = function (btn) {
    const key = btn.dataset.key;
    if (!key) return;
    currentKey = key;

    const rect = btn.getBoundingClientRect();
    menu.style.display = 'block';
    menu.style.top = `${rect.bottom + window.scrollY + 4}px`;
    menu.style.left = `${rect.right + window.scrollX - menu.offsetWidth}px`;
  };

  // manejar clicks en el menú
  menu.addEventListener('click', (e) => {
    const action = e.target?.dataset?.action;
    if (!action || !currentKey) return;
    handleIdentityMenuAction(action, currentKey);
    hideMenu();
  });

  function hideMenu() {
    menu.style.display = 'none';
    currentKey = null;
  }

  // cerrar al hacer click fuera
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && !e.target.closest('.id-menu-btn')) {
      hideMenu();
    }
  });

  // cerrar con Esc
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideMenu();
  });

})();

// ===== Acciones del menú =====

function handleIdentityMenuAction(action, key) {
  console.log('[IDENTITY menu] acción:', action, 'key:', key);

  if (action === 'delete-cache') {
    Swal.fire({
      title: '¿Eliminar solo caché?',
      text: 'Se borrarán datos cacheados (publicaciones, ámbitos, etc.) pero el contacto seguirá visible.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, borrar caché',
      cancelButtonText: 'Cancelar'
    }).then((res) => {
      if (!res.isConfirmed) return;
      deleteIdentityCacheOnly(key);
    });
  }

  if (action === 'delete-all') {
    Swal.fire({
      title: '¿Eliminar usuario, historial y caché?',
      text: 'Se eliminará el contacto de la lista y se limpiará su caché. (Historial: si tenés lógica definida).',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar todo',
      cancelButtonText: 'Cancelar'
    }).then((res) => {
      if (!res.isConfirmed) return;
      deleteIdentityEverywhere(key);
    });
  }
}

function deleteIdentityCacheOnly(key) {
  if (window.identityCache?.has(key)) {
    window.identityCache.delete(key);
    window.IdentityCachePersist?.();
    console.log('[IDENTITY] caché eliminada para', key);
  } else {
    console.log('[IDENTITY] no había caché para', key);
  }

  // Si querés, al eliminar caché también podés limpiar el micrositio personal
  const wrap = document.getElementById('vistaChatAmbitos');
  if (wrap && wrap.dataset.activeKey === key) {
    wrap.innerHTML = '<p class="muted">Micrositio limpio. Volvé a buscar para recargar datos.</p>';
  }
}

function deleteIdentityEverywhere(key) {
  // 1) borrar caché
  deleteIdentityCacheOnly(key);

  // 2) eliminar nodo del DOM
  const acc = document.querySelector('.id-accordion');
  const item = acc?.querySelector(`.id-item[data-key="${key}"]`);
  if (item) item.remove();

  // 3) limpiar historial de chat si tenés función para eso
  try {
    if (typeof clearChatHistoryForIdentity === 'function') {
      clearChatHistoryForIdentity(key);
    }
  } catch (e) {
    console.warn('clearChatHistoryForIdentity error:', e);
  }

  console.log('[IDENTITY] identidad eliminada por completo', key);
}







