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


api_chat_bp = Blueprint("api_chat_bp", __name__, url_prefix="/api/chat")

@api_chat_bp.route("/api_chat_bp/open/", methods=["POST"])
def open_conversation():
    data   = request.get_json() or {}
    scope  = data.get("scope")  or {}
    client = data.get("client") or {}

    current_app.logger.info("[OPEN_CHAT] payload bruto data=%s", data)
    current_app.logger.info("[OPEN_CHAT] scope=%s client=%s", scope, client)

    # Ojo: publicacion_id puede venir string
    publicacion_id = scope.get("publicacion_id") or 0
    try:
        publicacion_id = int(publicacion_id)
    except (TypeError, ValueError):
        publicacion_id = 0

    try:
        # ========== 1) DATOS QUE YA VIENEN DEL FRONT ==========

        raw_tel = (client.get("tel") or "").strip()
        tel = normalize_phone(raw_tel)
        if not tel:
            return jsonify(ok=False, error="Falta teléfono del cliente"), 400

        cu_id = client.get("user_id")
        if not cu_id:
            return jsonify(ok=False, error="Falta client.user_id en el payload"), 400
        try:
            # ⚠️ ESTE ES EL QUE LLAMA AL ENDPOINT (VIEWER)
            viewer_user_id = int(cu_id)
        except (TypeError, ValueError):
            return jsonify(ok=False, error="client.user_id inválido"), 400

        # Por defecto asumimos que el "cliente" es quien llama
        client_user_id = viewer_user_id

        owner_user_id = scope.get("owner_user_id")
        if not owner_user_id:
            return jsonify(ok=False, error="Falta owner_user_id en scope"), 400
        try:
            owner_user_id = int(owner_user_id)
        except (TypeError, ValueError):
            return jsonify(ok=False, error="owner_user_id inválido"), 400

        # 👇 viene del front como targetId_raw (id del contacto / botón)
        target_user_id = data.get("targetId_raw")

        current_app.logger.info(
            "[OPEN_CHAT] viewer_user_id=%s owner_user_id=%s target_user_id=%s tel=%s",
            viewer_user_id, owner_user_id, target_user_id, tel
        )

        dominio = scope.get("dominio") or "tecnologia"
        locale  = scope.get("locale")  or "es"

        ambito_id    = scope.get("ambito_id")
        categoria_id = scope.get("categoria_id")

        codigo_postal    = scope.get("codigo_postal")
        codigo_postal_id = scope.get("codigo_postal_id")

        if isinstance(ambito_id, str) and ambito_id.isdigit():
            ambito_id = int(ambito_id)
        if isinstance(categoria_id, str) and categoria_id.isdigit():
            categoria_id = int(categoria_id)
        if isinstance(codigo_postal_id, str) and codigo_postal_id.isdigit():
            codigo_postal_id = int(codigo_postal_id)

        ambito_slug    = scope.get("ambito_slug")
        categoria_slug = scope.get("categoria_slug")

        alias = client.get("alias")
        email = client.get("email")

        # ========== 1.5) NORMALIZAR PAREJA OWNER/CLIENTE ==========

        # Caso: el que abre es el dueño del ámbito (panel servidor)
        # → el cliente real es target_user_id
        if viewer_user_id == owner_user_id:
            current_app.logger.info(
                "[OPEN_CHAT] viewer == owner → modo SERVIDOR, usar target como cliente"
            )
            if not target_user_id:
                return jsonify(ok=False, error="Falta targetId_raw para owner del ámbito"), 400
            try:
                client_user_id = int(target_user_id)
            except (TypeError, ValueError):
                return jsonify(ok=False, error="targetId_raw inválido"), 400
        else:
            current_app.logger.info(
                "[OPEN_CHAT] viewer != owner → modo CLIENTE, client_user_id = viewer_user_id (%s)",
                client_user_id
            )

        # ========== 1.6) QUIÉN SOY YO EN ESTA CONVERSACIÓN ==========

        # "servidor" = el que puede iniciar la conversación (dueño de ámbito / sistema)
        i_am_server = (viewer_user_id == owner_user_id)
        viewer_role = "owner" if i_am_server else "client"

        current_app.logger.info(
            "[OPEN_CHAT] RESULT ROLES -> viewer_user_id=%s, owner_user_id=%s, client_user_id=%s, "
            "i_am_server=%s, viewer_role=%s",
            viewer_user_id, owner_user_id, client_user_id, i_am_server, viewer_role
        )

        # ========== 2) CONVERSACIÓN ==========

        with get_db_session() as session:
            conv = find_or_create_conversation_for_pair(
                session=session,
                owner_user_id=owner_user_id,
                client_user_id=client_user_id,
                dominio=dominio,
                ambito_id=ambito_id,
                categoria_id=categoria_id,
                codigo_postal=codigo_postal,
                codigo_postal_id=codigo_postal_id,
                locale=locale,
                publicacion_id=publicacion_id,
            )

            current_app.logger.info(
                "[OPEN_CHAT] CONVERSATION id=%s owner=%s client=%s",
                conv.id, owner_user_id, client_user_id
            )

            msgs = (
                session
                .query(Message)
                .filter_by(conversation_id=conv.id)
                .order_by(Message.id.asc())
                .all()
            )

            is_new = (len(msgs) == 0)
            current_app.logger.info(
                "[OPEN_CHAT] conversation_id=%s, mensajes_existentes=%s, is_new=%s",
                conv.id, len(msgs), is_new
            )

            def msg_to_dict(m: Message) -> dict:
                return {
                    "id":           m.id,
                    "role":         m.role,
                    "via":          m.via,
                    "content_type": m.content_type,
                    "content":      m.content,
                    "created_at":   m.created_at.isoformat() if m.created_at else None,
                    "intent":       m.intent,
                    "emotion":      m.emotion,
                    "confidence":   m.confidence,
                    "labels":       m.labels_json,
                }

            messages_json = [msg_to_dict(m) for m in msgs]

            from_summary = " · ".join(
                x for x in [
                    dominio or "",
                    ambito_slug or "",
                    categoria_slug or "",
                    codigo_postal or "",
                ] if x
            )

            current_app.logger.info(
                "[OPEN_CHAT] RESPUESTA -> conv_id=%s owner=%s client=%s viewer=%s(%s) is_server=%s",
                conv.id, owner_user_id, client_user_id,
                viewer_user_id, viewer_role, i_am_server
            )

            return jsonify(
                ok=True,
                conversation_id=conv.id,
                is_new=is_new,
                from_summary=from_summary,
                scope={
                    "id":               conv.scope_id,
                    "owner_user_id":    owner_user_id,
                    "client_user_id":   client_user_id,
                    "dominio":          dominio,
                    "locale":           locale,
                    "ambito_id":        ambito_id,
                    "categoria_id":     categoria_id,
                    "codigo_postal":    codigo_postal,
                    "codigo_postal_id": codigo_postal_id,
                    "publicacion_id":   publicacion_id,
                },
                client={
                    "id":    client_user_id,
                    "tel":   tel,
                    "alias": alias,
                    "email": email,
                },
                viewer={
                    "id":        viewer_user_id,
                    "role":      viewer_role,   # "owner" o "client"
                    "is_server": i_am_server,   # True/False
                },
                messages=messages_json,
            )

    except Exception as e:
        current_app.logger.exception("Error en /api_chat_bp/open/")
        return jsonify(ok=False, error=str(e)), 500



def find_or_create_conversation_for_pair(
    session,
    *,
    owner_user_id: int,
    client_user_id: int,
    dominio: str,
    ambito_id: int,
    categoria_id: int,
    codigo_postal: str,
    codigo_postal_id: int,
    locale: str,
    publicacion_id: int | None = None,
) -> Conversation:
    """
    Garantiza UNA sola conversación para el par {owner_user_id, client_user_id}
    (sin importar el orden) + publicacion_id opcional.
    """

    # Normalizamos None si viene 0
    pub_id = publicacion_id or None

    # 1) Buscar conversación existente para el PAR DESORDENADO {owner, client}
    conv = (
        session.query(Conversation)
        .filter(
            or_(
                and_(
                    Conversation.owner_user_id == owner_user_id,
                    Conversation.client_user_id == client_user_id,
                ),
                and_(
                    Conversation.owner_user_id == client_user_id,
                    Conversation.client_user_id == owner_user_id,
                ),
            ),
            Conversation.publicacion_id == pub_id,
        )
        .order_by(Conversation.id.asc())  # agarro la más vieja
        .first()
    )

    if conv:
        # Opcional: realinear para que quede siempre owner=dueño actual
        if conv.owner_user_id != owner_user_id or conv.client_user_id != client_user_id:
            conv.owner_user_id = owner_user_id
            conv.client_user_id = client_user_id
            session.flush()
        return conv

    # 2) Si no existe ninguna, se crea usando tu helper actual
    conv = get_or_create_conversation(
        owner_user_id=owner_user_id,
        client_user_id=client_user_id,
        dominio=dominio,
        ambito_id=ambito_id,
        categoria_id=categoria_id,
        codigo_postal=codigo_postal,
        codigo_postal_id=codigo_postal_id,
        locale=locale,
        publicacion_id=pub_id,
        session=session,
    )
    return conv


@api_chat_bp.route("/api_chat_bp/messages/", methods=["POST"])
def get_messages():
    data    = request.get_json() or {}
    conv_id = data.get("conversation_id")
    if not conv_id:
        return jsonify(ok=False, error="conversation_id requerido"), 400

    # conv_id puede venir como string
    try:
        conv_id = int(conv_id)
    except (TypeError, ValueError):
        return jsonify(ok=False, error="conversation_id inválido"), 400

    try:
        with get_db_session() as session:
            msgs = (
                session.query(Message)
                       .filter_by(conversation_id=conv_id)
                       .order_by(Message.created_at.asc())
                       .all()
            )

            payload = [{
                "id":           m.id,
                "role":         m.role,
                "via":          m.via,
                "content_type": m.content_type,
                "content":      m.content,
                "created_at":   m.created_at.isoformat() if m.created_at else None,
            } for m in msgs]

            return jsonify(ok=True, messages=payload)

    except Exception as e:
        current_app.logger.exception("Error en /api_chat_bp/messages/")
        return jsonify(ok=False, error=str(e)), 500

@api_chat_bp.route("/api_chat_bp/send/", methods=["POST"])
def send():
    data    = request.get_json() or {}
    conv_id = data.get("conversation_id")
    text    = (data.get("text") or "").strip()
    role    = (data.get("as") or "client").lower()  # viene del front

    if not conv_id or not text:
        return jsonify(ok=False, error="conversation_id y text son obligatorios"), 400

    try:
        conv_id = int(conv_id)
    except (TypeError, ValueError):
        return jsonify(ok=False, error="conversation_id inválido"), 400

    if role not in {"client", "owner", "ia"}:
        role = "client"

    try:
        with get_db_session() as session:

            conv = (
                session.query(Conversation)
                       .filter(Conversation.id == conv_id)
                       .first()
            )
            if not conv:
                return jsonify(ok=False, error="conversation no encontrada"), 404

            msg = Message(
                conversation_id = conv.id,
                role            = role,
                via             = "dpia",
                content_type    = "text",
                content         = text,
            )
            session.add(msg)
            session.flush()  # para tener msg.id

            conv.updated_at = func.now()  # asegúrate de tener from sqlalchemy import func

            return jsonify(
                ok=True,
                message={
                    "id":           msg.id,
                    "role":         msg.role,
                    "via":          msg.via,
                    "content_type": msg.content_type,
                    "content":      msg.content,
                    "created_at":   msg.created_at.isoformat() if msg.created_at else None,
                }
            )

    except Exception as e:
        current_app.logger.exception("Error en /api_chat_bp/send")
        return jsonify(ok=False, error=str(e)), 500


    


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
      "id": m.id,
      "role": m.role,
      "via": m.via,
      "content_type": m.content_type,
      "content": m.content,
      "created_at": m.created_at.isoformat() if m.created_at else None,
  }


@api_chat_bp.route("/api_chat_bp/image-upload/", methods=["POST"])
def upload_image():
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

    if role not in {"client", "owner", "ia"}:
        role = "client"

    try:
        rel_path = _save_media_file(file, "image")

        # content = ruta relativa. Si querés, podés guardar JSON con caption.
        content = rel_path
        if caption:
            content = f"{rel_path}||{caption}"  # o usar JSON en el modelo

        msg = Message(
            conversation_id = conv_id,
            role            = role,
            via             = "dpia",
            content_type    = "image",
            content         = content,
        )
        db.session.add(msg)
        db.session.commit()

        return jsonify(ok=True, message=_make_message_dict(msg))

    except Exception as e:
        db.session.rollback()
        return jsonify(ok=False, error=str(e)), 500


def _make_message_dict(m: Message) -> dict:
    return {
        "id": m.id,
        "role": m.role,
        "via": m.via,
        "content_type": m.content_type,
        "content": m.content,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }



@api_chat_bp.route("/api_chat_bp/audio-upload/", methods=["POST"])
def upload_audio():
    """
    FormData:
      - file: Blob audio/webm
      - conversation_id: int
      - as: "client" | "owner" | "ia" (opcional, default client)
    """
    conv_id = request.form.get("conversation_id")
    role    = (request.form.get("as") or "client").lower()
    file    = request.files.get("file")

    if not conv_id or not file:
        return jsonify(ok=False, error="conversation_id y file son obligatorios"), 400

    if role not in {"client", "owner", "ia"}:
        role = "client"

    try:
        conv_id = int(conv_id)
    except ValueError:
        return jsonify(ok=False, error="conversation_id inválido"), 400

    try:
        # 1) Guardar archivo en static/uploads/audio
        upload_root = current_app.config.get("UPLOAD_FOLDER", "static/uploads")
        audio_dir   = os.path.join(upload_root, "audio")
        os.makedirs(audio_dir, exist_ok=True)

        filename = secure_filename(file.filename or "audio.webm")
        filepath = os.path.join(audio_dir, filename)
        file.save(filepath)

        # ruta pública (Nginx ya expone /chat/static/ hacia static/)
        public_path = f"/chat/static/uploads/audio/{filename}"

        # 2) Crear mensaje
        msg = Message(
            conversation_id = conv_id,
            role            = role,
            via             = "dpia",
            content_type    = "audio",
            content         = public_path,
        )
        db.session.add(msg)
        db.session.commit()

        return jsonify(ok=True, message=serialize_message(msg))

    except Exception as e:
        db.session.rollback()
        return jsonify(ok=False, error=str(e)), 500
    finally:
        db.session.close()


@api_chat_bp.route("/api_chat_bp/video-upload/", methods=["POST"])
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
