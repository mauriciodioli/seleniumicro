document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1) Boot desde DPIA (inyectado en window.chatBoot)
    const boot = window.chatBoot || window.DPIA_BOOT || null;
    if (!boot) {
      throw new Error('Boot no disponible: esperaba window.chatBoot o window.DPIA_BOOT');
    }
    window.chatBoot = boot; // por si vino con otro nombre

    // 2) Badge/contexto
    const badge = document.getElementById('ctxBadge');
    if (badge) {
      const u = boot.user || {};
      const s = boot.scope || {};
      badge.textContent = [
        u.alias || u.email || u.tel || 'usuario',
        s.ambito ? `· ${s.ambito}` : '',
        s.categoria ? `/${s.categoria}` : '',
        u.idioma ? `· ${u.idioma}` : '',
        u.cp ? `· CP ${u.cp}` : ''
      ].join(' ').replace(/\s+/g,' ').trim();
    }

    // 3) Render “Mis ámbitos” inmediatamente con lo que haya en boot
    if (Array.isArray(boot.ambitos)) {
      renderMyDomainAmbitosCompat(boot.ambitos);
    } else {
      const mdList = document.getElementById('mdList');
      if (mdList) {
        mdList.innerHTML = '<p class="muted">Sin ámbitos por ahora.</p>';
      }
    }

    // 4) Dispara la búsqueda inicial para poblar identidad/publicaciones
    // PRIORIDAD: teléfono → alias → email
    const user = boot.user || {};
    if (user.tel && window.BuscarUsuarioTelefono?.buscarBy) {
      await window.BuscarUsuarioTelefono.buscarBy('phone', user.tel);
    } else if (user.alias && window.BuscarUsuarioTelefono?.buscarBy) {
      await window.BuscarUsuarioTelefono.buscarBy('alias', String(user.alias).replace(/^@/, ''));
    } else if (user.email && window.BuscarUsuarioTelefono?.buscarBy) {
      try {
        await window.BuscarUsuarioTelefono.buscarBy('email', user.email);
      } catch (e) {
        console.warn('[initOnLoad] buscarBy(email) falló:', e);
      }
    }

  } catch (e) {
    console.error('[initOnLoad] fallo al iniciar con boot de DPIA', e);
    // opcional:
    // Swal.fire('Error', 'No se pudo iniciar el chat', 'error');
  }
});

/**
 * renderMyDomainAmbitosCompat:
 * Acepta dos formas de datos:
 * - FLAT mock: [{ ambito, categoria, idioma, cp, ... }]
 * - Jerárquica: [{ nombre, categorias:[{id,nombre}] }]
 */
function renderMyDomainAmbitosCompat(ambitos) {
  const mdList = document.getElementById('mdList');
  if (!mdList) return;

  // Limpia lo que haya (incluye tu markup de ejemplo)
  mdList.innerHTML = '';

  if (!Array.isArray(ambitos) || !ambitos.length) {
    mdList.innerHTML = '<p class="muted">No tenés ámbitos todavía.</p>';
    return;
  }

  // Detecta esquema
  const isFlat = ambitos.some(a => a.ambito && a.categoria && !a.categorias);

  let grouped = [];
  if (isFlat) {
    // Agrupa por ambito → set de categorías únicas
    const map = new Map();
    for (const a of ambitos) {
      const key = a.ambito || '(sin nombre)';
      const cat = String(a.categoria || '').trim() || '(sin categoría)';
      if (!map.has(key)) map.set(key, new Set());
      map.get(key).add(cat);
    }
    grouped = Array.from(map.entries()).map(([amb, catsSet]) => ({
      nombre: amb,
      categorias: Array.from(catsSet).map(c => ({ id: c, nombre: c }))
    }));
  } else {
    // Ya viene jerárquico
    grouped = ambitos.map(a => ({
      nombre: a.nombre || a.ambito || '(sin nombre)',
      categorias: Array.isArray(a.categorias) ? a.categorias : []
    }));
  }

  // Render
  for (const g of grouped) {
    const det = document.createElement('details');
    det.className = 'amb-item';
    det.setAttribute('data-ambito', g.nombre);

    const catsHtml = (g.categorias && g.categorias.length)
      ? `<ul class="md-cat-list">
           ${g.categorias.map(c => `
             <li>
               <button class="md-cat"
                       data-ambito="${escapeHtml(g.nombre)}"
                       data-categoria="${escapeHtml(c.id)}">
                 ${escapeHtml(c.nombre)}
               </button>
             </li>`).join('')}
         </ul>`
      : '<p class="muted">Sin categorías</p>';

    det.innerHTML = `
      <summary class="amb-summary">
        <span class="amb-name">${escapeHtml(g.nombre)}</span>
        <span class="amb-badge">${g.categorias?.length || 0} categorías</span>
      </summary>
      ${catsHtml}
    `;
    mdList.appendChild(det);
  }
}

// Helper mínimo para evitar inyectar HTML raro en nombres/cats
function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
