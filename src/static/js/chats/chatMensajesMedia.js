import { showAudioPreview } from '../modulesMedia/audioModule.js';
import { showImagePreview } from '../modulesMedia/imagenModule.js';
import { showVideoPreview } from '../modulesMedia/videoModule.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('[CHAT MEDIA] Archivo principal cargado');
  const btnAttach = document.getElementById('btnAttach');
  const fileInput = document.getElementById('fileInput');

  if (btnAttach) {
    btnAttach.addEventListener('click', () => fileInput.click());
  }

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      if (file.type.startsWith('image/')) {
        showImagePreview(file);
      } else if (file.type.startsWith('video/')) {
        showVideoPreview(file);
      } else if (file.type.startsWith('audio/')) {
        showAudioPreview(file);
      }
    });
  }
});
