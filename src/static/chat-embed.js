// chat-embed.js
(function () {
  // ===== Meta & script actual =====
  const VERSION = '2025-11-18';
  console.debug('[dpia-chat-embed] loaded', VERSION);

  const SCRIPT = document.currentScript || (function () {
    const ss = document.getElementsByTagName('script');
    return ss[ss.length - 1] || null;
  })();

  if (!SCRIPT) {
    console.warn('[dpia-chat-embed] no SCRIPT tag found');
    return;
  }

  const attr = (el, n) => el && el.getAttribute ? el.getAttribute(n) : null;

  const origin = (SCRIPT && SCRIPT.src)
    ? new URL(SCRIPT.src).origin
    : location.origin;

  // Ruta interna del chat embebido
  const chatPath = attr(SCRIPT, 'data-chat-path') || '/chat/contextual-embed';

  // Modo de apertura: "panel" (defecto) o "tab"
  const openMode = (attr(SCRIPT, 'data-open') || 'panel').toLowerCase();

  // Parámetros opcionales de contexto (mock / overrides)
  const defaultDomain        = attr(SCRIPT, 'data-dominio') || attr(SCRIPT, 'data-domain') || '';
  const defaultLang          = attr(SCRIPT, 'data-lang') || document.documentElement.lang || 'es';
  const defaultCp            = attr(SCRIPT, 'data-cp') || '';
  const defaultOwnerId       = attr(SCRIPT, 'data-owner-id') || '';
  const defaultOwnerEmail    = attr(SCRIPT, 'data-owner-email') || '';
  const defaultPublicationId = attr(SCRIPT, 'data-publicacion-id') ||
                               attr(SCRIPT, 'data-publication-id') || '';
  const defaultCategoriaId   = attr(SCRIPT, 'data-categoria-id') || '';

  console.debug('[dpia-chat-embed] origin=', origin, 'chatPath=', chatPath, 'openMode=', openMode);
// ¿Estoy en un micrositio (detalle de una publicación)?
function isMicrositeContext() {
  const path = (location.pathname || '').toLowerCase();

  // Ejemplo actual: /1029/layout/22  → true
  // Podés ajustar este regex si cambian tus URLs
  if (/\d+\/layout(\/|$)/.test(path)) {
    return true;
  }

  // Si en algún caso querés forzar desde el tag:
  // <script data-force-publicacion="true" ...>
  const force = attr(SCRIPT, 'data-force-publicacion');
  if (force && force.toLowerCase() === 'true') {
    return true;
  }

  return false;
}

  // =========================================================
  //  LECTURA DEL CONTEXTO REAL DE DPIA (LOCALSTORAGE + COOKIES)
  // =========================================================
  function getDpiaContext() {
    const ctx = {
      // quién está logeado (viewer)
      viewer_user_id: '',
      viewer_email: '',
      viewer_tel: '',
      // ámbito actual
      dominio: '',
      dominio_id: '',
      categoria_id: '',
      cp: '',
      lang: '',
      // publicación actual
      publication_id: ''
    };

    try {
      const ls = window.localStorage;

      if (ls) {
        // Usuario logeado
        ctx.viewer_user_id = ls.getItem('usuario_id') || '';
        ctx.viewer_email   = ls.getItem('correo_electronico') || '';
        ctx.viewer_tel     = ls.getItem('numTelefono:22') ||
                             ls.getItem('numTelefono') || '';

        // Ámbito
        ctx.dominio        = ls.getItem('dominio') || '';
        ctx.dominio_id     = ls.getItem('dominio_id') || '';
        ctx.categoria_id   = ls.getItem('categoriaSeleccionadaId') ||
                             ls.getItem('categoria') || '';
        ctx.cp             = ls.getItem('codigoPostal') || '';
        ctx.lang           = ls.getItem('language') || '';
      }

      // Cookies: dominio, CP, publicación, idioma
      document.cookie.split(';').forEach(p => {
        const [kRaw, vRaw] = p.split('=');
        if (!kRaw) return;
        const k = kRaw.trim();
        const v = (vRaw || '').trim();
        if (!k) return;

        if (k === 'publicacion_id') {
          ctx.publication_id = v;
        }
        if (k === 'dominio_id' && !ctx.dominio_id) {
          ctx.dominio_id = v;
        }
        if (k === 'dominio' && !ctx.dominio) {
          try { ctx.dominio = decodeURIComponent(v); }
          catch { ctx.dominio = v; }
        }
        if (k === 'codigoPostal' && !ctx.cp) {
          ctx.cp = v;
        }
        if (k === 'language' && !ctx.lang) {
          ctx.lang = v;
        }
      });
    } catch (e) {
      console.warn('[dpia-chat-embed] error leyendo contexto DPIA', e);
    }

    return ctx;
  }

  // ===== URL del chat con contexto =====
 function buildChatUrl() {
  const params = new URLSearchParams();
  const ctx = getDpiaContext();

  // --- ámbito / idioma / CP ---
  const dominio = ctx.dominio || defaultDomain;
  const lang    = ctx.lang    || defaultLang;
  const cp      = ctx.cp      || defaultCp;

  if (dominio) params.set('dominio', dominio);
  if (lang)    params.set('lang', lang);
  if (cp)      params.set('cp', cp);

  if (ctx.dominio_id) {
    params.set('dominio_id', ctx.dominio_id);
  }

  // --- categoría / publicación ---
  // Solo mandamos publication_id cuando:
  //  - estamos en micrositio, o
  //  - hay un data-publicacion-id explícito en el <script>
  const inMicrosite = isMicrositeContext();
  const publicationIdFromCtx   = ctx.publication_id || '';
  const publicationIdFromData  = defaultPublicationId || '';

  const shouldSendPublication =
    inMicrosite || !!publicationIdFromData;

  const publicationId = shouldSendPublication
    ? (publicationIdFromCtx || publicationIdFromData)
    : '';

  if (publicationId) {
    params.set('publication_id', publicationId);
  }

  // La categoría sí la podemos mandar siempre si existe,
  // porque no es ambigua como la publicación concreta.
  const categoriaId = ctx.categoria_id || defaultCategoriaId;
  if (categoriaId) {
    params.set('categoria_id', categoriaId);
  }

  // --- OWNER opcional (caso Ola, etc) ---
  if (defaultOwnerId)    params.set('owner_user_id', defaultOwnerId);
  if (defaultOwnerEmail) params.set('owner_email', defaultOwnerEmail);

  // --- VIEWER = usuario logeado en DPIA (vos) ---
  if (ctx.viewer_user_id) params.set('viewer_user_id', ctx.viewer_user_id);
  if (ctx.viewer_email)   params.set('viewer_email', ctx.viewer_email);
  if (ctx.viewer_tel)     params.set('viewer_tel', ctx.viewer_tel);

  const base = origin + chatPath;
  const qs   = params.toString();
  const url  = qs ? `${base}?${qs}` : base;

  console.debug('[dpia-chat-embed] chat URL:', url, 'ctx=', ctx, 'inMicrosite=', inMicrosite);
  return url;
}


  // ===== Estilos SOLO si usamos panel flotante =====
  function createStyles() {
    if (document.getElementById('dpia-chat-embed-style')) return;

    const style = document.createElement('style');
    style.id = 'dpia-chat-embed-style';
    style.textContent = `
      .dpia-chat-launcher {
        position: fixed;
        right: 96px;
        bottom: 16px;
        width: 52px;
        height: 52px;
        border-radius: 50%;
        border: none;
        background: #00bcd4;
        color: #001018;
        font-size: 26px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,.35);
        cursor: pointer;
        z-index: 999999;
      }

      .dpia-chat-launcher:hover {
        background: #00d0ea;
      }

      .dpia-chat-panel {
        position: fixed;
        right: 16px;
        bottom: 80px;
        width: min(420px, 100vw - 32px);
        height: min(560px, 100vh - 120px);
        max-height: 90vh;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 8px 24px rgba(0,0,0,.45);
        background: #000;
        display: none;
        flex-direction: column;
        z-index: 999998;
      }

      .dpia-chat-panel__header {
        flex: 0 0 auto;
        height: 38px;
        background: #020617;
        color: #e5f6ff;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 10px;
        font: 500 13px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .dpia-chat-panel__header span {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .dpia-chat-panel__close {
        border: none;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font-size: 16px;
      }

      .dpia-chat-panel__body {
        flex: 1 1 auto;
        background: #020617;
      }

      .dpia-chat-panel__iframe {
        width: 100%;
        height: 100%;
        border: none;
      }

      @media (max-width: 600px) {
        .dpia-chat-panel {
          right: 8px;
          left: 8px;
          width: auto;
          bottom: 72px;
        }
        .dpia-chat-launcher {
          right: 88px;
          bottom: 12px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ===== Panel flotante (solo si openMode = panel) =====
  function createPanel() {
    if (document.getElementById('dpia-chat-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'dpia-chat-panel';
    panel.className = 'dpia-chat-panel';

    const header = document.createElement('div');
    header.className = 'dpia-chat-panel__header';

    const left = document.createElement('span');
    left.innerHTML = '<span style="font-size:16px">✨</span><span>DPIA · Chat contextual</span>';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'dpia-chat-panel__close';
    closeBtn.type = 'button';
    closeBtn.innerHTML = '✖';
    closeBtn.addEventListener('click', () => {
      hidePanel();
    });

    header.appendChild(left);
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'dpia-chat-panel__body';

    const iframe = document.createElement('iframe');
    iframe.className = 'dpia-chat-panel__iframe';
    iframe.src = buildChatUrl();
    iframe.allow = 'microphone; camera; clipboard-read; clipboard-write';

    body.appendChild(iframe);
    panel.appendChild(body);
    panel.appendChild(header); // si querés, invertí el orden; da igual para el contexto

    document.body.appendChild(panel);
  }

  function showPanel() {
    const panel = document.getElementById('dpia-chat-panel');
    if (!panel) return;
    panel.style.display = 'flex';
  }

  function hidePanel() {
    const panel = document.getElementById('dpia-chat-panel');
    if (!panel) return;
    panel.style.display = 'none';
  }

  function togglePanel() {
    const panel = document.getElementById('dpia-chat-panel');
    if (!panel) return;
    const visible = panel.style.display === 'flex';
    if (visible) hidePanel();
    else showPanel();
  }

  // ===== Botón flotante (siempre) =====
  function createLauncher() {
    if (document.getElementById('dpia-chat-launcher')) return;

    const btn = document.createElement('button');
    btn.id = 'dpia-chat-launcher';
    btn.className = 'dpia-chat-launcher';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Abrir chat DPIA');
    btn.innerHTML = '💬';

    btn.addEventListener('click', () => {
      const url = buildChatUrl();

      if (openMode === 'tab') {
        // En pestaña nueva (modo que estás usando ahora)
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        // Modo panel flotante
        togglePanel();
      }
    });

    document.body.appendChild(btn);
  }

  // ===== Init =====
  function init() {
    if (openMode === 'panel') {
      createStyles();
      createPanel();
    } else {
      // En modo "tab" no creamos panel ni iframe, solo usamos el botón
      createStyles();
    }
    createLauncher();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
