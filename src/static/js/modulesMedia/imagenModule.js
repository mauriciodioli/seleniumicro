console.log('[CHAT IMAGE] Módulo cargado');

let pendingImage = null;

function ensureMediaPreview() {
  console.log('[ensureMediaPreview] Verificando si el contenedor de vista previa existe...');
  let previewContainer = document.getElementById('mediaPreview');
  if (!previewContainer) {
    console.log('[ensureMediaPreview] Contenedor no encontrado. Creando uno nuevo...');
    // Si el contenedor no existe, crearlo dinámicamente
    previewContainer = document.createElement('div');
    previewContainer.id = 'mediaPreview';
    previewContainer.className = 'chat-media-preview';

    // Append to the chat panel instead of the body
    const chatPanel = document.getElementById('chatPanel');
    if (chatPanel) {
      chatPanel.appendChild(previewContainer);
    } else {
      console.warn('[ensureMediaPreview] No se encontró el panel de chat. Agregando al body.');
      document.body.appendChild(previewContainer);
    }
  } else {
    console.log('[ensureMediaPreview] Contenedor encontrado.');
  }
  return previewContainer;
}
function showImagePreview(file) {
  console.log('[showImagePreview] Iniciando vista previa de la imagen...');
  const previewContainer = ensureMediaPreview(); // Asegurarse de que el contenedor exista
  if (!previewContainer) {
    console.error('[showImagePreview] Contenedor de vista previa no encontrado.');
    return;
  }

  console.log('[showImagePreview] Creando URL para la imagen seleccionada...');
  const imageUrl = URL.createObjectURL(file);

  console.log('[showImagePreview] Limpiando contenido previo del contenedor...');
  previewContainer.innerHTML = '';

  console.log('[showImagePreview] Creando elemento de imagen...');
  const imgElement = document.createElement('img');
  imgElement.src = imageUrl;
  imgElement.alt = 'Imagen adjunta';
  imgElement.className = 'chat-media-thumb';

  console.log('[showImagePreview] Agregando la imagen al contenedor...');
  previewContainer.appendChild(imgElement);

  // Guardar la imagen pendiente para su envío
  pendingImage = file;
  console.log('[showImagePreview] Imagen pendiente guardada:', pendingImage);
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



