# routes/api_chat.py
from flask import Blueprint, request, jsonify, current_app, url_for
from werkzeug.utils import secure_filename
from extensions import db
from models.chats.message import Message
from models.chats.conversation import Conversation
from models.usuario import Usuario  # ajustá al nombre real
from utils.phone import normalize_phone
from utils.chat_users import get_or_create_user_from_phone
from utils.chat_contacts import get_or_create_contacto_personal
from utils.chat_conversation import get_or_create_conversation
import os
from sqlalchemy import func
from datetime import datetime
from utils.db_session import get_db_session
from sqlalchemy import or_, and_


video_controller = Blueprint("video_controller", __name__, url_prefix="/api/chat")



# ==========================================================
#  NUEVOS ENDPOINTS: IMAGEN / AUDIO / VIDEO
#  (NO MEZCLAN NADA CON EL DE TEXTO)
# ==========================================================

def _chat_upload_folder(kind: str) -> str:
  """
  Devuelve la carpeta absoluta donde guardar media del chat.
  kind: "image" | "audio" | "video"
  """
  base = current_app.config.get("CHAT_UPLOAD_FOLDER",
                                os.path.join(current_app.root_path, "static", "chat_uploads"))
  folder = os.path.join(base, kind)
  os.makedirs(folder, exist_ok=True)
  return folder


def _save_media_file(file_storage, kind: str) -> str:
  """
  Guarda el archivo en static/chat_uploads/<kind>/ y devuelve
  la ruta relativa para guardar en Message.content.
  Ej:  "chat_uploads/image/20251118_123456_foto.png"
  """
  if not file_storage:
      raise ValueError("file requerido")

  filename = secure_filename(file_storage.filename or f"{kind}.bin")
  # prefijo con fecha/hora para evitar colisiones
  ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
  name, ext = os.path.splitext(filename)
  filename = f"{ts}_{name}{ext}"

  folder = _chat_upload_folder(kind)
  abs_path = os.path.join(folder, filename)
  file_storage.save(abs_path)

  # ruta relativa desde /static
  # base static/chat_uploads/... → nos quedamos con "chat_uploads/..."
  rel_root = os.path.relpath(abs_path,
                             os.path.join(current_app.root_path, "static"))
  rel_root = rel_root.replace("\\", "/")
  return rel_root


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





@video_controller.route("/video_controller/video-upload/", methods=["POST"])
def upload_video():
    """
    SUBIDA DE VIDEO
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

    if role not in {"client", "owner", "ia"}:
        role = "client"

    try:
        rel_path = _save_media_file(file, "video")

        content = rel_path
        if caption:
            content = f"{rel_path}||{caption}"

        msg = Message(
            conversation_id = conv_id,
            role            = role,
            via             = "dpia",
            content_type    = "video",
            content         = content,
        )
        db.session.add(msg)
        db.session.commit()

        return jsonify(ok=True, message=_make_message_dict(msg))

    except Exception as e:
        db.session.rollback()
        return jsonify(ok=False, error=str(e)), 500
