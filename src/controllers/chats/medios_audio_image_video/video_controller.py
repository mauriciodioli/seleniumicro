# controllers/chats/medios_audio_image_video/video_controller.py

from flask import Blueprint, request, jsonify, current_app
from datetime import datetime

from extensions import db  # si no lo usás, lo podés eliminar
from models.chats.message import Message
from models.chats.message_media import MessageMedia
from utils.db_session import get_db_session
from utils.video_upload import save_video_file_local


video_controller = Blueprint(
    "video_controller",
    __name__,
    url_prefix="/api/chat"
)


def _make_message_dict(m: Message) -> dict:
    """
    Serializa un mensaje para el frontend (igual que en imagen_controller).
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
                "url":         mm.url,
                "mime_type":   mm.mime_type,
                "duration_ms": mm.duration_ms,
                "metadata":    mm.metadata_json,
            }
            for mm in getattr(m, "media", []) or []
        ],
    }


@video_controller.route("/video_controller/video-upload/", methods=["POST"])
def video_upload():
    """
    SUBIDA DE VIDEOS
    Form-data:
      - file            (video)
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

    # Solo videos
    if not (file.mimetype or "").startswith("video/"):
        return jsonify(ok=False, error="Tipo de archivo no soportado. Solo video."), 400

    try:
        with get_db_session() as session:
            # 1) guardar archivo local
            public_url = save_video_file_local(file)
            content = f"{public_url}||{caption}" if caption else public_url

            # 2) crear Message
            msg = Message(
                conversation_id = conv_id,
                role            = role,
                via             = "dpia",
                content_type    = "video",
                content         = content,
                created_at      = datetime.utcnow(),
            )
            session.add(msg)
            session.flush()  # msg.id

            # 3) crear MessageMedia
            media = MessageMedia(
                message_id    = msg.id,
                media_type    = "video",
                url           = public_url,
                mime_type     = file.mimetype,
                duration_ms   = None,
                metadata_json = None,
            )
            session.add(media)

            message_dict = _make_message_dict(msg)

        return jsonify(ok=True, message=message_dict), 200

    except Exception as e:
        current_app.logger.exception("Error en video_upload: %s", e)
        return jsonify(ok=False, error="server_error"), 500
