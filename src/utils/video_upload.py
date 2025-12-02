# utils/video_upload.py
import os
import time
import uuid
from werkzeug.utils import secure_filename
from flask import current_app, url_for

def save_video_file_local(file_storage):
    """
    Guarda el video en STATIC, igual que audio:

    - Carpeta física:  <current_app.static_folder>/downloads/video/
    - URL devuelta:    /static/downloads/video/<filename>
    """
    if not file_storage:
        raise ValueError("No se recibió archivo de video")

    static_dir = current_app.static_folder
    folder = os.path.join(static_dir, "downloads", "video")
    os.makedirs(folder, exist_ok=True)

    original_name = file_storage.filename or "video.mp4"
    _, ext = os.path.splitext(original_name)
    ext = ext or ".mp4"

    filename = f"video_{int(time.time())}_{uuid.uuid4().hex[:8]}{ext}"
    filename = secure_filename(filename)

    filepath = os.path.join(folder, filename)
    file_storage.save(filepath)

    public_rel_path = url_for(
        "static",
        filename=f"downloads/video/{filename}",
        _external=False
    )
    return public_rel_path
