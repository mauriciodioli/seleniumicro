document.addEventListener('DOMContentLoaded', () => {
  console.log('[CHAT MEDIA] init');

    // --- DETECCIÓN DE DISPOSITIVOS DE AUDIO ---
  if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const audios = devices.filter(d => d.kind === 'audioinput');
        console.log('[CHAT MEDIA] dispositivos de audio:', audios);
        if (!audios.length) {
          console.warn('[CHAT MEDIA] No se detectó ningún micrófono (audioinput).');
        }
      })
      .catch(err => {
        console.warn('[CHAT MEDIA] Error al enumerar dispositivos de audio:', err);
      });
  } else {
    console.warn('[CHAT MEDIA] navigator.mediaDevices.enumerateDevices NO disponible');
  }

  // === Referencias básicas ===
  const msgInput  = document.getElementById('msgInput');
  const btnSend   = document.getElementById('sendBtnSenMessage');
  const btnAttach = document.getElementById('btnAttach');
  const fileInput = document.getElementById('fileInput');

  console.log('[CHAT MEDIA] refs:', { msgInput, btnSend, btnAttach, fileInput });

  // ====== estado de media pendiente ======
  let pendingFile = null;
  let mediaPreview = null;

  function ensureMediaPreview() {
    if (mediaPreview) return mediaPreview;

    const chatInputBar = document.querySelector('.chat-input');
    if (!chatInputBar || !chatInputBar.parentNode) return null;

    mediaPreview = document.createElement('div');
    mediaPreview.id = 'mediaPreview';
    mediaPreview.className = 'chat-media-preview';
    // lo insertamos justo arriba de la barra de input
    chatInputBar.parentNode.insertBefore(mediaPreview, chatInputBar);

    return mediaPreview;
  }

  function showPreview(file) {
    const cont = ensureMediaPreview();
    if (!cont) return;

    const url = URL.createObjectURL(file);
    cont.innerHTML = '';

    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Imagen adjunta';
    img.className = 'chat-media-thumb';

    cont.appendChild(img);
  }

  function clearPreview() {
    if (mediaPreview) {
      mediaPreview.innerHTML = '';
    }
  }

  // ---------- IMÁGENES (📎) ----------
  if (btnAttach && fileInput) {
    btnAttach.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('[CHAT MEDIA] click btnAttach');
      fileInput.click();
    });

    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      console.log('[CHAT MEDIA] file change', file);
      if (!file) return;

      // NO se envía todavía: solo la guardamos y mostramos preview
      pendingFile = file;
      showPreview(file);

      // permitir volver a elegir la misma imagen después
      fileInput.value = '';
    });
  } else {
    console.warn('[CHAT MEDIA] btnAttach o fileInput NO encontrados');
  }

  // ---------- AUDIO (mantener botón ▶) ----------
  
  let pressTimer = null;
  let isRecording = false;
  let mediaRecorder = null;
  let audioChunks = [];

  const hasMediaDevices  = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const hasMediaRecorder = typeof MediaRecorder !== 'undefined';

  console.log('[CHAT MEDIA] soporte audio:', {
    hasMediaDevices,
    hasMediaRecorder,
    protocol: location.protocol,
    host: location.hostname
  });

  function startPressTimer() {
    console.log('[CHAT MEDIA] startPressTimer');

    if (!hasMediaDevices || !hasMediaRecorder) {
      console.warn('[CHAT MEDIA] Este navegador NO soporta getUserMedia o MediaRecorder');
      return;
    }

    // bajamos el tiempo a 250ms para que sea más sensible
    pressTimer = setTimeout(() => {
      console.log('[CHAT MEDIA] long-press detectado → startRecording()');
      startRecording();
    }, 250);
  }

  function clearPressTimer() {
    if (pressTimer) {
      console.log('[CHAT MEDIA] clearPressTimer');
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  }

  async function startRecording() {
    console.log('[CHAT MEDIA] startRecording llamado');

    // muchos navegadores exigen HTTPS o localhost
    if (location.protocol !== 'https:' &&
        location.hostname !== 'localhost' &&
        location.hostname !== '127.0.0.1') {
      console.warn('[CHAT MEDIA] Audio bloqueado: se requiere HTTPS o localhost para getUserMedia');
      alert('No puedo acceder al micrófono porque la página no está en HTTPS.\nAbrí la web en https:// o en localhost.');
      return;
    }

    try {
      console.log('[CHAT MEDIA] solicitando permiso de micrófono…');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[CHAT MEDIA] micrófono OK, empezando a grabar');

      audioChunks = [];
      mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.onstart = () => {
        console.log('[CHAT MEDIA] MediaRecorder.onstart');
      };

      mediaRecorder.ondataavailable = (e) => {
        console.log('[CHAT MEDIA] ondataavailable size=', e.data && e.data.size);
        if (e.data.size > 0) {
          audioChunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('[CHAT MEDIA] MediaRecorder.onstop, chunks:', audioChunks.length);
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        enviarAudio(blob);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.onerror = (e) => {
        console.error('[CHAT MEDIA] MediaRecorder error', e.error || e);
      };

      mediaRecorder.start();
      isRecording = true;
      document.body.classList.add('chat-recording');
      if (btnSend) btnSend.textContent = '🎙';

    } catch (err) {
      console.error('[CHAT MEDIA] No se pudo acceder al micrófono', err);
      alert('No pude acceder al micrófono.\nRevisá los permisos del navegador para esta página.');
      isRecording = false;
    }
  }

  function stopRecording() {
    console.log('[CHAT MEDIA] stopRecording llamado');
    if (mediaRecorder && isRecording) {
      console.log('[CHAT MEDIA] mediaRecorder.stop()');
      mediaRecorder.stop();
    }
    isRecording = false;
    document.body.classList.remove('chat-recording');
    if (btnSend) btnSend.textContent = '▶';
  }

  function enviarTextoYMedia() {
    console.log('[CHAT MEDIA] enviarTextoYMedia');

    if (typeof enviarTexto === 'function') {
      enviarTexto();
    } else {
      console.warn('[CHAT MEDIA] enviarTexto() no está definido');
    }

    if (pendingFile) {
      enviarImagen(pendingFile);
      pendingFile = null;
      if (typeof clearPreview === 'function') {
        clearPreview();
      }
    }
  }

  // ---------- Eventos del botón enviar (texto / audio) ----------
  if (btnSend) {
    // Desktop
    btnSend.addEventListener('mousedown', (e) => {
      e.preventDefault();
      console.log('[CHAT MEDIA] mousedown btnSend');
      startPressTimer();
    });

    btnSend.addEventListener('mouseup', (e) => {
      e.preventDefault();
      console.log('[CHAT MEDIA] mouseup btnSend');
      clearPressTimer();

      if (isRecording) {
        stopRecording();
      } else {
        enviarTextoYMedia();
      }
    });

    btnSend.addEventListener('mouseleave', () => {
      console.log('[CHAT MEDIA] mouseleave btnSend');
      clearPressTimer();
      if (isRecording) stopRecording();
    });

    // Mobile (touch)
    btnSend.addEventListener('touchstart', (e) => {
      e.preventDefault();
      console.log('[CHAT MEDIA] touchstart btnSend');
      startPressTimer();
    }, { passive: false });

    btnSend.addEventListener('touchend', (e) => {
      e.preventDefault();
      console.log('[CHAT MEDIA] touchend btnSend');
      clearPressTimer();

      if (isRecording) {
        stopRecording();
      } else {
        enviarTextoYMedia();
      }
    });

    btnSend.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      console.log('[CHAT MEDIA] touchcancel btnSend');
      clearPressTimer();
      if (isRecording) stopRecording();
    });
  }
















// ---------- Envío de IMAGEN ----------
function enviarImagen(file) {
  // 1) SIEMPRE pintamos en el panel, haya o no conversación
  renderImagenLocal(file);

  // 2) Luego intentamos mandarla al backend
  const convId = window.CURRENT_CHAT?.conversationId;
  if (!convId) {
    console.warn('[CHAT MEDIA] No hay conversationId para enviar imagen (solo preview local)');
    return; // no enviamos al servidor, pero la burbuja ya se ve
  }

  const form = new FormData();
  form.append('conversation_id', convId);
  form.append('role', 'user');
  form.append('file', file);

  fetch('/api/chat/send', {
    method: 'POST',
    body: form
  }).catch(err => console.error('[CHAT MEDIA] Error enviando imagen', err));
}


  // ---------- Envío de AUDIO ----------
  function enviarAudio(blob) {
    const convId = window.CURRENT_CHAT?.conversationId;
    if (!convId) {
      console.error('[CHAT MEDIA] No hay conversationId para enviar audio');
      return;
    }

    const form = new FormData();
    form.append('conversation_id', convId);
    form.append('role', 'user');
    form.append('file', blob, 'audio.webm');

    renderAudioLocal(blob);

    fetch('/api/chat/send', {
      method: 'POST',
      body: form
    }).catch(err => console.error('[CHAT MEDIA] Error enviando audio', err));
  }

  // ====== RENDER LOCAL DE IMAGEN Y AUDIO ======

  function renderImagenLocal(file) {
    const url = URL.createObjectURL(file);
    const msgs = document.getElementById('msgs');
    if (!msgs) return;

    const wrap = document.createElement('div');
    wrap.className = 'msg me msg--image';

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

    msgs.scrollTop = msgs.scrollHeight;
  }

  function renderAudioLocal(blob) {
    const url = URL.createObjectURL(blob);
    const msgs = document.getElementById('msgs');
    if (!msgs) return;

    const wrap = document.createElement('div');
    wrap.className = 'msg me msg--audio';

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

    msgs.scrollTop = msgs.scrollHeight;
  }

});
