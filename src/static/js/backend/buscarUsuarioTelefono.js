// static/js/chats/buscarUsuarioTelefono.js
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
      const resp = await fetch('/api/chat/identidad-buscar', {
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

  function renderIdentityResult(user) {
    const scope = {
      micrositio: user.micrositio,
      idioma: user.idioma,
      alias: user.alias,
      tel: user.tel
    };

    const html = `
    <details class="id-item id-from-search" open>
      <summary class="id-summary" data-scope='${JSON.stringify(scope)}'>
        <button type="button" class="id-chev-btn" aria-label="Abrir/cerrar">▶</button>
        <span class="id-name" data-goto="amb-card">👤 ${user.nombre || user.alias || 'Usuario'}</span>
        <span class="id-badge" data-goto="chat">${user.last_msg || '—'}</span>
      </summary>
      <div class="id-body">
        ${user.tel   ? `<span class="id-field">📞 ${user.tel}</span>` : ''}
        ${user.alias ? `<span class="id-field">@${user.alias}</span>` : ''}
        ${user.url   ? `<span class="id-field">🌐 ${user.url}</span>` : ''}
      </div>
      <div class="id-actions">
        <button class="btn btn-accent" data-goto="chat"
            data-scope='${JSON.stringify(scope)}'
            onclick="chatHere(this)">Chatear aquí</button>
        <button class="btn btn-ghost" onclick="Swal.fire('Contacto','WhatsApp habilitado','success')">Abrir WhatsApp</button>
      </div>
    </details>
    `;

    const old = list.querySelector('.id-from-search');
    if (old) old.remove();

    const temp = document.createElement('div');
    temp.innerHTML = html.trim();
    list.prepend(temp.firstElementChild);
  }

  // ================== NUEVO: render de ÁMBITOS en MyDomain ==================
  function renderMyDomainAmbitos(ambitos) {
    // tu panel está en chats/mydomain/chatDominios.html
    debugger;
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
      resp = await fetch('/api/chat/identidad-buscar', {
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
function renderIdentityResult(user = {}, { dedupe = true, maxItems = 50 } = {}) {
  if (!acc) return;

  const scope = {
    micrositio: user.micrositio || '',
    idioma: user.idioma || (Array.isArray(user.idiomas) ? user.idiomas[0] : ''),
    alias: user.alias || '',
    tel: user.tel || ''
  };

  const key = (user.alias ? 'a:' + String(user.alias).toLowerCase().replace(/^@/,'')
             : user.tel   ? 't:' + String(user.tel).replace(/\D/g,'')
             : null);

  if (dedupe && key) {
    const exists = acc.querySelector(`.id-item[data-key="${key}"]`);
    if (exists) return; // ya está en la lista → no duplico
  }

  const html = `
  <details class="id-item" ${key ? `data-key="${key}"` : ''}>
    <summary class="id-summary" data-scope='${j(scope)}'>
      <button type="button" class="id-chev-btn" aria-label="Abrir/cerrar">▶</button>
      <span class="id-name" data-goto="amb-card">👤 ${cap(user.nombre || user.alias || 'Usuario')}</span>
      <span class="id-badge" data-goto="chat">${user.last_msg || '—'}</span>
    </summary>
    <div class="id-body">
      ${user.tel   ? `<span class="id-field">📞 ${user.tel}</span>` : ''}
      ${user.alias ? `<span class="id-field">@${String(user.alias).replace(/^@/,'')}</span>` : ''}
      ${user.url   ? `<span class="id-field">🌐 ${user.url}</span>` : ''}
    </div>
    <div class="id-actions">
      <button class="btn btn-accent" data-goto="chat"
              data-scope='${j(scope)}'
              onclick="window.chatHere?.(this)">Chatear aquí</button>
      <button class="btn btn-ghost"
              onclick="window.Swal?.fire('Contacto','WhatsApp habilitado','success')">Abrir WhatsApp</button>
    </div>
  </details>`.trim();

  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const node = tmp.firstElementChild;

  // 👉 Insertar al INICIO (lo nuevo arriba, lo viejo baja)
  const firstItem = acc.querySelector('.id-item');
  acc.insertBefore(node, firstItem || acc.firstChild);

  // (Opcional) limitar cantidad: borra los más viejos al final
  const items = acc.querySelectorAll('.id-item');
  if (items.length > maxItems) {
    for (let i = maxItems; i < items.length; i++) items[i].remove();
  }
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
        slug: `cat_${id}`,
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
  const user   = payload?.user || {};
  const ambs   = _enrichAmbitosWithCategorias(payload);
  const idioma = payload?.idiomas?.[0] || user.idioma || 'es';
  const cp     = payload?.codigos_postales?.[0] || user.cp || '—';
  const alias  = user.alias || '@User';
  const tel    = user.tel   || '';

  if (!ambs.length){
    target.innerHTML = `<div class="amb-accordion"><p style="padding:8px">Sin ámbitos para mostrar.</p></div>`;
    // igual forzamos contenedor para que no “salte”
    _ensureScrollable(target);
    return;
  }

  let html = `<div class="amb-accordion">`;
  for (const a of ambs){
    const nombre = a?.nombre || a?.valor || '—';
    const ambKey = slug(nombre);
    const badge  = (a?.estado || 'activo').toLowerCase();
    const scopeSummary = { ambito: ambKey, idioma: a?.idioma || idioma, alias, tel };

    const cats = Array.isArray(a?.categorias) ? a.categorias : [];
    const catsHtml = cats.map(c=>{
      const cname = c?.nombre || c?.valor || '—';
      const ckey  = slug(c?.slug || c?.id || cname);
      const scopeCat = { ambito: ambKey, categoria: ckey, cp, idioma: a?.idioma || idioma };
      return `
        <div class="amb-subcard">
          <div class="amb-subcard-head">
            <span>${cap(cname)}</span>
            <button class="btn" data-goto="chat"
                    data-scope='${j(scopeCat)}'
                    onclick="window.chatHere?.(this)">Chatear en ${cap(cname)}</button>
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

        <summary class="amb-section-summary"><span class="amb-section-title">Categorías</span></summary>
        <div class="amb-subcards">${catsHtml}</div>
      </details>`;
  }
  html += `</div>`;
  target.innerHTML = html;

  // 2) Forzamos que el contenedor sea scrolleable sin tocar tus CSS
  _ensureScrollable(target);
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
async function procesarChatIdentidades(){
  const raw = (input?.value || '').trim();

  const v = validarEntrada(raw);
  if (!v.ok){
    Swal?.fire('Entrada inválida', v.reason || 'Revisá el formato.', 'warning');
    input?.focus();
    return;
  }

  // si es teléfono, reflejamos el normalizado en el input (opcional)
  if (v.type === 'phone' && input) input.value = v.value;

  const resp = await fetch('/api/chat/identidad-buscar', {
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

  renderChatAmbitos(data);
  if (data.user) renderIdentityResult(data.user);
  if (typeof renderMyDomainAmbitos === 'function' && Array.isArray(data.ambitos)) renderMyDomainAmbitos(data.ambitos);
  if (typeof renderMyDomainPublicaciones === 'function' && Array.isArray(data.publicaciones)) renderMyDomainPublicaciones(data.publicaciones);
  if (typeof renderMetaBadges === 'function' && (data.codigos_postales || data.idiomas))
    renderMetaBadges(data.codigos_postales || [], data.idiomas || []);
}


// --- cableado
btn?.addEventListener('click', (e)=>{ e.preventDefault(); procesarChatIdentidades(); });
input?.addEventListener('keydown', (e)=>{
  if (e.key === 'Enter'){ e.preventDefault(); procesarChatIdentidades(); }
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


btn?.addEventListener('click', (e)=>{
  const v = validarEntrada(input.value);
  if (!v.ok){ e.preventDefault(); input.setCustomValidity(v.reason||''); input.reportValidity(); return; }
  input.setCustomValidity('');
  procesarChatIdentidades();
});

input?.addEventListener('keydown', (e)=>{
  if (e.key === 'Enter'){
    const v = validarEntrada(input.value);
    if (!v.ok){ e.preventDefault(); input.setCustomValidity(v.reason||''); input.reportValidity(); return; }
    input.setCustomValidity('');
    e.preventDefault();
    procesarChatIdentidades();
  }
});
