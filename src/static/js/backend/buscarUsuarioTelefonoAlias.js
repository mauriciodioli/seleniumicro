function findPersonalMicrositeFromData(data) {
  if (!data) return null;
  const pubs = Array.isArray(data.publicaciones) ? data.publicaciones : [];
  if (!pubs.length) return null;

  const PERSONAL_AMBITOS = ['personal', 'Personal', 'Osobisty']; // ajustá según tus datos reales

  // 1) buscar por ámbito "personal"
  const found = pubs.find(p =>
    PERSONAL_AMBITOS.includes(String(p.ambito || '').trim())
  );
  if (found) return found;

  // 2) fallback: la primera publicación (para no dejar vacío)
  return pubs[0] || null;
}


function cacheMicrositioPersonal(key, tel, pub) {
  try {
    const cacheKey = key || tel;
    if (!cacheKey || !pub) return;

    const data = identityCache.get(cacheKey) || {};
    data.micrositio_personal = pub;     // <- como ya hacías
    identityCache.set(cacheKey, data);
    window.IdentityCachePersist?.();    // graba en localStorage
  } catch (e) {
    console.warn('[Identity] No se pudo cachear micrositio_personal:', e);
  }
}


function renderIdentityResult(
  user = {},
  {
    userKeyOverride = null,
  } = {}
) {
  const acc = document.querySelector('.id-accordion');
  const tel = String(user?.tel || '').trim();
  if (!acc || !tel) return;

  const key = userKeyOverride || tel;

  const existing = acc.querySelector(`.id-item[data-key="${key}"]`);
  if (existing) {
    acc.insertBefore(existing, acc.firstElementChild);
    return;
  }

  const alias = buildAliasFromUser(user);
  user.alias = alias;

  const j = (obj) => JSON.stringify(obj || {});
  const displayName = user.nombre || alias || 'Usuario';

  // ============================================
  // 🔹 1) Intentar resolver micrositio desde identityCache
  //     y guardar en cache + localStorage ANTES de leer dpia.identityCache.v1
  // ============================================
  let micrositeId = null;

  try {
    const cacheData = (typeof identityCache !== 'undefined')
      ? (identityCache.get(key) || identityCache.get(tel))
      : null;

    if (cacheData) {
      // Si todavía no tiene micrositio_personal, lo intentamos deducir
      if (!cacheData.micrositio_personal && typeof findPersonalMicrositeFromData === 'function') {
        const pub = findPersonalMicrositeFromData(cacheData);
        if (pub && pub.id) {
          cacheData.micrositio_personal = pub;
          identityCache.set(key, cacheData);
          window.IdentityCachePersist?.(); // ⬅️ aquí se escribe dpia.identityCache.v1
        }
      }

      // Si ya hay micrositio_personal con id, lo usamos directamente
      if (cacheData.micrositio_personal && cacheData.micrositio_personal.id) {
        micrositeId = cacheData.micrositio_personal.id;
      }
    }
  } catch (e) {
    console.warn('[Identity] Error usando identityCache:', e);
  }

  // ============================================
  // 🔹 2) Si todavía no tenemos micrositeId, leemos dpia.identityCache.v1
  // ============================================
  if (!micrositeId) {
    try {
      const raw = localStorage.getItem('dpia.identityCache.v1');
      if (raw) {
        const cache = JSON.parse(raw);              // { "+5493814068533": { ... }, ... }
        const entry = cache[key] || cache[tel];     // usamos key o tel como fallback
        if (entry && entry.micrositio_personal && entry.micrositio_personal.id) {
          micrositeId = entry.micrositio_personal.id;  // ej: 369
        }
      }
    } catch (e) {
      console.warn('[Identity] No se pudo leer dpia.identityCache.v1:', e);
    }
  }

  const micrositeUrl = micrositeId ? `https://dpia.site/${micrositeId}` : '';

  const html = `
    <details class="id-item" data-key="${key}">
      <summary class="id-summary" data-scope='${j({ tel, user_id: user.id })}'>
        <button type="button" class="id-chev-btn" aria-label="Abrir/cerrar">▶</button>
        <span class="id-name" data-goto="amb-card">👤 ${displayName}</span>
        <span class="id-badge" data-goto="chat">${user.last_msg || '▶'}</span>
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
        ${
          micrositeUrl
            ? `<span class="id-field">
                 🌐 <a href="${micrositeUrl}" target="_blank" rel="noopener">
                      ${micrositeUrl}
                    </a>
               </span>`
            : ''
        }
      </div>
      <div class="id-actions">
        <button class="btn btn-accent" data-goto="chat"
                onclick="window.chatHere?.(this)">Chatear aquí</button>
        <button class="btn btn-ghost"
                type="button"
                data-tel="${tel}"
                onclick="window.openWhatsAppFromIdentity?.(this)">
          WhatsApp
        </button>
      </div>
    </details>
  `.trim();

  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  acc.insertBefore(tmp.firstElementChild, acc.firstElementChild);
}

// helper para WhatsApp (si todavía no lo tenés)
window.openWhatsAppFromIdentity = function (btn) {
  const tel = (btn.dataset.tel || '').trim();
  if (!tel) return;

  const clean = tel.replace(/[^+\d]/g, '');
  const number = clean.replace(/^\+/, '');
  const url = `https://wa.me/${number}`;
  window.open(url, '_blank');
};





window.openPersonalMicrosite = function (el) {
  const key = el.dataset.key || '';
  if (!key) {
    console.warn('[ALIAS] sin data-key en el botón');
    return;
  }

  const data = identityCache.get(key);
  if (!data) {
    console.warn('[ALIAS] no hay data en identityCache para key:', key);
    return;
  }

  console.groupCollapsed('[ALIAS click] identityCache data', key);
  console.log(data);
  console.groupEnd();

  // 1) Intentar usar micrositio ya calculado
  let pub = data.micrositio_personal || null;

  // 2) Si no está, lo deducimos de las publicaciones
  if (!pub) {
    pub = findPersonalMicrositeFromData(data);
  }

  // 3) Si sigue sin haber publicaciones, creamos una VIRTUAL en memoria
  if (!pub) {
    const user = data.user || {};
    const idiomas = Array.isArray(data.idiomas) ? data.idiomas : [];
    const pubs = Array.isArray(data.publicaciones) ? data.publicaciones : [];
    const cps = Array.isArray(data.codigos_postales) ? data.codigos_postales : [];

    const idioma = idiomas[0] || 'es';
    const cp = pubs[0]?.codigo_postal || cps[0] || '';

    pub = {
      id: `virtual-${user.id || key}`,
      titulo: `Micrositio personal de ${user.nombre || user.correo_electronico || user.alias || ''}`.trim(),
      ambito: 'personal',
      categoria_id: null,
      idioma,
      imagen: null,
      descripcion: 'Micrositio personal generado automáticamente.',
      codigo_postal: cp,
      estado: 'virtual',
      fecha_creacion: new Date().toISOString(),
    };
  }

  // 4) Guardamos la elección en cache para próximas veces
  data.micrositio_personal = pub;
  identityCache.set(key, data);
  window.IdentityCachePersist?.();

  // 5) Pintar en el panel de ámbitos (vistaChatAmbitos)
  const cont = document.getElementById('vistaChatAmbitos');
    if (!cont) {
    console.warn('[ALIAS] no existe #vistaChatAmbitos en el DOM');
    return;
    }

    const fecha = pub.fecha_creacion
    ? new Date(pub.fecha_creacion).toLocaleString()
    : '';

    cont.innerHTML = `
    <article class="ambito-card-personal">
        <header class="ambito-card-personal__head">
        <p class="ambito-card-personal__tag">Micrositio personal</p>
        <h3 class="ambito-card-personal__title">${pub.titulo || 'Micrositio personal'}</h3>
        <p class="ambito-card-personal__meta">
            <span>Ámbito: <strong>${pub.ambito || 'personal'}</strong></span>
            <span>Idioma: <strong>${pub.idioma || ''}</strong></span>
            ${pub.codigo_postal ? `<span>CP: <strong>${pub.codigo_postal}</strong></span>` : ''}
        </p>
        </header>

        <section class="ambito-card-personal__body">
        ${pub.descripcion ? `<p class="ambito-card-personal__desc">${pub.descripcion}</p>` : ''}
        ${pub.imagen ? `
            <div class="ambito-card-personal__media">
            <img src="${pub.imagen}" alt="${pub.titulo || ''}" loading="lazy">
            </div>` : ''
        }
        </section>

        <footer class="ambito-card-personal__foot">
        ${fecha ? `<span class="ambito-card-personal__date">Creado: ${fecha}</span>` : ''}
        </footer>
    </article>
    `;


  // si tenés focusRightPanel para mobile, lo podés llamar aquí
  if (typeof focusRightPanel === 'function') {
    focusRightPanel();
  }
};
