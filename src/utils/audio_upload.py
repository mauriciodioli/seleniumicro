# utils/audio_upload.py

import os
import time
import uuid
from werkzeug.utils import secure_filename
from flask import current_app

def save_audio_file_local(file_storage):
    """
    Guarda el archivo de audio en una carpeta local (solo para entorno de desarrollo/test).

    - Ruta usada: /workspaces/seleniumicro/src/static/downloads/audio/
    - Genera un nombre único para evitar conflictos.
    - Devuelve la **ruta pública relativa**, para usar en Message.content.

    Cuando pases a AWS/S3, solo reemplazás la lógica dentro de esta función.
    """

    if not file_storage:
        raise ValueError("No se recibió archivo de audio")

    # 📌 1) Carpeta absoluta local (modificá según tu entorno real si cambia)
    # Usamos `current_app.root_path` como base para estar seguros en Flask
    base_dir = current_app.root_path  # /workspaces/seleniumicro/src
    folder = os.path.join(base_dir, "static", "downloads", "audio")
    os.makedirs(folder, exist_ok=True)

    # 📌 2) Generar nombre único
    original_name = file_storage.filename or "audio.webm"
    _, ext = os.path.splitext(original_name)
    ext = ext or ".webm"
    filename = f"audio_{int(time.time())}_{uuid.uuid4().hex[:8]}{ext}"
    filename = secure_filename(filename)

    # 📌 3) Guardar físicamente el archivo
    filepath = os.path.join(folder, filename)
    file_storage.save(filepath)

    # 📌 4) Crear ruta pública relativa
    # Será accesible desde: /static/downloads/audio/<filename>
    public_rel_path = f"/static/downloads/audio/{filename}"

    return public_rel_path


# ====================================================
# ⚠️ PROXIMA IMPLEMENTACIÓN: Guardado en AWS S3
# ====================================================
#
# def save_audio_file_to_s3(file_storage):
#     """
#     Guarda el archivo en un bucket de AWS S3.
#     Devuelve la URL pública del archivo.
#     (Implementación se activará cuando escales).
#     """
#     # Ejemplo (no activar todavía):
#     # import boto3
#     # ...
#     # s3.upload_fileobj(...)
#     # return f"https://{bucket}.s3.{region}.amazonaws.com/{key}"
#
# ====================================================
