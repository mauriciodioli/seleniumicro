# routes/api_chat.py
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from extensions import db
from models.chats.message import Message
from models.chats.conversation import Conversation
from models.usuario import Usuario  # si no lo usás acá, lo podés borrar
from models.chats.message_media import MessageMedia  
from datetime import datetime
from utils.db_session import get_db_session

# 👇 NUEVO IMPORT
from utils.imagen_upload import save_image_file_local

imagen_controller = Blueprint("imagen_controller", __name__, url_prefix="/api/chat")


# ==========================================================
#  (Opcional) Estos helpers ya no son necesarios si usás
#  la misma estructura que audio. Los podés borrar o dejar
#  comentados si no se usan en ningún otro lado.
# ==========================================================
"""
def _chat_upload_folder(kind: str) -> str:
    ...
def _save_media_file(file_storage, kind: str) -> str:
    ...
"""


def _make_message_dict(m: Message) -> dict:
    """
    Serializa un mensaje para el frontend.
    Incluye media si existe relación `media` en el modelo Message.
    """
    return {
        "id":           m.id,
        "role":         m.role,
        "via":          m.via,
        "content_type": m.content_type,
        "content":      m.content,
        "created_at":   m.created_at.isoformat()   if m.created_at   else None,
        "delivered_at": m.delivered_at.isoformat() if m.delivered_at else None,
        "read_at":      m.read_at.isoformat()      if m.read_at      else None,
        "media": [
            {
                "id":          mm.id,
                "media_type":  mm.media_type,
                "url":         mm.url,        # ahora va a ser /static/downloads/image/...
                "mime_type":   mm.mime_type,
                "duration_ms": mm.duration_ms,
                "metadata":    mm.metadata_json,
            }
            for mm in getattr(m, "media", []) or []
        ],
    }


# ==========================================================
#  ENDPOINT: SUBIDA DE IMÁGENES
# ==========================================================

@imagen_controller.route("/imagen_controller/image-upload/", methods=["POST"])
def image_upload():
    """
    SUBIDA DE IMÁGENES
    Form-data:
      - file            (imagen)
      - conversation_id
      - as              (client|owner|ia) opcional
      - caption         opcional
    """
    conv_id = request.form.get("conversation_id")
    role    = (request.form.get("as") or "client").lower()
    caption = (request.form.get("caption") or "").strip()
    file    = request.files.get("file")

    if not conv_id or not file:
        return jsonify(ok=False, error="conversation_id y file son obligatorios"), 400

    try:
        conv_id = int(conv_id)
    except ValueError:
        return jsonify(ok=False, error="conversation_id inválido"), 400

    if role not in {"client", "owner", "ia"}:
        role = "client"

    # validación básica de tipo
    if not (file.mimetype or "").startswith("image/"):
        return jsonify(ok=False, error="Tipo de archivo no soportado. Solo imagen."), 400

    session = get_db_session()

    try:
        # 1) guardar archivo igual que audio, pero en downloads/image/
        public_url = save_image_file_local(file)
        # Ejemplo: "/static/downloads/image/img_12345678_abcd1234.png"

        # Si querés mezclar caption en content, lo mantenemos:
        content = public_url
        if caption:
            content = f"{public_url}||{caption}"

        # 2) crear Message
        msg = Message(
            conversation_id = conv_id,
            role            = role,
            via             = "dpia",
            content_type    = "image",
            content         = content,
            created_at      = datetime.utcnow(),
        )
        session.add(msg)
        session.flush()  # para tener msg.id

        # 3) crear MessageMedia (nuevo)
        media = MessageMedia(
            message_id    = msg.id,
            media_type    = "image",
            url           = public_url,      # ya viene listo para usar en el front
            mime_type     = file.mimetype,
            duration_ms   = None,
            metadata_json = None,
        )
        session.add(media)

        session.commit()

        return jsonify(ok=True, message=_make_message_dict(msg)), 200

    except Exception as e:
        session.rollback()
        current_app.logger.exception("Error en image_upload")
        return jsonify(ok=False, error="server_error"), 500
    finally:
        session.close()
