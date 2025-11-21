console.log('[CHAT IMAGE] Módulo cargado');

let pendingImage = null;

let mediaPreview = null;

function ensureMediaPreview() {
  console.log('[ensureMediaPreview] Verificando si existe #mediaPreview...');
  if (mediaPreview) {
    mediaPreview.style.display = 'block';
    return mediaPreview;
  }

  const chatInputBar = document.querySelector('.chat-input');
  if (!chatInputBar || !chatInputBar.parentElement) {
    console.warn('[ensureMediaPreview] No encontré .chat-input');
    return null;
  }

  mediaPreview = document.createElement('div');
  mediaPreview.id = 'mediaPreview';
  mediaPreview.className = 'chat-media-preview';

  // botón cerrar
  const closeButton = document.createElement('button');
  closeButton.className = 'close-btn';
  closeButton.innerText = '×';
  closeButton.addEventListener('click', () => {
    mediaPreview.style.display = 'none';
    mediaPreview.innerHTML = ''; // si querés limpiar imagen
    mediaPreview.appendChild(closeButton); // re-inyectar el botón
    pendingImage = null;
  });
  mediaPreview.appendChild(closeButton);

  // 👇 lo insertamos justo ANTES de la barra de input
  chatInputBar.parentElement.insertBefore(mediaPreview, chatInputBar);

  return mediaPreview;
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



