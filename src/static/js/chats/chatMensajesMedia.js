import { handleSendButtonClick, handleSendButtonHold } from '../modulesMedia/sendController.js';
import { showImagePreview } from '../modulesMedia/imagenModule.js'; // Import the function
import { showVideoPreview } from '../modulesMedia/videoModule.js';

document.addEventListener('DOMContentLoaded', () => {
  debugger;
  console.log('[CHAT MEDIA] Archivo principal cargado');

  const btnAttach = document.getElementById('btnAttach'); // Botón para adjuntar
  const fileInput = document.getElementById('fileInput'); // Input de archivo

  if (btnAttach && fileInput) {
    // Asociar el evento click del botón al input de archivo
    btnAttach.addEventListener('click', () => {
      fileInput.click(); // Simula un clic en el input de archivo
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;

      if (file.type.startsWith('image/')) {
        showImagePreview(file); // Use the imported function
      } else if (file.type.startsWith('video/')) {
        showVideoPreview(file);
      } else if (file.type.startsWith('audio/')) {
        showAudioPreview(file);
      }
    });
  }
});

function showAudioPreview(file) {
  const previewContainer = document.getElementById('mediaPreview'); // Contenedor de vista previa
  if (!previewContainer) {
    console.error('[AUDIO PREVIEW] Contenedor de vista previa no encontrado.');
    return;
  }

  // Crear la URL del archivo de audio seleccionado
  const audioUrl = URL.createObjectURL(file);

  // Limpiar cualquier contenido previo en el contenedor
  previewContainer.innerHTML = '';

  // Crear el elemento de audio
  const audioElement = document.createElement('audio');
  audioElement.src = audioUrl;
  audioElement.controls = true; // Agregar controles para reproducir/pausar
  audioElement.className = 'chat-media-audio';

  // Agregar el elemento de audio al contenedor
  previewContainer.appendChild(audioElement);
}