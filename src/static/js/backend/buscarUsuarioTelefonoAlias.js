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




function renderIdentityResult(user = {}, { userKeyOverride = null } = {}) {
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

  const html = `
    <details class="id-item" data-key="${key}">
      <summary class="id-summary" data-scope='${j({ tel, user_id: user.id })}'>
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
      </div>
      <div class="id-actions">
        <button class="btn btn-accent" data-goto="chat"
                onclick="window.chatHere?.(this)">Chatear aquí</button>
      </div>
    </details>
  `.trim();

  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  acc.insertBefore(tmp.firstElementChild, acc.firstElementChild);
}




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
        ${
          pub.imagen
            ? `
              <div class="ambito-card-personal__media">
                <img src="${pub.imagen}" alt="${pub.titulo || ''}" loading="lazy">
              </div>`
            : ''
        }
      </section>

      <footer class="ambito-card-personal__foot">
        ${fecha ? `<span class="ambito-card-personal__date">Creado: ${fecha}</span>` : ''}
      </footer>
    </article>
  `;

  // 🔹 En mobile: llevar foco al panel de ámbitos (medio)
  if (typeof focusAmbitosPanel === 'function') {
    focusAmbitosPanel();
  }

  // ❌ NO LLAMAR MÁS A focusRightPanel acá
  // if (typeof focusRightPanel === 'function') {
  //   focusRightPanel();
  // }
};


function focusAmbitosPanel() {
  const wrap  = document.querySelector('.my-domain-wrapper');
  const panel = document.getElementById('vistaChatAmbitos');
  if (!wrap || !panel) return;

  if (window.matchMedia('(max-width: 900px)').matches) {
    // scroll horizontal para que el panel del medio quede visible
    wrap.scrollTo({
      left: panel.offsetLeft,
      behavior: 'smooth',
    });

    // reseteamos el scroll vertical del panel
    panel.scrollTop = 0;
  }
}
