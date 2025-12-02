console.log('[CHAT IMAGE] Módulo cargado');

// Ahora soportamos VARIAS imágenes
let pendingImages = [];       // [{ file, chip }]
let chipsContainer = null;   // contenedor de los chips (dentro de la barra)

/**
 * Devuelve o crea el contenedor de chips dentro de la barra,
 * antes del input de texto #msgInput.
 */
function ensureChipsContainer() {
  if (chipsContainer && document.body.contains(chipsContainer)) {
    return chipsContainer;
  }

  const input = document.getElementById('msgInput');   // 👈 AQUÍ VA ESO
  if (!input) {
    console.warn('[CHAT IMAGE] No encontré #msgInput');
    return null;
  }

  // buscamos el contenedor más cercano de la barra del chat
  const wrapper = input.closest('.chat-input-inner') || input.closest('.chat-input');
  if (!wrapper) {
    console.warn('[CHAT IMAGE] No encontré .chat-input-inner ni .chat-input');
    return null;
  }

  chipsContainer = document.createElement('div');
  chipsContainer.id = 'chatMediaChips';
  chipsContainer.className = 'chat-media-chips';

  // insertamos los chips ANTES del input de texto
  wrapper.insertBefore(chipsContainer, input);

  return chipsContainer;
}

/**
 * Añade una imagen como chip de preview (tipo ChatGPT).
 */
function showImagePreview(file) {
  console.log('[showImagePreview] Iniciando vista previa como chip...');
  const container = ensureChipsContainer();
  if (!container) return;

  const idx = pendingImages.length;

  const chip = document.createElement('div');
  chip.className = 'chat-media-chip';
  chip.dataset.index = String(idx);

  const img = document.createElement('img');
  img.src = URL.createObjectURL(file);
  img.alt = 'Imagen adjunta';

  const btnClose = document.createElement('button');
  btnClose.type = 'button';
  btnClose.className = 'chat-media-chip-close';
  btnClose.textContent = '✕';

  btnClose.addEventListener('click', () => {
    removeImageChip(chip);
  });

  chip.appendChild(img);
  chip.appendChild(btnClose);
  container.appendChild(chip);

  pendingImages.push({ file, chip });

  console.log('[CHAT IMAGE] Imágenes pendientes:', pendingImages.length);
}

/**
 * Elimina un chip concreto y actualiza el array pendingImages.
 */
function removeImageChip(chipEl) {
  const idxStr = chipEl.dataset.index;
  const idx = idxStr != null ? Number(idxStr) : -1;

  chipEl.remove();

  if (idx >= 0 && idx < pendingImages.length) {
    pendingImages.splice(idx, 1);
  }

  // reindexamos los dataset.index de los chips restantes
  pendingImages.forEach((item, i) => {
    item.chip.dataset.index = String(i);
  });

  if (pendingImages.length === 0 && chipsContainer) {
    chipsContainer.innerHTML = '';
  }
}

/**
 * Limpia TODOS los chips (después de enviar).
 */
function clearAllImagePreviews() {
  pendingImages.forEach(({ chip }) => {
    chip.remove();
  });
  pendingImages = [];

  if (chipsContainer) {
    chipsContainer.innerHTML = '';
  }

  const fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.value = '';
  }
}

/**
 * Envía UNA imagen al backend (tu lógica anterior).
 */
async function enviarImagen(file) {
  console.log('[enviarImagen] Iniciando envío de la imagen...');
  if (!file) {
    console.error('[enviarImagen] No se proporcionó un archivo para enviar.');
    return;
  }

  const convId = getConvId();
  if (!convId) {
    console.error('[enviarImagen] No se encontró un ID de conversación.');
    return;
  }

  console.log('[enviarImagen] Creando FormData para el archivo...');
  const fd = new FormData();
  fd.append('file', file, file.name || 'image.png');
  fd.append('conversation_id', convId);
  // si manejás roles: fd.append('as', 'client');

  try {
    console.log('[enviarImagen] Enviando la imagen al servidor...');
    const resp = await fetch('/api/chat/imagen_controller/image-upload/', {
      method: 'POST',
      body: fd,
      credentials: 'include',
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data?.ok) {
      console.error('[enviarImagen] Error al subir la imagen:', data);
      return;
    }
    console.log('[enviarImagen] Imagen subida con éxito. Respuesta del servidor:', data);
    pushMessageToUI(data.message);
  } catch (err) {
    console.error('[enviarImagen] Excepción al subir la imagen:', err);
  }
}

export {
  showImagePreview,
  enviarImagen,
  pendingImages,
  clearAllImagePreviews,
};
