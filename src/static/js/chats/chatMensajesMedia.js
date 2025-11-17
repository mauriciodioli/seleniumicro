// === Referencias básicas ===
const msgInput  = document.getElementById('msgInput');
const btnSend   = document.getElementById('sendBtnSenMessage');
const btnAttach = document.getElementById('btnAttach');
const fileInput = document.getElementById('fileInput');

// ---------- IMÁGENES (📎) ----------
if (btnAttach && fileInput) {
  btnAttach.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;

    enviarImagen(file);     // 👉 manda al backend + pinta en UI

    // poder volver a elegir la misma imagen
    fileInput.value = '';
  });
}

// ---------- AUDIO (mantener botón ▶) ----------
let pressTimer = null;
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];

function startPressTimer() {
  // si pasa este tiempo, lo consideramos "mantener apretado"
  pressTimer = setTimeout(() => {
    startRecording();
  }, 400); // 400ms, ajustable
}

function clearPressTimer() {
  if (pressTimer) {
    clearTimeout(pressTimer);
    pressTimer = null;
  }
}

async function startRecording() {
  // chequeo por si el navegador no soporta esto
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.warn('[CHAT] getUserMedia no soportado en este navegador');
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: 'audio/webm' });
      enviarAudio(blob);                     // 👉 manda al backend + pinta en UI
      stream.getTracks().forEach(t => t.stop()); // cortar micrófono
    };

    mediaRecorder.start();
    isRecording = true;
    document.body.classList.add('chat-recording'); // para cambiar estilos si querés
    if (btnSend) btnSend.textContent = '🎙';       // indicador visual

  } catch (err) {
    console.error('[CHAT] No se pudo acceder al micrófono', err);
    isRecording = false;
  }
}

function stopRecording() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
  }
  isRecording = false;
  document.body.classList.remove('chat-recording');
  if (btnSend) btnSend.textContent = '▶';
}

// ---------- Eventos del botón enviar (texto / audio) ----------
if (btnSend) {
  // Desktop
  btnSend.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startPressTimer();
  });

  btnSend.addEventListener('mouseup', (e) => {
    e.preventDefault();
    clearPressTimer();

    if (isRecording) {
      // Estábamos grabando → detener y mandar audio
      stopRecording();
    } else {
      // Click corto → enviar texto (función global definida en chatMensajes.js)
      if (typeof enviarTexto === 'function') {
        enviarTexto();
      } else {
        console.warn('[CHAT] enviarTexto() no está definido');
      }
    }
  });

  btnSend.addEventListener('mouseleave', (e) => {
    // si se va fuera del botón, cancelamos
    clearPressTimer();
    if (isRecording) stopRecording();
  });

  // Mobile (touch)
  btnSend.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startPressTimer();
  }, { passive: false });

  btnSend.addEventListener('touchend', (e) => {
    e.preventDefault();
    clearPressTimer();

    if (isRecording) {
      stopRecording();
    } else {
      if (typeof enviarTexto === 'function') {
        enviarTexto();
      }
    }
  });

  btnSend.addEventListener('touchcancel', (e) => {
    e.preventDefault();
    clearPressTimer();
    if (isRecording) stopRecording();
  });
}

// ---------- Envío de IMAGEN ----------
function enviarImagen(file) {
  const convId = window.CURRENT_CHAT?.conversationId;
  if (!convId) {
    console.error('[CHAT] No hay conversationId para enviar imagen');
    return;
  }

  const form = new FormData();
  form.append('conversation_id', convId);
  form.append('role', 'user');
  form.append('file', file);

  // preview local
  if (typeof renderImagenLocal === 'function') {
    renderImagenLocal(file);
  }

  fetch('/api/chat/send', {
    method: 'POST',
    body: form
  }).catch(err => console.error('[CHAT] Error enviando imagen', err));
}

// ---------- Envío de AUDIO ----------
function enviarAudio(blob) {
  const convId = window.CURRENT_CHAT?.conversationId;
  if (!convId) {
    console.error('[CHAT] No hay conversationId para enviar audio');
    return;
  }

  const form = new FormData();
  form.append('conversation_id', convId);
  form.append('role', 'user');
  form.append('file', blob, 'audio.webm');

  // preview local
  if (typeof renderAudioLocal === 'function') {
    renderAudioLocal(blob);
  }

  fetch('/api/chat/send', {
    method: 'POST',
    body: form
  }).catch(err => console.error('[CHAT] Error enviando audio', err));
}



// ====== RENDER LOCAL DE IMAGEN Y AUDIO ======

function renderImagenLocal(file) {
  const url = URL.createObjectURL(file);  // preview local
  const msgs = document.getElementById('msgs');
  if (!msgs) return;

  const wrap = document.createElement('div');
  wrap.className = 'msg msg--out msg--image';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';

  const img = document.createElement('img');
  img.src = url;
  img.alt = 'Imagen adjunta';
  img.className = 'msg-image';
  img.loading = 'lazy';

  bubble.appendChild(img);
  wrap.appendChild(bubble);
  msgs.appendChild(wrap);

  // scroll al final
  msgs.scrollTop = msgs.scrollHeight;
}

function renderAudioLocal(blob) {
  const url = URL.createObjectURL(blob);  // preview local
  const msgs = document.getElementById('msgs');
  if (!msgs) return;

  const wrap = document.createElement('div');
  wrap.className = 'msg msg--out msg--audio';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';

  const audio = document.createElement('audio');
  audio.controls = true;
  audio.className = 'msg-audio';

  const source = document.createElement('source');
  source.src = url;
  source.type = 'audio/webm';

  audio.appendChild(source);
  bubble.appendChild(audio);
  wrap.appendChild(bubble);
  msgs.appendChild(wrap);

  // scroll al final
  msgs.scrollTop = msgs.scrollHeight;
}

