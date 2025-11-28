// sendController.js
import { startRecording, stopRecording } from './audioModule.js';

let isRecording = false;

/**
 * CLICK → enviar texto o detener grabación
 */
function handleSendButtonClick() {
  const inputField = document.getElementById('msgInput');

  if (isRecording) {
    stopRecording();
    isRecording = false;
    return;
  }

  if (!inputField) return;
  const text = (inputField.value || '').trim();
  if (!text) return;

  console.log('[SEND CONTROLLER] enviar texto:', text);

  // 🟢 Usar función global que ya tenés definida (chatMensajes.js)
  if (typeof window.sendMessage === 'function') {
    sendMessage(text);
  } else {
    console.error('⚠️ sendMessage no está disponible');
  }

  inputField.value = '';
}

/**
 * Mantener apretado → comenzar audio
 */
function handleSendButtonHold() {
  console.log('[SEND CONTROLLER] ▶ startRecording()');
  startRecording();
  isRecording = true;
}

export {
  handleSendButtonClick,
  handleSendButtonHold
};
