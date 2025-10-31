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
  function renderMyDomainPublicaciones(publicaciones) {
    const cont = document.getElementById('mdContent');
    if (!cont) return;

    if (!publicaciones.length) {
      cont.innerHTML = `<p>No hay publicaciones recientes para este usuario.</p>`;
      return;
    }

    cont.innerHTML = `
      <div class="md-pubs">
        ${publicaciones.map(p => `
          <article class="md-pub">
            <h5>${p.titulo}</h5>
            <p class="md-pub-meta">
              <span>🧭 ${p.ambito || '—'}</span>
              <span>🌐 ${p.idioma || '—'}</span>
              <span>📍 ${p.codigo_postal || '—'}</span>
              <span>⚙️ ${p.estado || '—'}</span>
            </p>
            <button class="btn btn-sm"
                    data-goto="chat"
                    data-scope='${JSON.stringify({
                      ambito: p.ambito,
                      categoria_id: p.categoria_id,
                      cp: p.codigo_postal,
                      idioma: p.idioma,
                      publicacion_id: p.id
                    })}'
                    onclick="chatHere(this)">
              Chatear sobre esta publicación
            </button>
          </article>
        `).join('')}
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

  btn.addEventListener('click', buscar);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      buscar();
    }
  });
})();
