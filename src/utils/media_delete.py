# utils/media_delete.py

import os
import time
import uuid
from werkzeug.utils import secure_filename
from flask import current_app, url_for


def delete_media_file_local(public_url: str) -> bool:
    """
    Borra un archivo de imagen/video guardado en static, a partir de la URL pública
    guardada en message.content o message_media.url.

    Ej:
      /chat/static/downloads/image/img_123...
      /chat/static/downloads/video/video_123...

    Devuelve True/False según éxito.
    """
    if not public_url:
        return False

    try:
        idx = public_url.find("/static/")
        if idx == -1:
            current_app.logger.warning(
                "delete_media_file_local: URL sin /static/: %s", public_url
            )
            return False

        rel_path = public_url[idx + len("/static/"):]  # downloads/...

        static_dir = current_app.static_folder  # p.ej. /app/app/static
        fs_path = os.path.join(static_dir, rel_path)

        if os.path.exists(fs_path):
            os.remove(fs_path)
            current_app.logger.info("delete_media_file_local: borrado %s", fs_path)
            return True

        current_app.logger.warning(
            "delete_media_file_local: no existe %s (url=%s)",
            fs_path,
            public_url,
        )
        return False

    except Exception:
        current_app.logger.exception(
            "delete_media_file_local: excepción al borrar %s", public_url
        )
        return False

