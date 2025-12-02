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
