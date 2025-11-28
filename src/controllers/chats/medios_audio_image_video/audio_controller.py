# /workspaces/seleniumicro/src/controllers/chats/medios_audio_image_video/audio_controller.py

from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from extensions import db
from models.chats.message import Message
import os
from datetime import datetime
from utils.db_session import get_db_session
# 🚀 IMPORTAMOS EL HELPER NUEVO (desarrollo local)
from utils.audio_upload import save_audio_file_local
# from utils.audio_upload import save_audio_file_to_s3  # ← cuando escales

audio_controller = Blueprint("audio_controller", __name__, url_prefix="/api/chat")


# ==========================================================================
#     ENDPOINT *EXCLUSIVO* PARA SUBIR AUDIO (no toca texto ni imágenes)
# ==========================================================================
@audio_controller.route("/audio_controller/audio-upload/", methods=["POST"])
def upload_audio():
    """
    FormData:
      - file            : Blob (audio/webm)
      - conversation_id : int
      - as              : "client" | "owner" | "ia" (default: client)
    """

    conv_id = request.form.get("conversation_id")
    role    = (request.form.get("as") or "client").lower()
    file    = request.files.get("file")

    # 🔹 Validaciones mínimas
    if not conv_id or not file:
        return jsonify(ok=False, error="conversation_id y file son obligatorios"), 400

    if role not in {"client", "owner", "ia"}:
        role = "client"

    try:
        conv_id = int(conv_id)
    except ValueError:
        return jsonify(ok=False, error="conversation_id inválido"), 400

    try:
        # ================================================================
        # 1) Guardar localmente el archivo (mañana → S3)
        # ================================================================
        public_path = save_audio_file_local(file)

        # ================================================================
        # 2) Guardar mensaje en DB con session controlado
        # ================================================================
        

        with get_db_session() as session:
            msg = Message(
                conversation_id = conv_id,
                role            = role,
                via             = "dpia",
                content_type    = "audio",
                content         = public_path,
            )
            session.add(msg)
            session.commit()

            return jsonify(ok=True, message=_make_message_dict(msg))

    except Exception as e:
        return jsonify(ok=False, error=str(e)), 500



# ==========================================================================
#    FORMATO DE DEVOLUCIÓN (igual que para texto e imagen)
# ==========================================================================
def _make_message_dict(m: Message) -> dict:
    return {
        "id":           m.id,
        "role":         m.role,
        "via":          m.via,
        "content_type": m.content_type,
        "content":      m.content,
        "created_at":   m.created_at.isoformat()   if m.created_at   else None,
        "delivered_at": m.delivered_at.isoformat() if m.delivered_at else None,
        "read_at":      m.read_at.isoformat()      if m.read_at      else None,
    }

