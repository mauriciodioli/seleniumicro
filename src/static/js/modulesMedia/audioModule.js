console.log('[CHAT AUDIO] Módulo cargado');

// =======================
// Variables globales
// =======================
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let discardNextAudio = false;

const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
const hasMediaRecorder = typeof MediaRecorder !== 'undefined';

// =======================
// START RECORDING
// =======================
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

      if (!discardNextAudio) enviarAudio(blob);

      discardNextAudio = false;
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

// =======================
// STOP RECORDING
// =======================
function stopRecording() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
  }
  isRecording = false;
  document.body.classList.remove('chat-recording');
}

// =======================
// ENVIAR AUDIO
// =======================
async function enviarAudio(blob) {
  const convId = getConvId();
  if (!convId || !blob) return;

  const fd = new FormData();
  fd.append('file', blob, 'audio.webm');
  fd.append('conversation_id', convId);

  const role = (window.viewerIsOwner && window.viewerIsOwner()) ? 'owner' : 'client';
  fd.append('as', role);

  try {
    const resp = await fetch('/api/chat/audio_controller/audio-upload/', {
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

// =======================
// PREVIEW (SI SUBEN ARCHIVO, NO GRABADO)
// =======================
function showAudioPreview(file) {
  const previewContainer = document.getElementById('mediaPreview');
  if (!previewContainer) {
    console.error('[AUDIO PREVIEW] Contenedor no encontrado.');
    return;
  }

  previewContainer.innerHTML = '';

  const audioUrl = URL.createObjectURL(file);
  const audioElement = document.createElement('audio');
  audioElement.src = audioUrl;
  audioElement.controls = true;
  audioElement.className = 'chat-media-audio';

  previewContainer.appendChild(audioElement);
}

// =======================
// EXPOSE TO WINDOW
// =======================
window.startRecording   = startRecording;
window.stopRecording    = stopRecording;
window.showAudioPreview = showAudioPreview;

