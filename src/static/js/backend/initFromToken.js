document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1) Boot desde cookie (si no existe, el backend la crea con mock)
    const res = await fetch('/api/boot', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) throw new Error('Boot no disponible');
    const boot = await res.json();
    window.chatBoot = boot; // debug opcional

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
      // si no vino en boot, limpiamos la lista
      const mdList = document.getElementById('mdList');
      if (mdList) mdList.innerHTML = '<p class="muted">Sin ámbitos por ahora.</p>';
    }

    // 4) Dispara la búsqueda inicial para poblar identidad/publicaciones
    // PRIORIDAD: teléfono → alias → email
    const u = boot.user || {};
    if (u.tel && window.BuscarUsuarioTelefono?.buscarBy) {
      await window.BuscarUsuarioTelefono.buscarBy('phone', u.tel);
    } else if (u.alias && window.BuscarUsuarioTelefono?.buscarBy) {
      await window.BuscarUsuarioTelefono.buscarBy('alias', String(u.alias).replace(/^@/, ''));
    } else if (u.email && window.BuscarUsuarioTelefono?.buscarBy) {
      // solo si tu backend soporta 'email'
      try { await window.BuscarUsuarioTelefono.buscarBy('email', u.email); } catch {}
    }

  } catch (e) {
    console.error('[initOnLoad] fallo al iniciar', e);
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