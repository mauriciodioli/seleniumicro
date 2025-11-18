// static/js/chats/buscarUsuarioTelefono.js

// === API única para leer caché de identidad ===
window.getCachedIdentity = function(arg){
  const u = arg || {};
  let key = '';
  if (typeof arg === 'string') {
    key = arg.trim();
  } else {
    key = (u.tel || u.alias || u.nombre || '').toString().trim();
  }
  if (!key) return null;
  return window.IdentityCache?.get(key) || null;
};


// === Búsqueda de usuario por teléfono/alias/nombre ===
(function () {
  const input = document.getElementById('idSearch')    // ojo: en tu HTML pusiste id="btnSearch" en el input
                 || document.getElementById('btnSearch'); // fallback
  const btn   = document.getElementById('sendBtn');
  const list  = document.querySelector('.id-accordion');

  if (!input || !btn || !list) return;

  function classify(query) {
    const q = (query || '').trim();
    if (!q) return { type: 'empty', value: '' };

    if (q.startsWith('+')) return { type: 'phone', value: q };
    if (q.startsWith('@')) return { type: 'alias', value: q.substring(1) };
    return { type: 'name', value: q };
  }

  async function buscar() {
    const raw = input.value.trim();
    if (!raw) return;

    const kind = classify(raw);

    try {
      const resp = await fetch('/buscar_usuario_telefono/api/chat/identidad-buscar/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          q: kind.value,
          type: kind.type
        })
      });

      const data = await resp.json();
      console.log('[identidad-buscar] data:', data);

      if (!resp.ok || !data.ok) {
        Swal.fire('Sin resultados', data.error || 'No se encontró identidad', 'info');
        return;
      }

      // 1) identidad en panel izquierdo
      renderIdentityResult(data.user);

      // 2) ámbitos en MyDomain (si está abierto)
      if (Array.isArray(data.ambitos)) {
        renderMyDomainAmbitos(data.ambitos);
      }

      // 3) publicaciones en panel derecho de MyDomain
      if (Array.isArray(data.publicaciones)) {
        renderMyDomainPublicaciones(data.publicaciones);
      }

      // 4) si querés mostrar CP / idiomas en algún badge:
      if (Array.isArray(data.codigos_postales) || Array.isArray(data.idiomas)) {
        renderMetaBadges(data.codigos_postales || [], data.idiomas || []);
      }

    } catch (err) {
      console.error('[buscarUsuarioTelefono] error', err);
      Swal.fire('Error', 'No se pudo buscar el usuario', 'error');
    }
  }


  // ================== NUEVO: render de ÁMBITOS en MyDomain ==================
  function renderMyDomainAmbitos(ambitos) {
    // tu panel está en chats/mydomain/chatDominios.html
    
    const mdList = document.getElementById('mdList');              // lista de ámbitos “mis”
    const ambAcc = document.querySelector('#myDomainView .amb-accordion'); // tu clon con details

    if (!mdList && !ambAcc) return;

    // limpiamos solo lo que fue generado
    if (mdList) mdList.innerHTML = '';
    if (ambAcc) ambAcc.innerHTML = '';

    ambitos.forEach(a => {
      const nombre = a.nombre || '(sin nombre)';
      const cats   = Array.isArray(a.categorias) ? a.categorias : [];

      const det = document.createElement('details');
      det.className = 'amb-item';
      det.setAttribute('data-ambito', nombre);

      let catsHtml = '';
      if (cats.length) {
        catsHtml = `<ul class="md-cat-list">
          ${cats.map(c => `
            <li>
              <button class="md-cat"
                      data-ambito="${nombre}"
                      data-categoria="${c.id}">
                ${c.nombre}
              </button>
            </li>`).join('')}
        </ul>`;
      }

      det.innerHTML = `
        <summary class="amb-summary">
          <span class="amb-name">${nombre}</span>
          <span class="amb-badge">${cats.length ? cats.length + ' categorías' : '—'}</span>
        </summary>
        ${catsHtml}
      `;

      if (mdList) mdList.appendChild(det.cloneNode(true));
      if (ambAcc) ambAcc.appendChild(det);
    });
  }

  // ================== NUEVO: render de PUBLICACIONES en panel derecho ==================
 function jattr(obj) {
  return String(JSON.stringify(obj || {})).replace(/"/g, '&quot;');
}

function esc(s) {
  // escape mínimo para texto visible
  return String(s ?? '').replace(/[&<>"']/g, m => (
    { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]
  ));
}

function renderMyDomainPublicaciones(publicaciones) {
  const cont = document.getElementById('mdContent');
  if (!cont) return;

  if (!Array.isArray(publicaciones) || publicaciones.length === 0) {
    cont.innerHTML = `<p>No hay publicaciones recientes para este usuario.</p>`;
    return;
  }

  cont.innerHTML = `
    <div class="md-pubs">
      ${publicaciones.map(p => {
        const titulo = esc(p.titulo || 'Sin título');
        const ambito = esc(p.ambito || '—');
        const idioma = esc(p.idioma || '—');
        const cp     = esc(p.codigo_postal || p.cp || '—');
        const estado = esc(p.estado || '—');

        const scope = jattr({
          ambito: p.ambito || null,
          categoria_id: p.categoria_id ?? null,
          cp: p.codigo_postal || p.cp || null,
          idioma: p.idioma || null,
          publicacion_id: p.id ?? null
        });

        return `
          <article class="md-pub">
            <h5>${titulo}</h5>
            <p class="md-pub-meta">
              <span>🧭 ${ambito}</span>
              <span>🌐 ${idioma}</span>
              <span>📍 ${cp}</span>
              <span>⚙️ ${estado}</span>
            </p>
            <button class="btn btn-sm"
                    data-goto="chat"
                    data-scope='${scope}'
                    onclick="chatHere(this)">
              Chatear sobre esta publicación
            </button>
          </article>
        `;
      }).join('')}
    </div>
  `;
}


  // ================== NUEVO: render de CP / idiomas (opcional) ==================
  function renderMetaBadges(cps, idiomas) {
    const foot = document.querySelector('#myDomainView .amb-footer .foot-right');
    if (!foot) return;
    foot.innerHTML = '';

    if (Array.isArray(cps) && cps.length) {
      const cpSpan = document.createElement('span');
      cpSpan.className = 'badge meta-badge';
      cpSpan.textContent = `CP: ${cps.join(', ')}`;
      foot.appendChild(cpSpan);
    }

    if (Array.isArray(idiomas) && idiomas.length) {
      const langSpan = document.createElement('span');
      langSpan.className = 'badge meta-badge';
      langSpan.textContent = `Idiomas: ${idiomas.join(', ')}`;
      foot.appendChild(langSpan);
    }
  }

 















  // <<< al final del IIFE, antes de `})();` >>>
window.BuscarUsuarioTelefono = {
  buscarBy: async function(kind, value){
    // normaliza alias
    if (kind === 'alias' && typeof value === 'string') {
      value = value.replace(/^@/, '');
    }

    let resp, data = {};
    try {
      resp = await fetch('/buscar_usuario_telefono/api/chat/identidad-buscar/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'include',       // <-- usa cookies si las hay
        cache: 'no-store',
        body: JSON.stringify({ q: value, type: kind })
      });
      // evita crash si el server devuelve HTML en error 500
      const text = await resp.text();
      try { data = JSON.parse(text); } catch { data = { ok:false, error:text } }
    } catch (e) {
      throw new Error('Network error');
    }

    if (!resp.ok || !data?.ok) {
      throw new Error(data?.error || 'Sin resultados');
    }
     debugger;
    // renders con guardas
    if (typeof renderIdentityResult === 'function') renderIdentityResult(data.user);
    if (Array.isArray(data.ambitos) && typeof renderMyDomainAmbitos === 'function')
      renderMyDomainAmbitos(data.ambitos);
    if (Array.isArray(data.publicaciones) && typeof renderMyDomainPublicaciones === 'function')
      renderMyDomainPublicaciones(data.publicaciones);
    if ((Array.isArray(data.codigos_postales) || Array.isArray(data.idiomas)) &&
        typeof renderMetaBadges === 'function') {
      renderMetaBadges(data.codigos_postales || [], data.idiomas || []);
    }
    return data;
  },

  // exportás los renders por si querés usarlos desde otro init
  renderIdentityResult,
  renderMyDomainAmbitos,
  renderMyDomainPublicaciones,
  renderMetaBadges
};

})();








































// --- refs (compat)
const input = document.getElementById('idSearch') || document.getElementById('amb-q');
const btn   = document.getElementById('sendBtn')  || document.getElementById('amb-btnSearch');

if (!input || !btn) console.warn('[chat-identidades] No se encontró input o botón.');

// --- helpers
const j = o => String(JSON.stringify(o||{})).replace(/"/g,'&quot;');
const slug = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().trim().replace(/\s+/g,'_').replace(/[^\w\-./]/g,'');
const cap = s => { s = String(s||'').trim(); return s ? s[0].toUpperCase()+s.slice(1) : s; };
const parseKind = q => {
  const s = String(q||'').trim();
  if (!s) return { type:'empty', value:'' };
  if (s.startsWith('+')) return { type:'phone', value:s };
  if (s.startsWith('@')) return { type:'alias', value:s.slice(1) };
  return { type:'name', value:s };
};




// === Cache por identidad (para re-render rápido al click)
function userKey(u={}){
  if (u.id)   return 'id:'+u.id;
  if (u.tel)  return 'tel:'+String(u.tel).replace(/\D/g,'');
  if (u.alias)return 'alias:'+String(u.alias).toLowerCase().replace(/^@/,'');
  return null;
}





// === CACHE GLOBAL DE IDENTIDADES ===
(function(){
  const LS_KEY = 'dpia.identityCache.v1';

  // Siempre la misma instancia
  window.IdentityCache = window.IdentityCache || new Map();
  window.identityCache = window.IdentityCache; // alias para código viejo

  // Persistir en localStorage
  function persistIdentityCache(){
    try {
      const obj = {};
      for (const [k, v] of window.IdentityCache.entries()){
        obj[k] = v;
      }
      localStorage.setItem(LS_KEY, JSON.stringify(obj));
    } catch(err){
      console.warn('[IdentityCache] persist error', err);
    }
  }

  // Rehidratar desde localStorage → Map + panel identidades
  function hydrateIdentityCache(){
    let raw;
    try {
      raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object') return;

      window.IdentityCache.clear();
      for (const [k, v] of Object.entries(obj)){
        window.IdentityCache.set(k, v);
      }

      // ⚠️ IMPORTANT: usamos tu renderIdentityResult “bueno” (el de abajo)
      if (typeof window.renderIdentityResult === 'function'){
        Object.entries(obj).forEach(([k, data]) => {
          if (!data || !data.user) return;
          window.renderIdentityResult(data.user, { userKeyOverride: k });
        });
      }
    } catch(err){
      console.warn('[IdentityCache] hydrate error', err, raw);
    }
  }

  // Exponer helpers globales
  window.IdentityCachePersist  = persistIdentityCache;
  window.IdentityCacheHydrate  = hydrateIdentityCache;

  // Rehidratar al cargar la página
  document.addEventListener('DOMContentLoaded', hydrateIdentityCache);
})();

window.IdentityCache = window.IdentityCache || new Map();
const identityCache = window.IdentityCache;   // todos usan el mismo
window.identityCache = window.IdentityCache;


// Marca visual de identidad activa
function setActiveIdentity(key){
  document.querySelectorAll('.id-item.is-active').forEach(el=>el.classList.remove('is-active'));
  const el = document.querySelector(`.id-item[data-key="${key}"]`);
  if (el) el.classList.add('is-active');
}






// === FIX 1: contenedor correcto (tu lista scrolleable)
// Contenedor real de la lista
const acc = document.querySelector('.id-accordion');
if (!acc) console.warn('[id-accordion] contenedor no encontrado');

// Deduce una clave estable para evitar duplicados si querés
function identityKey(u={}){
  if (u.alias) return 'a:' + String(u.alias).toLowerCase().replace(/^@/,'');
  if (u.tel)   return 't:' + String(u.tel).replace(/\D/g,'');
  return null;
}

// Agrega SIN pisar. Si dedupe=true y ya existe, NO agrega (o podés elegir actualizar).
// Agrega SIN pisar. Si dedupe=true y ya existe, NO agrega (o podés elegir actualizar).
function renderIdentityResult(user = {}, { userKeyOverride = null } = {}) {
  const acc = document.querySelector('.id-accordion');
  const tel = String(user?.tel || '').trim(); // debe venir en E.164 (+XXXXXXXX)
  if (!acc || !tel) return;

  console.log('[IDENTITY] user recibido:', JSON.parse(JSON.stringify(user)));

  const key = userKeyOverride || tel;

  // Si ya existe, lo subimos al tope y salimos
  const existing = acc.querySelector(`.id-item[data-key="${key}"]`);
  if (existing) {
    acc.insertBefore(existing, acc.firstElementChild);
    return;
  }

  const alias = buildAliasFromUser(user);
  user.alias = alias;

  // scope mínimo para chat (tel + user_id + alias)
  const scope = { tel, alias, user_id: user.id };

  const j = (obj) => JSON.stringify(obj || {});

  const displayName =
    user.nombre ||
    alias ||
    'Usuario';

  const html = `
    <details class="id-item" data-key="${key}">
      <summary class="id-summary" data-scope='${j(scope)}'>
        <button type="button" class="id-chev-btn" aria-label="Abrir/cerrar">▶</button>
        <span class="id-name" data-goto="amb-card">👤 ${displayName}</span>
        <span class="id-badge" data-goto="chat">${user.last_msg || '—'}</span>
      </summary>
      <div class="id-body">
        <span class="id-field">📞 ${tel}</span>
        ${
          alias
            ? `<button type="button"
                       class="id-field id-alias"
                       data-key="${key}"
                       onclick="window.openPersonalMicrosite?.(this)">
                 ${alias}
               </button>`
            : ''
        }
        ${user.url ? `<span class="id-field">🌐 ${user.url}</span>` : ''}
      </div>
      <div class="id-actions">
        <button class="btn btn-accent"
                data-goto="chat"
                data-scope='${j(scope)}'
                onclick="window.chatHere?.(this)">
          Chatear aquí
        </button>
        <button class="btn btn-ghost"
                onclick="Swal?.fire('Contacto','WhatsApp habilitado','success')">
          Abrir WhatsApp
        </button>
      </div>
    </details>
  `.trim();

  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  acc.insertBefore(tmp.firstElementChild, acc.firstElementChild);
}





// --- util slug/cap/j ya las tenés arriba

// Deriva categorias por ámbito a partir de publicaciones cuando vienen vacías
function _enrichAmbitosWithCategorias(payload){
  const pubs = Array.isArray(payload?.publicaciones) ? payload.publicaciones : [];
  const ambs = Array.isArray(payload?.ambitos) ? payload.ambitos : [];
  if (!pubs.length || !ambs.length) return ambs;

  // ambitoSlug -> Set<categoria_id>
  const byAmb = new Map();
  for (const p of pubs) {
    const aName = p?.ambito || 'general';
    const aKey  = slug(aName);
    const set   = byAmb.get(aKey) || new Set();
    if (p?.categoria_id != null) set.add(p.categoria_id);
    byAmb.set(aKey, set);
  }

  // Si el ámbito no trae categorias, las derivamos de publicaciones
  return ambs.map(a => {
    const aName = a?.nombre || a?.valor || 'general';
    const aKey  = slug(aName);
    let cats = Array.isArray(a?.categorias) ? a.categorias : [];
    if (!cats.length) {
      const ids = Array.from(byAmb.get(aKey) || []);
      cats = ids.map(id => ({
        id,
        slug: `${id}`,
        nombre: `Categoría ${id}`
      }));
    }
    return { ...a, categorias: cats };
  });
}

// --- render en #vistaChatAmbitos (con scroll forzado desde JS)
function renderChatAmbitos(payload){ 
  const target = document.getElementById('vistaChatAmbitos');
  if (!target) return;
  
  // 1) Enriquecemos ambitos con categorías si están vacías
  const user    = payload?.user || {};
  const ambs    = _enrichAmbitosWithCategorias(payload);
  const idioma  = payload?.idiomas?.[0] || user.idioma || 'es';
  const cp      = payload?.codigos_postales?.[0] || user.cp || '—';
  const userId  = user.id ?? user.user_id ?? null;
  const email   = user.email || user.correo || (String(user.nombre || '').includes('@') ? user.nombre : '');
  const alias   = buildAliasFromUser({ ...user, email });
  const tel     = user.tel   || '';

  if (!ambs.length){
    target.innerHTML = `<div class="amb-accordion"><p style="padding:8px">Sin ámbitos para mostrar.</p></div>`;
    _ensureScrollable(target);
    return;
  }

  let html = `<div class="amb-accordion">`;
  for (const a of ambs){
    const nombre = a?.nombre || a?.valor || '—';
    const ambKey = slug(nombre);
    const ambito_id = a?.id || a?.ambito_id || null;
    const badge  = (a?.estado || 'activo').toLowerCase();
    
    // scope del SUMMARY del ámbito
    const scopeSummary = {
      ambito: ambKey,
      ambito_id,
      idioma: a?.idioma || idioma,
      alias,
      tel,
      user_id: userId,
      email
    };

    const cats = Array.isArray(a?.categorias) ? a.categorias : [];
    const catsHtml = cats.map(c => {
      const cname = c?.nombre || c?.valor || '—';
      const ckey  = slug(c?.slug || c?.id || cname);
    
      // scope del botón de categoría
      const scopeCat = {
        ambito:   ambKey,
         ambito_id,
        categoria: ckey,
        cp,
        idioma: a?.idioma || idioma,
        alias,
        tel,
        user_id: userId,
        email
      };
      
      return `
        <div class="amb-subcard">
          <div class="amb-subcard-head">
            <span>${cap(cname)}</span>
            <button class="btn"
                    data-goto="chat"
                    data-user-id="${userId ?? ''}"
                    data-email="${email ? escapeHtml(email) : ''}"
                    data-scope='${j(scopeCat)}'
                    onclick="window.chatHere?.(this)">
              Chatear en ${cap(cname)}
            </button>
          </div>
          <div class="amb-mini-grid"></div>
        </div>`;
    }).join('');

    html += `
      <details class="amb-item">
        <summary class="amb-summary" data-scope='${j(scopeSummary)}'>
          <button type="button" class="amb-chev-btn" aria-label="Abrir/cerrar">▶</button>
          <span class="amb-name">${cap(nombre)}</span>
          <span class="amb-badge">${badge}</span>
        </summary>

        <div class="amb-list">
          <span class="amb-list-item">🟢 Estado: ${badge}</span>
          <span class="amb-list-item">🌐 Idioma: ${a?.idioma || idioma}</span>
          <span class="amb-list-item">📍 CP: ${cp}</span>
        </div>

        <summary class="amb-section-summary">
          <span class="amb-section-title">Categorías</span>
        </summary>
        <div class="amb-subcards">${catsHtml}</div>
      </details>`;
  }
  html += `</div>`;
  target.innerHTML = html;

  // 2) Forzamos que el contenedor sea scrolleable sin tocar tus CSS
  _ensureScrollable(target);
}


// Crea alias a partir del user (si no viene alias explícito)
function buildAliasFromUser(user = {}) {
  // si ya viene alias, lo respetamos
  if (user.alias && String(user.alias).trim()) {
    return String(user.alias).trim();
  }

  // intenta con email / nombre que contenga @
  const rawEmail = user.email || user.correo || user.nombre || '';
  const s = String(rawEmail).trim();
  if (s.includes('@')) {
    const local = s.split('@')[0].trim();
    if (local) {
      // saneamos el local para que sea un alias limpio
      const safe = local.replace(/[^a-zA-Z0-9_.-]/g, '');
      if (safe) return '@' + safe;
    }
  }

  // fallback
  return '@User';
}


// Fuerza layout para scroll (sin depender de CSS externo)
function _ensureScrollable(target){
  // El contenedor donde se inyecta
  target.style.display = 'flex';
  target.style.flexDirection = 'column';
  target.style.flex = '1 1 auto';
  target.style.minHeight = '0';
  target.style.overflow = 'hidden'; // contiene sombras internas

  // Si está dentro de .amb-card, garantizamos la fila shrink
  const card = target.closest('.amb-card');
  if (card) {
    // auto, auto, auto, minmax(0,1fr), auto
    card.style.display = 'grid';
    card.style.gridTemplateRows = 'auto auto auto minmax(0,1fr) auto';
  }

  // El área que realmente scrollea
  const acc = target.querySelector('.amb-accordion');
  if (acc){
    acc.style.flex = '1 1 auto';
    acc.style.minHeight = '0';
    acc.style.overflowY = 'auto';
    acc.style.webkitOverflowScrolling = 'touch';
  }
}

// --- función principal
// --- función principal (CORREGIDA)
async function procesarChatIdentidades(seed){
  const raw = (seed || input?.value || '').trim();

  const v = validarEntrada(raw);
  if (!v.ok){
    Swal?.fire('Entrada inválida', v.reason || 'Revisá el formato.', 'warning');
    input?.focus?.();
    return;
  }
  if (v.type === 'phone' && input) input.value = v.value; // reflejar E.164

  // pedir al backend
  const resp = await fetch('/buscar_usuario_telefono/api/chat/identidad-buscar/', {
    method:'POST',
    headers:{ 'Content-Type':'application/json','Accept':'application/json' },
    credentials:'include',
    body: JSON.stringify({ q: v.value, type: v.type })
  });

  const text = await resp.text();
  let data; try { data = JSON.parse(text); } catch { data = { ok:false, error:text }; }

  if (!resp.ok || !data?.ok){
    Swal?.fire('Sin resultados', data?.error || 'No se encontró', 'info');
    renderChatAmbitos({ user:{}, ambitos:[] });
    return;
  }

  // ---- DEDUPE POR TEL ANTES DE PINTAR
  const tel = String(data?.user?.tel || '').trim();
  if (tel){
    const acc = document.querySelector('.id-accordion');
    const existing = acc?.querySelector(`.id-item[data-key="${tel}"]`);
    if (existing){
      // ya estaba → lo subo y salgo (NO re-insertar)
      acc.insertBefore(existing, acc.firstElementChild);
      return;
    }
  }


  
  // ✅ Cargar en caché + dedupe/promote + render + logs
  const r = cargarIdentidadEnCache(data, { promote:true, render:true });
  if (!r.ok) console.warn('[IDENTITY] no se pudo cachear:', r.reason, data);

  // ---- render (inserta SOLO si no existía)
  renderChatAmbitos(data);
  if (data.user) renderIdentityResult(data.user, { userKeyOverride: tel });
}


// --- cableado
btn?.addEventListener('click', (e)=>{
  e.preventDefault();
  const v = validarEntrada(input?.value || '');
  if (!v.ok){ input?.setCustomValidity?.(v.reason||''); input?.reportValidity?.(); return; }
  if (v.type !== 'phone'){ input?.setCustomValidity?.('Sólo E.164 (ej: +393445977100)'); input?.reportValidity?.(); return; }

  if (dedupeAndPromoteByTel(v.value)) { input?.setCustomValidity?.(''); return; } // ya estaba

  input?.setCustomValidity?.('');
  procesarChatIdentidades(v.value); // solo si no estaba
});






// --- Validación E.164 básica (+ y 8..15 dígitos)
function toE164(raw){
  if (!raw) return { ok:false, reason:'Vacío' };

  // limpiar: dejar sólo + y dígitos; remover '+' que no sea el primero
  let s = String(raw).trim().replace(/[^\d+]/g, '');
  s = s.replace(/(?!^)\+/g, '');
  if (!s.startsWith('+')) return { ok:false, reason:'El teléfono debe iniciar con “+” (formato E.164).' };

  // colapsar a + y sólo dígitos
  const digits = s.replace(/\D/g, '');
  const e164   = '+' + digits;

  // regla general E.164: máx 15 dígitos (sin contar el '+'), mínimo razonable 8
  if (digits.length < 8 || digits.length > 15){
    return { ok:false, reason:`Longitud no válida (${digits.length}). Debe tener entre 8 y 15 dígitos.` };
  }

  // Caso AR opcional: si viniera con '15' en el local (raro si ya trae +54 9)
  // if (digits.startsWith('54') && /15/.test(digits.slice(2))) { ... } // dejaríamos tal cual por ahora

  return { ok:true, value:e164 };
}

// --- Valida el input si es teléfono. Devuelve {ok, valueOrRaw}
function validarEntrada(raw){
  const s = String(raw||'').trim();
  if (!s) return { ok:false, reason:'Ingrese algo para buscar.' };

  if (s.startsWith('+')) {
    const res = toE164(s);
    if (!res.ok) return res;
    return { ok:true, type:'phone', value:res.value };
  }
  if (s.startsWith('@')) {
    return { ok:true, type:'alias', value:s.slice(1) };
  }
  return { ok:true, type:'name', value:s };
}




input?.addEventListener('keydown', (e)=>{
  if (e.key === 'Enter'){
    const v = validarEntrada(input.value);
    if (!v.ok){
      e.preventDefault();
      input.setCustomValidity(v.reason||'');
      input.reportValidity();
      return;
    }
    if (v.type !== 'phone'){
      e.preventDefault();
      input.setCustomValidity('Sólo E.164 (ej: +393445977100)');
      input.reportValidity();
      return;
    }

    // si ya existe ese teléfono, deduplica y sube; no buscamos de nuevo
    if (dedupeAndPromoteByTel(v.value)) {
      e.preventDefault();
      input.setCustomValidity('');
      return;
    }

    input.setCustomValidity('');
    e.preventDefault();

    // 🔹 acá la llamás con seed:
    procesarChatIdentidades(v.value); // <-- PASAMOS EL TEL E.164
  }
});





// Encuentra, elimina duplicados del mismo teléfono y sube el primero
function findItemsByTel(tel){
  const wrap = document.querySelector('.id-accordion');
  if (!wrap) return [];
  const items = Array.from(wrap.querySelectorAll('.id-item'));
  const norm = String(tel||'').replace(/\s+/g,'');
  return items.filter(item=>{
    // 1) data-key
    const key = (item.getAttribute('data-key') || '').trim();
    if (key === tel) return true;

    // 2) data-scope en el summary
    const sum = item.querySelector('.id-summary');
    if (sum){
      try{
        const sc = JSON.parse(sum.getAttribute('data-scope') || '{}');
        if (sc?.tel === tel || sc?.phone === tel) return true;
      }catch{}
    }

    // 3) texto del campo teléfono
    const phoneEl = item.querySelector('.id-field');
    if (phoneEl){
      const txt = phoneEl.textContent.replace(/\s+/g,'');
      if (txt.includes(norm)) return true;
    }
    return false;
  });
}

function dedupeAndPromoteByTel(tel){
  const items = findItemsByTel(tel);
  if (!items.length) return false;

  const wrap = document.querySelector('.id-accordion');
  const first = items[0];

  // eliminar duplicados
  for (let i=1;i<items.length;i++) items[i].remove();

  // asegurar data-key y subir al tope
  first.setAttribute('data-key', tel);
  if (wrap) wrap.insertBefore(first, wrap.firstElementChild);

  return true; // ya existía, no hay que volver a buscar ni reinsertar
}



// ==== Infra mínima (si ya la tenés, no dupliques) ====

userKey = (u={}) => (u.tel || u.alias || u.nombre || '').trim();

function promoteIfExistsByTel(telE164){
  if (!telE164) return false;
  const acc = document.querySelector('.id-accordion');
  const node = acc?.querySelector(`.id-item[data-key="${telE164}"]`);
  if (!node) return false;
  acc.insertBefore(node, acc.firstElementChild);
  return true;
}

// ==== FUNCIÓN CON LOGS ====
/**
 * Carga identidad en caché, dedupe por tel y renderiza. Loggea todo.
 */
function cargarIdentidadEnCache(data, opts = {}){
  const { promote = true, render = true } = opts;
 
  if (!data || !data.user){
    console.warn('[IDENTITY] ❌ respuesta sin user', data);
    return { ok:false, reason:'respuesta sin user' };
  }

  const tel = String(data.user.tel || '').trim();
  const k = userKey(data.user);
  if (!k){
    console.warn('[IDENTITY] ❌ no hay key (tel/alias/nombre)', data.user);
    return { ok:false, reason:'no hay key (tel/alias/nombre)' };
  }

  console.groupCollapsed('%c[IDENTITY] cache/upsert', 'color:#0366d6;font-weight:600;');
  console.log('key:', k);
  console.log('tel:', tel || '—');
  console.log('nombre:', data.user.nombre || '—');
  console.log('alias:', data.user.alias || '—');

  if (promote){
    const promoted = promoteIfExistsByTel(tel);
    console.log('promote in DOM:', promoted);
  }

  // cache + activa
  identityCache.set(k, data);
  window.IdentityCachePersist?.();
  console.log('✅ cacheado:', true);

  try { setActiveIdentity?.(k); console.log('setActiveIdentity:', true); }
  catch(e){ console.warn('setActiveIdentity error:', e); }

  // resumen de payload
  const pubs = Array.isArray(data.publicaciones) ? data.publicaciones.length : 0;
  const ambs = Array.isArray(data.ambitos) ? data.ambitos.length : 0;
  const cps  = Array.isArray(data.codigos_postales) ? data.codigos_postales.length : 0;
  const idi  = Array.isArray(data.idiomas) ? data.idiomas.length : 0;
  console.log('resumen:', { publicaciones: pubs, ambitos: ambs, codigos_postales: cps, idiomas: idi });

  // dump corto (no saturar consola)
  console.log('user:', data.user);
  if (pubs) console.table(data.publicaciones.map(p => ({
    id: p.id, titulo: p.titulo, ambito: p.ambito, idioma: p.idioma, cp: p.codigo_postal, estado: p.estado
  })));
  if (ambs) console.table(data.ambitos.map(a => ({
    nombre: a?.nombre, valor: a?.valor || '', estado: a?.estado || ''
  })));

  if (render){
    console.log('render:', true);
    
    renderChatAmbitos(data);
    renderIdentityResult?.(data.user, { userKeyOverride: tel || k });
  } else {
    console.log('render:', false);
  }

  console.groupEnd();
  return { ok:true, key:k };
}

// ==== Helper opcional para ver el caché rápido ====
window.debugIdentityCache = function(labelOrScope = ''){
  const k = typeof labelOrScope === 'string' ? labelOrScope : userKey(labelOrScope || {});
  const data = k ? identityCache.get(k) : undefined;
  console.groupCollapsed('[CACHE peek]', k || '(sin key)');
  if (!data){ console.log('NO DATA'); console.groupEnd(); return; }
  console.log('user:', data.user);
  console.log('keys:', Object.keys(data));
  console.log('counts:', {
    publicaciones: data.publicaciones?.length || 0,
    ambitos: data.ambitos?.length || 0,
    codigos_postales: data.codigos_postales?.length || 0,
    idiomas: data.idiomas?.length || 0
  });
  console.groupEnd();
};




// ==== Bootstrap desde el contexto del embed (viewer_*) ====
function bootstrapFromUrlContext(){
  try{
    const params = new URLSearchParams(window.location.search || '');
    const viewerTel = (params.get('viewer_tel') || '').trim();

    if (!viewerTel){
      console.debug('[CHAT/bootstrap] sin viewer_tel en URL, no auto-busco');
      return;
    }

    console.debug('[CHAT/bootstrap] viewer_tel desde URL:', viewerTel);

    // Si ya existe en el DOM, sólo lo subimos y listo
    if (dedupeAndPromoteByTel(viewerTel)){
      console.debug('[CHAT/bootstrap] identidad ya estaba en el DOM, sólo promote');
      return;
    }

    // Caso normal: disparamos la búsqueda como si hubieras escrito el teléfono
    if (input){
      input.value = viewerTel; // refleja en la UI por si querés verlo
    }

    const v = validarEntrada(viewerTel);
    if (!v.ok){
      console.warn('[CHAT/bootstrap] viewer_tel inválido:', v.reason);
      return;
    }
    if (v.type !== 'phone'){
      console.warn('[CHAT/bootstrap] viewer_tel no detectado como phone, type=', v.type);
      return;
    }

    // Llamamos a la función de siempre, pero pasándole el seed
    procesarChatIdentidades(v.value);

  } catch(e){
    console.warn('[CHAT/bootstrap] error leyendo contexto de URL', e);
  }
}


document.addEventListener('DOMContentLoaded', () => {
  console.log('[CHAT] DOMContentLoaded buscarUsuarioTelefono.js');
  bootstrapFromUrlContext();
});
