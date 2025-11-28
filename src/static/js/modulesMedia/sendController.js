// sendController.js
import { startRecording, stopRecording } from './audioModule.js';

let isRecording = false;

/**
 * CLICK → envía texto si hay, o detiene grabación si estaba grabando
 */
function handleSendButtonClick() {
  const inputField = document.getElementById('msgInput');

  // Si se estaba grabando → detener (enviar audio desde audioModule)
  if (isRecording) {
    stopRecording();
    isRecording = false;
    return;
  }

  if (!inputField) return;
  const text = (inputField.value || '').trim();
  if (!text) return;

  console.log('[SEND CONTROLLER] enviar texto:', text);
  sendMessage(text);     // usa tu función global existente
  inputField.value = '';
}

/**
 * Mantener apretado → empezar a grabar
 */
function handleSendButtonHoldStart() {
  console.log('[SEND CONTROLLER] ▶ startRecording()');
  startRecording();
  isRecording = true;
}

/**
 * Soltar → detener grabación
 */
function handleSendButtonHoldEnd() {
  if (!isRecording) return;
  console.log('[SEND CONTROLLER] ■ stopRecording()');
  stopRecording();
  isRecording = false;
}

export {
  handleSendButtonClick,
  handleSendButtonHoldStart,
  handleSendButtonHoldEnd
};
