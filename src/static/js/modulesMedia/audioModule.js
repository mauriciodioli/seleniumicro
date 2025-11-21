console.log('[CHAT AUDIO] Módulo cargado');

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let discardNextAudio = false;

const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
const hasMediaRecorder = typeof MediaRecorder !== 'undefined';

async function startRecording() {
  if (!hasMediaDevices || !hasMediaRecorder) {
    console.warn('[CHAT AUDIO] Navegador sin soporte');
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: 'audio/webm' });
      if (!discardNextAudio) {
        enviarAudio(blob);
      }
      stream.getTracks().forEach((t) => t.stop());
    };

    mediaRecorder.start();
    isRecording = true;
    document.body.classList.add('chat-recording');
  } catch (err) {
    console.error('[CHAT AUDIO] Error al iniciar grabación', err);
    isRecording = false;
  }
}

function stopRecording() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
  }
  isRecording = false;
  document.body.classList.remove('chat-recording');
}

async function enviarAudio(blob) {
  const convId = getConvId();
  if (!convId || !blob) return;

  const fd = new FormData();
  fd.append('file', blob, 'audio.webm');
  fd.append('conversation_id', convId);

  try {
    const resp = await fetch('/api/chat/api_chat_bp/audio-upload/', {
      method: 'POST',
      body: fd,
      credentials: 'include',
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data?.ok) {
      console.error('[CHAT AUDIO] Error al subir audio', data);
      return;
    }
    pushMessageToUI(data.message);
  } catch (err) {
    console.error('[CHAT AUDIO] Excepción al subir audio', err);
  }
}

export { startRecording, stopRecording };