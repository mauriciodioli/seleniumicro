// chatMensajesMedia.js
// =====================================================
//  CONFIG / HELPERS COMUNES
// =====================================================
console.log('[CHAT MEDIA] archivo cargado');

document.addEventListener('DOMContentLoaded', () => {
  console.log('[CHAT MEDIA] init');

  // ----- ENDPOINTS SÓLO MEDIA -----
 // arriba de enviarImagen
  const API_IMAGE = '/api/chat/api_chat_bp/image-upload/';    // IMAGEN
  const API_AUDIO = '/api/chat/api_chat_bp/audio-upload/';    // AUDIO
  const API_VIDEO = '/api/chat/api_chat_bp/video-upload/';    // VIDEO

  // ----- REFS BÁSICAS -----
  const msgInput  = document.getElementById('msgInput');
  const btnSend   = document.getElementById('sendBtnSenMessage');
  const btnAttach = document.getElementById('btnAttach');
  const fileInput = document.getElementById('fileInput');

  console.log('[CHAT MEDIA] refs:', { msgInput, btnSend, btnAttach, fileInput });

  // conversación activa (ya la usás en otros scripts)
  const getConvId = () =>
    window.ACTIVE_CONVERSATION_ID ||
    window.currentConversationId ||
    null;

  // preview común de media
  let mediaPreview = null;
  function ensureMediaPreview() {
    if (mediaPreview) return mediaPreview;
    const chatInputBar = document.querySelector('.chat-input');
    if (!chatInputBar || !chatInputBar.parentNode) return null;
    mediaPreview = document.createElement('div');
    mediaPreview.id = 'mediaPreview';
    mediaPreview.className = 'chat-media-preview';
    chatInputBar.parentNode.insertBefore(mediaPreview, chatInputBar);
    return mediaPreview;
  }
  function clearPreview() {
    if (mediaPreview) mediaPreview.innerHTML = '';
  }

  // estado de media pendiente
  let pendingImage = null;
  let pendingVideo = null;

  // helper para notificar nuevo mensaje al renderer que ya tengas
  function pushMessageToUI(message) {
    if (typeof window.appendMessageFromServer === 'function') {
      window.appendMessageFromServer(message);
    } else {
      console.log('[CHAT MEDIA] message recibido (sin renderer):', message);
    }
  }

  // =====================================================
  //  1) TEXTO → LO SIGUE MANEJANDO enviarTexto()
  // =====================================================
  function enviarTextoSiHay() {
    const text = (msgInput?.value || '').trim();
    if (!text) return;
    if (typeof window.enviarTexto === 'function') {
      window.enviarTexto();   // usa tu lógica actual (endpoint /send/)
    } else {
      console.warn('[CHAT TEXT] enviarTexto() no está definido');
    }
  }

  // =====================================================
  //  2) IMAGEN: preview + envío (endpoint propio)
  // =====================================================

  function showImagePreview(file) {
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

  async function enviarImagen(file) {
    if (!file) return;
    const convId = getConvId();
    if (!convId) return;
    if (pendingImage) {
          const file = pendingImage;
          pendingImage = null;
          clearPreview();
          await enviarImagen(file);
          return;
        }

    const fd = new FormData();
    fd.append('file', file, file.name || 'image.png');
    fd.append('conversation_id', convId);

    try {
      const resp = await fetch(API_IMAGE, {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data?.ok) {
        console.error('[CHAT IMAGE] error al subir imagen', data);
        return;
      }
      pushMessageToUI(data.message);
    } catch (err) {
      console.error('[CHAT IMAGE] excepción subiendo imagen', err);
    }
  }

  // hook del botón 📎 y fileInput
  if (btnAttach && fileInput) {
    btnAttach.addEventListener('click', (e) => {
      e.preventDefault();
      fileInput.click();
    });

    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;

      const type = file.type || '';
      if (type.startsWith('image/')) {
        pendingImage = file;
        pendingVideo = null;
        showImagePreview(file);
      } else if (type.startsWith('video/')) {
        pendingVideo = file;
        pendingImage = null;
        showVideoPreview(file);
      } else {
        console.warn('[CHAT MEDIA] tipo no soportado en fileInput:', type);
        pendingImage = null;
        pendingVideo = null;
        clearPreview();
      }

      // permitir elegir de nuevo la misma
      fileInput.value = '';
    });
  } else {
    console.warn('[CHAT MEDIA] btnAttach o fileInput NO encontrados');
  }

  // =====================================================
  //  3) AUDIO: grabación + envío (endpoint propio)
  // =====================================================

  let pressTimer = null;
  let isRecording = false;
  let mediaRecorder = null;
  let audioChunks = [];
  let lastTouchStart = 0;
  let discardNextAudio = false;

  const hasMediaDevices  = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
  const isTouchDevice    = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  console.log('[CHAT MEDIA] soporte audio:', {
    hasMediaDevices,
    hasMediaRecorder,
    protocol: location.protocol,
    host: location.hostname,
    isTouchDevice
  });

  async function startRecording() {
    if (!hasMediaDevices || !hasMediaRecorder) {
      console.warn('[CHAT AUDIO] navegador sin soporte');
      return;
    }

    if (location.protocol !== 'https:' &&
        location.hostname !== 'localhost' &&
        location.hostname !== '127.0.0.1') {
      console.warn('[CHAT AUDIO] bloqueado por protocolo no HTTPS');
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
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      isRecording = true;
      document.body.classList.add('chat-recording');
      if (btnSend) btnSend.textContent = '🎙';
    } catch (err) {
      console.error('[CHAT AUDIO] error getUserMedia', err);
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

  

async function enviarAudio(blob) {
  const convId = getConvId();
  if (!convId || !blob) return;

  const fd = new FormData();
  fd.append('file', blob, 'audio.webm');
  fd.append('kind', 'audio');
  fd.append('conversation_id', convId);
  fd.append('as', 'client'); // o owner si en el futuro lo diferenciás

  try {
    const resp = await fetch(API_AUDIO, {
      method: 'POST',
      body: fd,
      credentials: 'include',
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data?.ok) {
      console.error('[CHAT AUDIO] error al subir audio', data);
      return;
    }

    // 🔥 AQUI SE DISPARA EL RENDER
    if (data.message) {
      pushMessageToUI(data.message);
    }
  } catch (err) {
    console.error('[CHAT AUDIO] excepción subiendo audio', err);
  }
}


  // =====================================================
  //  4) VIDEO: preview + envío (endpoint propio)
  // =====================================================

  function showVideoPreview(file) {
    const cont = ensureMediaPreview();
    if (!cont) return;
    const url = URL.createObjectURL(file);
    cont.innerHTML = '';
    const video = document.createElement('video');
    video.src = url;
    video.controls = true;
    video.className = 'chat-media-thumb';
    cont.appendChild(video);
  }

  async function enviarVideo(file) {
    if (!file) return;
    const convId = getConvId();
    if (!convId) return;

    const fd = new FormData();
    fd.append('file', file, file.name || 'video.webm');
    fd.append('conversation_id', convId);

    try {
      const resp = await fetch(API_VIDEO, {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data?.ok) {
        console.error('[CHAT VIDEO] error al subir video', data);
        return;
      }
      pushMessageToUI(data.message);
    } catch (err) {
      console.error('[CHAT VIDEO] excepción subiendo video', err);
    }
  }

  // =====================================================
  //  5) LÓGICA DEL BOTÓN ▶ (texto / imagen / video / audio)
  // =====================================================

  function enviarPendientes() {
    const tieneTexto = (msgInput?.value || '').trim().length > 0;
    const tieneImg   = !!pendingImage;
    const tieneVid   = !!pendingVideo;

    // 1) TEXTO (usa TU función vieja)
    if (tieneTexto) {
      enviarTextoSiHay();
    }

    // 2) IMAGEN
    if (tieneImg) {
      enviarImagen(pendingImage);
      pendingImage = null;
    }

    // 3) VIDEO
    if (tieneVid) {
      enviarVideo(pendingVideo);
      pendingVideo = null;
    }

    // limpiar preview
    if (tieneImg || tieneVid) clearPreview();
  }

  // Desktop: click corto = enviar (texto + media), long-press = audio
  if (btnSend && !isTouchDevice) {
    btnSend.addEventListener('mousedown', (e) => {
      e.preventDefault();
      pressTimer = setTimeout(() => {
        discardNextAudio = false;
        startRecording();
      }, 400); // long-press
    });

    btnSend.addEventListener('mouseup', (e) => {
      e.preventDefault();
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
        if (isRecording) {
          stopRecording();
        } else {
          enviarPendientes(); // click normal
        }
      } else {
        if (isRecording) {
          stopRecording();
        } else {
          enviarPendientes();
        }
      }
    });

    btnSend.addEventListener('mouseleave', () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      if (isRecording) stopRecording();
    });
  }

  // Mobile: touchstart → empieza audio, touchend decide corto/largo
  if (btnSend && isTouchDevice) {
    btnSend.addEventListener('touchstart', (e) => {
      e.preventDefault();
      lastTouchStart = Date.now();
      discardNextAudio = false;
      startRecording();
    }, { passive: false });

    btnSend.addEventListener('touchend', (e) => {
      e.preventDefault();
      const dt = Date.now() - lastTouchStart;

      if (dt < 300) {
        // tap corto: descartar audio y usar como "enviar"
        discardNextAudio = true;
        stopRecording();
        enviarPendientes();
      } else {
        // long-press: solo audio
        discardNextAudio = false;
        stopRecording();
      }
    }, { passive: false });

    btnSend.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      discardNextAudio = true;
      stopRecording();
    }, { passive: false });
  }

}); // DOMContentLoaded



function renderMessageBubble(m) {
  const isClient = (m.role === 'client'); // o como lo estés usando
  const side = isClient ? 'msg--out' : 'msg--in'; // ejemplo

  let innerHTML = '';

  if (m.content_type === 'text') {
    innerHTML = `<p>${escapeHTML(m.content || '')}</p>`;
  } else if (m.content_type === 'image') {
    innerHTML = `<img src="${m.content}" class="msg-img" alt="imagen">`;
  }
  // 🔥 NUEVO: AUDIO
  else if (m.content_type === 'audio') {
    innerHTML = `
      <div class="msg-audio msg-audio--unread">
        <audio controls src="${m.content}"></audio>
      </div>
    `;
  }
  // en el futuro: video, etc.

  const div = document.createElement('div');
  div.className = `msg ${side}`;
  div.dataset.id = m.id;
  div.innerHTML = innerHTML;
  return div;
}
