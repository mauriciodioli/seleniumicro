# utils/audio_upload.py

import os
import time
import uuid
from werkzeug.utils import secure_filename
from flask import current_app, url_for

def save_audio_file_local(file_storage):
    """
    Guarda el archivo de audio en la carpeta STATIC del *mismo* Flask
    que después sirve /static.

    - Carpeta física:  <current_app.static_folder>/downloads/audio/
    - URL devuelta:    /static/downloads/audio/<filename>
    """

    if not file_storage:
        raise ValueError("No se recibió archivo de audio")

    # 1) Carpeta física real de /static
    static_dir = current_app.static_folder        # p.ej. /app/app/static
    folder = os.path.join(static_dir, "downloads", "audio")
    os.makedirs(folder, exist_ok=True)

    # 2) Nombre único
    original_name = file_storage.filename or "audio.webm"
    _, ext = os.path.splitext(original_name)
    ext = ext or ".webm"

    filename = f"audio_{int(time.time())}_{uuid.uuid4().hex[:8]}{ext}"
    filename = secure_filename(filename)

    # 3) Guardar archivo
    filepath = os.path.join(folder, filename)
    file_storage.save(filepath)

    # 4) URL pública relativa (coherente con static)
    public_rel_path = url_for(
        "static",
        filename=f"downloads/audio/{filename}",
        _external=False
    )
    # Esto devuelve algo tipo: "/static/downloads/audio/audio_....webm"

    return public_rel_path
