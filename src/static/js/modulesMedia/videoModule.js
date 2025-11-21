console.log('[CHAT VIDEO] Módulo cargado');

let pendingVideo = null;

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
    const resp = await fetch('/api/chat/api_chat_bp/video-upload/', {
      method: 'POST',
      body: fd,
      credentials: 'include',
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data?.ok) {
      console.error('[CHAT VIDEO] Error al subir video', data);
      return;
    }
    pushMessageToUI(data.message);
  } catch (err) {
    console.error('[CHAT VIDEO] Excepción al subir video', err);
  }
}

export { showVideoPreview, enviarVideo, pendingVideo };