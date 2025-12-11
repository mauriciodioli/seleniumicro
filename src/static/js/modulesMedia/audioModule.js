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
    alert('[AUDIO] ❌ Tu navegador no soporta grabación.');
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
     // alert('[AUDIO] ■ Grabación detenida. Generando blob...');

      const blob = new Blob(audioChunks, { type: 'audio/webm' });

      //alert(`[DEBUG] Blob generado: ${blob.size} bytes (${Math.round(blob.size / 1024)} KB)`);

      // restablecer
      discardNextAudio = false;

      if (confirm(`🤔 ¿Enviar audio de ${Math.round(blob.size / 1024)} KB?`)) {
       // alert('[AUDIO] 📤 Usuario confirmó → enviando...');
        enviarAudio(blob);
      } else {
        alert('[AUDIO] ❌ Envío cancelado por usuario.');
      }

      stream.getTracks().forEach(t => t.stop());
    };

    // iniciar
    mediaRecorder.start();
    isRecording = true;
    document.body.classList.add('chat-recording');

    console.log('[CHAT AUDIO] ▶ Grabación iniciada');
  } catch (err) {
    alert('[AUDIO] ❌ Error al iniciar la grabación.');
    console.error('[CHAT AUDIO] Error al iniciar grabación', err);
    isRecording = false;
  }
}

// =======================
// STOP RECORDING
// =======================
function stopRecording() {
 // alert('[AUDIO] ■ Deteniendo grabación...');

  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
  } else {
    alert('[AUDIO] ⚠ No había grabación activa.');
  }

  isRecording = false;
  document.body.classList.remove('chat-recording');

  console.log('[CHAT AUDIO] ■ Grabación finalizada.');
}

// =======================
// TOGGLE (click → ON / click → OFF)
// =======================
function toggleRecording() {
//  alert(isRecording ? '[AUDIO] ■ stopRecording()' : '[AUDIO] ▶ startRecording()');
  if (!isRecording) startRecording();
  else stopRecording();
}

// =======================
// ENVIAR AUDIO
// =======================
async function enviarAudio(blob) {
  const convId = (typeof getConvId === 'function') ? getConvId() : null;

 // alert(`[DEBUG AUDIO] getConvId() devolvió: ${convId}`);

 // alert('[DEBUG AUDIO] 🔍 Preparando envío...');

  if (!convId) {
    alert('[DEBUG AUDIO] ❌ No existe conversation_id.');
    return;
  }

  if (!blob || !blob.size) {
    alert('[DEBUG AUDIO] ❌ Blob inválido.');
    return;
  }

  alert(`[DEBUG AUDIO] 📤 Enviando ${blob.size} bytes a conversación ${convId}`);

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
    try { data = await resp.json(); } catch (_) {}

   // alert(`[DEBUG AUDIO] 📥 Respuesta endpoint: OK=${resp.ok}`);

    if (resp.ok && data?.ok) {
     // alert(`[DEBUG AUDIO] ✔ Audio subido. msg.id=${data.message?.id}`);
      if (typeof pushMessageToUI === 'function') pushMessageToUI(data.message);
    } else {
      alert(`[DEBUG AUDIO] ❌ Error desde backend: ${data?.error || 'desconocido'}`);
    }

  } catch (err) {
    alert('[DEBUG AUDIO] ❌ Excepción al subir audio.');
    console.error('[CHAT AUDIO] Error endpoint', err);
  }
}


// =======================
// EXPOSE TO WINDOW
// =======================
window.startRecording  = startRecording;
window.stopRecording   = stopRecording;
window.toggleRecording = toggleRecording;
