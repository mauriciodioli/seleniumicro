console.log('[CHAT IMAGE] Módulo cargado');

let pendingImage = null;

function ensureMediaPreview() {
  console.log('[ensureMediaPreview] Verificando si existe #mediaPreview...');
  let previewContainer = document.getElementById('mediaPreview');
  if (!previewContainer) {
    console.log('[ensureMediaPreview] No existe, creando...');
    previewContainer = document.createElement('div');
    previewContainer.id = 'mediaPreview';
    previewContainer.className = 'chat-media-preview';

    // botón cerrar
    const closeButton = document.createElement('button');
    closeButton.className = 'close-btn';
    closeButton.innerText = '×';
    closeButton.addEventListener('click', () => {
      previewContainer.style.display = 'none';
      pendingImage = null;
    });
    previewContainer.appendChild(closeButton);

    document.body.appendChild(previewContainer);
  }

  // aseguramos que se vea
  previewContainer.style.display = 'block';
  return previewContainer;
}

function showImagePreview(file) {
  console.log('[showImagePreview] Iniciando vista previa...');
  const previewContainer = ensureMediaPreview();
  if (!previewContainer) return;

  const imageUrl = URL.createObjectURL(file);

  // ❗ NO usar innerHTML = '' → borraría el botón
  // En su lugar, borramos solo la imagen anterior
  const oldImg = previewContainer.querySelector('img.chat-media-thumb');
  if (oldImg) oldImg.remove();

  const imgElement = document.createElement('img');
  imgElement.src = imageUrl;
  imgElement.alt = 'Imagen adjunta';
  imgElement.className = 'chat-media-thumb';

  // el botón ya está, solo agregamos la nueva imagen
  previewContainer.appendChild(imgElement);

  pendingImage = file;
  console.log('[showImagePreview] Imagen pendiente:', pendingImage);
}


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

  try {
    console.log('[enviarImagen] Enviando la imagen al servidor...');
    const resp = await fetch('/api/chat/api_chat_bp/image-upload/', {
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

export { showImagePreview, enviarImagen, pendingImage };



