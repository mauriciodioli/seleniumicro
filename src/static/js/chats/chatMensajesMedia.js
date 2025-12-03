import {
  showImagePreview,
  enviarImagen,
  pendingImages,
  clearAllImagePreviews,
} from '../modulesMedia/imagenModule.js';

import {
  showVideoPreview,
  enviarVideo,
  pendingVideos,
  clearAllVideoPreviews,
} from '../modulesMedia/videoModule.js';


document.addEventListener('DOMContentLoaded', () => {
  console.log('[CHAT MEDIA] Archivo principal cargado');
  const btnAttach = document.getElementById('btnAttach');
  const fileInput = document.getElementById('fileInput');

  if (btnAttach && fileInput) {
    btnAttach.addEventListener('click', () => fileInput.click());
  }

      if (fileInput) {
      fileInput.multiple = true;

      fileInput.addEventListener('change', () => {
        const files = Array.from(fileInput.files || []);
        if (!files.length) return;

        for (const file of files) {
          if (file.type.startsWith('image/')) {
            showImagePreview(file);
          } else if (file.type.startsWith('video/')) {
            showVideoPreview(file);   // ✅ videos ya quedan en pendingVideos
          } else if (file.type.startsWith('audio/')) {
            showAudioPreview(file);
          }
        }
      });
    }

  // cuando el DOM está listo, envolvemos enviarTexto
  wrapEnviarTextoConMedia();
});
// ==================== WRAP DE enviarTexto ====================
function wrapEnviarTextoConMedia() {
  const originalEnviarTexto = window.enviarTexto;

  if (typeof originalEnviarTexto !== 'function') {
    console.warn('[CHAT MEDIA WRAP] window.enviarTexto no está definido');
    return;
  }

  console.log('[CHAT MEDIA WRAP] envolviendo enviarTexto');

  window.enviarTexto = async function wrappedEnviarTexto(...args) {
    const input = document.getElementById('msgInput');
    const text  = (input?.value || '').trim();

    const hayTexto = !!text;
    const hayImgs  = pendingImages.length > 0;
    const hayVids  = pendingVideos.length > 0;

    console.log('[CHAT MEDIA WRAP] click enviar', {
      hayTexto,
      hayImgs,
      hayVids,
      pendingImages_len: pendingImages.length,
      pendingVideos_len: pendingVideos.length,
    });

    // 1) si no hay nada, no hacemos nada
    if (!hayTexto && !hayImgs && !hayVids) {
      console.log('[CHAT MEDIA WRAP] nada que enviar');
      return;
    }

    // 2) si hay imágenes, las mandamos primero
    if (hayImgs) {
      for (const item of pendingImages) {
        console.log('[CHAT MEDIA WRAP] enviarImagen()', item.file?.name);
        await enviarImagen(item.file);
      }
      clearAllImagePreviews();
    }

    // 3) si hay videos, los mandamos después
    if (hayVids) {
      for (const item of pendingVideos) {
        console.log('[CHAT MEDIA WRAP] enviarVideo()', item.file?.name);
        await enviarVideo(item.file);
      }
      clearAllVideoPreviews();
    }

    // 4) si además hay texto, llamamos al enviarTexto original
    if (hayTexto) {
      return originalEnviarTexto.apply(this, args);
    }
  };
}









// ==================== MENÚ DE MENSAJES (⋮) ====================
// Delegación de eventos en #msgs
document.addEventListener('DOMContentLoaded', () => {
  const msgsBox = document.getElementById('msgs');
  if (!msgsBox) return;

  // Clicks dentro de la caja de mensajes
  msgsBox.addEventListener('click', (ev) => {
    const btnMenu   = ev.target.closest('.msg-menu-btn-icon-mensajes');   // 👈 cambio acá
    const btnDelete = ev.target.closest('.msg-menu-delete');

    // Abrir/cerrar menú
    if (btnMenu) {
      const dropdown = btnMenu.parentElement.querySelector('.msg-menu-dropdown');
      const allDropdowns = msgsBox.querySelectorAll('.msg-menu-dropdown');
      allDropdowns.forEach(d => {
        if (d !== dropdown) d.classList.remove('open');
      });
      dropdown.classList.toggle('open');
      ev.stopPropagation();
      return;
    }

    // Eliminar mensaje
    if (btnDelete) {
      const msgId = btnDelete.dataset.msgId;
      if (msgId) {
        eliminarMensaje(msgId);
      }
    }
  });
});

// Cerrar menús al hacer click fuera
document.addEventListener('click', () => {
  const dropdowns = document.querySelectorAll('.msg-menu-dropdown.open');
  dropdowns.forEach(d => d.classList.remove('open'));
});



// =========================
// ELIMINAR MENSAJE (FRONT)
// =========================
async function eliminarMensaje(msgId) {
  if (!msgId) {
    console.warn('[CHAT] eliminarMensaje sin msgId');
    return;
  }

  if (!confirm('¿Eliminar este mensaje?')) return;

  // ID del usuario que está viendo el chat
  const viewerIdRaw = window.usuario_id ?? window.VIEWER_USER_ID ?? null;
  const viewerId = viewerIdRaw != null ? Number(viewerIdRaw) : null;

  try {
    const resp = await fetch(`/api/chat/message/${msgId}/delete/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ viewer_user_id: viewerId }),
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok || !data?.ok) {
      console.error('[CHAT] Error al eliminar mensaje', data);
      alert('No se pudo eliminar el mensaje.');
      return;
    }

    // Borro el div del mensaje en el DOM
    const msgDiv = document.querySelector(`.msg[data-msg-id="${msgId}"]`);
    if (msgDiv && msgDiv.parentNode) {
      msgDiv.parentNode.removeChild(msgDiv);
    }

  } catch (err) {
    console.error('[CHAT] Excepción al eliminar mensaje', err);
    alert('Error al eliminar el mensaje.');
  }
}
