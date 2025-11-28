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
    alert('[AUDIO] Tu navegador no soporta grabación de audio.');
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

      // 🔔 DEBUG 1: tamaño del audio antes de enviar
      alert(`[DEBUG AUDIO] Blob listo. Tamaño: ${blob.size} bytes`);

      if (!discardNextAudio) {
        enviarAudio(blob);
      }
      discardNextAudio = false;
      stream.getTracks().forEach((t) => t.stop());
    };

    mediaRecorder.start();
    isRecording = true;
    document.body.classList.add('chat-recording');
    console.log('[CHAT AUDIO] grabación iniciada');
  } catch (err) {
    console.error('[CHAT AUDIO] Error al iniciar grabación', err);
    alert('[AUDIO] Error al iniciar la grabación.');
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
  console.log('[CHAT AUDIO] grabación detenida');
}

// =======================
// TOGGLE (click → ON / click → OFF)
// =======================
function toggleRecording() {
  if (!isRecording) {
    console.log('[CHAT AUDIO] toggle → startRecording');
    startRecording();
  } else {
    console.log('[CHAT AUDIO] toggle → stopRecording');
    stopRecording();
  }
}

// =======================
// ENVIAR AUDIO AL ENDPOINT
// =======================
async function enviarAudio(blob) {
  const convId = getConvId && getConvId();
  if (!convId) {
    alert('[DEBUG AUDIO] ❌ No hay conversation_id, no se envía el audio.');
    console.warn('[CHAT AUDIO] sin conversation_id');
    return;
  }

  if (!blob || !blob.size) {
    alert('[DEBUG AUDIO] ❌ Blob vacío, no se envía.');
    console.warn('[CHAT AUDIO] blob vacío');
    return;
  }

  // 🔔 DEBUG 2: confirmación antes del fetch
  alert(`[DEBUG AUDIO] Enviando audio de ${blob.size} bytes a la conversación ${convId}...`);

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

    let data = {};
    try {
      data = await resp.json();
    } catch (e) {
      console.warn('[CHAT AUDIO] respuesta no-JSON', e);
    }

    // 🔔 DEBUG 3: respuesta del endpoint
    if (resp.ok && data?.ok) {
      const msgId = data.message?.id || '(sin id)';
      alert(`[DEBUG AUDIO] ✅ Audio subido correctamente. message.id = ${msgId}`);
      console.log('[CHAT AUDIO] subida OK', data);

      if (typeof pushMessageToUI === 'function') {
        pushMessageToUI(data.message);
      }
    } else {
      const errText = data?.error || 'Error desconocido en endpoint';
      alert(`[DEBUG AUDIO] ❌ Error desde endpoint: ${errText}`);
      console.error('[CHAT AUDIO] Error al subir audio', data);
    }

  } catch (err) {
    alert('[DEBUG AUDIO] ❌ Excepción al llamar al endpoint. Revisar consola.');
    console.error('[CHAT AUDIO] Excepción al subir audio', err);
  }
}

// =======================
// EXPOSE TO WINDOW
// =======================
window.startRecording   = startRecording;
window.stopRecording    = stopRecording;
window.toggleRecording  = toggleRecording;
