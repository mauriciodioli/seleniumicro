// chat-embed.js
(function () {
  // ===== Meta & script actual =====
  const VERSION = '2025-11-17';
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

  // Parámetros opcionales de contexto
  const defaultDomain = attr(SCRIPT, 'data-dominio') || attr(SCRIPT, 'data-domain') || '';
  const defaultLang   = attr(SCRIPT, 'data-lang') || document.documentElement.lang || 'es';
  const defaultCp     = attr(SCRIPT, 'data-cp') || '';

  // NUEVO: contexto de micrositio / publicación
  const defaultOwnerId      = attr(SCRIPT, 'data-owner-id') || '';
  const defaultOwnerEmail   = attr(SCRIPT, 'data-owner-email') || '';
  const defaultPublicationId= attr(SCRIPT, 'data-publicacion-id') ||
                              attr(SCRIPT, 'data-publication-id') || '';
  const defaultCategoriaId  = attr(SCRIPT, 'data-categoria-id') || '';


  console.debug('[dpia-chat-embed] origin=', origin, 'chatPath=', chatPath);

  // ===== Crear UI flotante =====
  function createStyles() {
    if (document.getElementById('dpia-chat-embed-style')) return;

    const style = document.createElement('style');
    style.id = 'dpia-chat-embed-style';
    style.textContent = `
      .dpia-chat-launcher {
        position: fixed;
        right: 16px;
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
          right: 12px;
          bottom: 12px;
        }
      }
    `;
    document.head.appendChild(style);
  }

   function buildChatUrl() {
    const params = new URLSearchParams();

    if (defaultDomain)      params.set('dominio', defaultDomain);
    if (defaultLang)        params.set('lang', defaultLang);
    if (defaultCp)          params.set('cp', defaultCp);

    if (defaultOwnerId)     params.set('owner_user_id', defaultOwnerId);
    if (defaultOwnerEmail)  params.set('owner_email', defaultOwnerEmail);
    if (defaultPublicationId) params.set('publication_id', defaultPublicationId);
    if (defaultCategoriaId) params.set('categoria_id', defaultCategoriaId);

    const base = origin + chatPath;
    const qs   = params.toString();
    return qs ? `${base}?${qs}` : base;
  }


  function createLauncher() {
    if (document.getElementById('dpia-chat-launcher')) return;

    const btn = document.createElement('button');
    btn.id = 'dpia-chat-launcher';
    btn.className = 'dpia-chat-launcher';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Abrir chat DPIA');
    btn.innerHTML = '💬';

    btn.addEventListener('click', () => {
      togglePanel();
    });

    document.body.appendChild(btn);
  }

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

    panel.appendChild(header);
    panel.appendChild(body);

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

  function init() {
    createStyles();
    createLauncher();
    createPanel();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
