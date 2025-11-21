import { startRecording, stopRecording } from './audioModule.js';
import { enviarImagen, pendingImage } from './imagenModule.js';
import { enviarVideo, pendingVideo } from './videoModule.js';

let isRecording = false;

function handleSendButtonClick() {
  const inputField = document.getElementById('chatInputField'); // Campo de texto
  const fileInput = document.getElementById('fileInput'); // Input de archivos

  // Prioridad: Imagen > Video > Audio > Texto
  if (pendingImage) {
    enviarImagen(pendingImage);
    resetPendingMedia();
  } else if (pendingVideo) {
    enviarVideo(pendingVideo);
    resetPendingMedia();
  } else if (isRecording) {
    stopRecording();
    isRecording = false;
  } else if (inputField && inputField.value.trim() !== '') {
    enviarTexto(inputField.value.trim());
    inputField.value = ''; // Limpiar el campo de texto
  } else {
    console.warn('[SEND CONTROLLER] No hay acción para ejecutar.');
  }
}

function handleSendButtonHold() {
  // Iniciar grabación de audio al mantener presionado el botón
  startRecording();
  isRecording = true;
}

function resetPendingMedia() {
  // Limpiar referencias de medios pendientes
  pendingImage = null;
  pendingVideo = null;
  const previewContainer = document.getElementById('mediaPreviewContainer');
  if (previewContainer) {
    previewContainer.innerHTML = ''; // Limpiar vista previa
  }
}

async function enviarTexto(text) {
  const convId = getConvId();
  if (!convId || !text) return;

  try {
    const resp = await fetch('/api/chat/api_chat_bp/send-text/', {
      method: 'POST',
      body: JSON.stringify({ conversation_id: convId, text }),
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data?.ok) {
      console.error('[SEND CONTROLLER] Error al enviar texto', data);
      return;
    }
    pushMessageToUI(data.message);
  } catch (err) {
    console.error('[SEND CONTROLLER] Excepción al enviar texto', err);
  }
}

export { handleSendButtonClick, handleSendButtonHold, resetPendingMedia };