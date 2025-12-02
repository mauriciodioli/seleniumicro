import { showImagePreview } from '../modulesMedia/imagenModule.js';
import { showVideoPreview } from '../modulesMedia/videoModule.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('[CHAT MEDIA] Archivo principal cargado');
  const btnAttach = document.getElementById('btnAttach');
  const fileInput = document.getElementById('fileInput');

  if (btnAttach && fileInput) {
    btnAttach.addEventListener('click', () => fileInput.click());
  }

  if (fileInput) {
    // por si acaso, lo forzamos también por JS
    fileInput.multiple = true;

    fileInput.addEventListener('change', () => {
      const files = Array.from(fileInput.files || []);
      if (!files.length) return;

      for (const file of files) {
        if (file.type.startsWith('image/')) {
          showImagePreview(file);          // 👈 un chip por imagen
        } else if (file.type.startsWith('video/')) {
          showVideoPreview(file);
        } else if (file.type.startsWith('audio/')) {
          showAudioPreview(file);
        }
      }
    });
  }
});
