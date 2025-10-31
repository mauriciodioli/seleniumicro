// static/js/chats/buscarUsuarioTelefono.js

(function () {
  const input = document.getElementById('idSearch');
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

      if (!resp.ok || !data.ok) {
        Swal.fire('Sin resultados', data.error || 'No se encontró identidad', 'info');
        return;
      }

      renderIdentityResult(data.user);
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

  btn.addEventListener('click', buscar);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      buscar();
    }
  });
})();
