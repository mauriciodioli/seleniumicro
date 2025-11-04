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
(function initTheme(){
  const saved = localStorage.getItem('theme');
  if (saved === 'light') document.body.classList.add('theme-light');
  if (!saved && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    document.body.classList.add('theme-light');
  }
  const btn = document.getElementById('toggleTheme');
  if (btn) btn.addEventListener('click', () => {
    document.body.classList.toggle('theme-light');
    localStorage.setItem('theme', document.body.classList.contains('theme-light') ? 'light' : 'dark');
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
  (mini || subcard || ambito)?.scrollIntoView({ behavior:'smooth', block:'center' });
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

window.focusAmbAnchor = function(){
  const a = document.getElementById('amb-card');
  if (a) a.scrollIntoView({ behavior:'smooth', block:'start' });
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
function focusAmbAnchor(){
  const a = document.getElementById('amb-card');
  if (a) a.scrollIntoView({ behavior:'smooth', block:'start' });
}

  




document.addEventListener('click', function onGoto(e){
  const el = e.target.closest('.id-name[data-goto="amb-card"]');
  if (!el) return;

  e.preventDefault();
  e.stopPropagation();

  // cerrar el details si estaba abierto
  const details = el.closest('details');
  if (details && details.open) details.open = false;

  // solo móvil
  if (window.matchMedia('(max-width: 768px)').matches) {
    document.documentElement.classList.add('hide-scrollbar');   // ← 1) oculto barra
    window.setMobileView && window.setMobileView('ambitos');

    setTimeout(() => {
      const a = document.getElementById('amb-card');
      if (a) a.scrollIntoView({ behavior:'smooth', block:'start' });
      // 2) la vuelvo a mostrar
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
debugger;
  // Evita que el <summary> padre haga toggle
  e.preventDefault();
  e.stopPropagation();

  // 👉 acá hacés lo que quieras con el clic
  // por ejemplo: abrir chat con el scope del <summary> padre
  const summary = badge.closest('summary.id-summary');
  const scopeStr = summary?.getAttribute('data-scope') || '{}';

  // si ya tenés chatHere(btn) que lee data-scope:
  const tmp = document.createElement('button');
  tmp.setAttribute('data-scope', scopeStr);
  (window.chatHere || window.chatAmbitoHere)?.(tmp);

  // si usás slide/carrusel a la columna chat:
  document.documentElement.classList.add('slide-chat');
  document.documentElement.classList.remove('slide-ambitos');
}, { capture: true }); // ← clave para ganarle al <summary>















  // 2.a Al tocar un usuario -> ir a Ámbitos (solo móvil)
document.addEventListener('click', (e) => {
  const summary = e.target.closest('.id-summary');  // <summary class="id-summary">
    
  if (!summary) return;

  if (isMobile()) {
    
    setMobileView('ambitos');
    setTimeout(focusAmbAnchor, 300);
  }
}, ); // ← CAMBIO MÍNIMO

// (2) Fallback mínimo: si tocan el nombre dentro del summary, también navega
document.addEventListener('click', (e) => {
   
  const name = e.target.closest('.id-name[data-goto="amb-card"]');
  if (!name || !isMobile()) return;
  setMobileView('ambitos');
  setTimeout(focusAmbAnchor, 300);
}); // ← opcional, pero útil

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





