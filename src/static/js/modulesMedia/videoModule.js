// static/js/modulesMedia/videoModule.js

console.log('[CHAT VIDEO] Módulo cargado');

// Lista de videos pendientes de enviar: [{ file, chip }]
let pendingVideos = [];
let chipsContainer = null;

/**
 * Devuelve o crea el contenedor de chips dentro de la barra,
 * compartido con imágenes (#chatMediaChips).
 */
function ensureChipsContainer() {
  if (chipsContainer && document.body.contains(chipsContainer)) {
    return chipsContainer;
  }

  // Si ya existe (porque lo creó imagenModule), lo reutilizamos
  let container = document.getElementById('chatMediaChips');
  if (container && document.body.contains(container)) {
    chipsContainer = container;
    return chipsContainer;
  }

  // Si no existe, lo creamos igual que en imagenModule
  const input = document.getElementById('msgInput');
  if (!input) {
    console.warn('[CHAT VIDEO] No encontré #msgInput');
    return null;
  }

  const wrapper = input.closest('.chat-input-inner') || input.closest('.chat-input');
  if (!wrapper) {
    console.warn('[CHAT VIDEO] No encontré .chat-input-inner ni .chat-input');
    return null;
  }

  container = document.createElement('div');
  container.id = 'chatMediaChips';
  container.className = 'chat-media-chips';

  wrapper.insertBefore(container, input);
  chipsContainer = container;
  return chipsContainer;
}

/**
 * Añade un chip de video (preview) tipo ChatGPT.
 */
function showVideoPreview(file) {
  console.log('[showVideoPreview] preview de video...', file?.name);
  const container = ensureChipsContainer();
  if (!container) return;

  const idx = pendingVideos.length;

  const chip = document.createElement('div');
  chip.className = 'chat-media-chip chat-media-chip-video';
  chip.dataset.index = String(idx);

  const video = document.createElement('video');
  video.src = URL.createObjectURL(file);
  video.muted = true;
  video.loop = true;
  video.autoplay = true;
  video.playsInline = true;

  const btnClose = document.createElement('button');
  btnClose.type = 'button';
  btnClose.className = 'chat-media-chip-close';
  btnClose.textContent = '✕';

  btnClose.addEventListener('click', () => {
    removeVideoChip(chip);
  });

  chip.appendChild(video);
  chip.appendChild(btnClose);
  container.appendChild(chip);

  pendingVideos.push({ file, chip });

  console.log('[CHAT VIDEO] Videos pendientes:', pendingVideos.length);
}

/**
 * Elimina un chip concreto y actualiza el array pendingVideos.
 * No borra los chips de imagen, solo el suyo.
 */
function removeVideoChip(chipEl) {
  const idxStr = chipEl.dataset.index;
  const idx = idxStr != null ? Number(idxStr) : -1;

  chipEl.remove();

  if (idx >= 0 && idx < pendingVideos.length) {
    pendingVideos.splice(idx, 1);
  }

  // reindexar
  pendingVideos.forEach((item, i) => {
    item.chip.dataset.index = String(i);
  });

  console.log('[CHAT VIDEO] Videos pendientes tras remove:', pendingVideos.length);
}

/**
 * Limpia SOLO los chips de video (después de enviar).
 * No limpia el contenedor completo para no tocar las imágenes.
 */
function clearAllVideoPreviews() {
  pendingVideos.forEach(({ chip }) => chip.remove());
  pendingVideos = [];

  // NO limpiamos chipsContainer.innerHTML porque ahí también puede haber imágenes
  const fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.value = '';
  }

  console.log('[CHAT VIDEO] clearAllVideoPreviews completado');
}

/**
 * Envía UN video al backend.
 * Usa el mismo esquema que audio/imagen: conversation_id + file.
 */
async function enviarVideo(file) {
  console.log('[enviarVideo] Iniciando envío de video...');
  if (!file) {
    console.error('[enviarVideo] No se proporcionó archivo de video.');
    return;
  }

  const convId = getConvId();
  if (!convId) {
    console.error('[enviarVideo] No se encontró conversation_id.');
    return;
  }

  // 🔹 quién soy yo
  const viewerId = Number(window.usuario_id || window.VIEWER_USER_ID || 0);

  let soyOwner = false;
  try {
    if (typeof window.viewerIsOwner === 'function') {
      soyOwner = !!window.viewerIsOwner();   // devuelve true/false
    }
  } catch (e) {
    console.warn('[enviarVideo] no pude resolver viewerIsOwner, asumo client');
  }

  const role = soyOwner ? 'owner' : 'client';
  console.log('[enviarVideo] role resuelto para video:', role, 'viewerId:', viewerId);

  const fd = new FormData();
  fd.append('file', file, file.name || 'video.mp4');
  fd.append('conversation_id', convId);
  fd.append('viewer_user_id', viewerId);  // igual que en imagen
  fd.append('as', role);                  // 'owner' o 'client'

  try {
    const resp = await fetch('/api/chat/video_controller/video-upload/', {
      method: 'POST',
      body: fd,
      credentials: 'include',
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data?.ok) {
      console.error('[enviarVideo] Error al subir video:', data);
      return;
    }
    console.log('[enviarVideo] Video subido OK:', data);
    pushMessageToUI(data.message);
  } catch (err) {
    console.error('[enviarVideo] Excepción al subir video:', err);
  }
}

export {
  showVideoPreview,
  enviarVideo,
  pendingVideos,
  clearAllVideoPreviews,
};
