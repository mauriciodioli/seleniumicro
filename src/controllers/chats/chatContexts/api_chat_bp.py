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
from utils.chat_pairs import get_chat_scopes_for_pair
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
            client_user_id = int(cu_id)
        except (TypeError, ValueError):
            return jsonify(ok=False, error="client.user_id inválido"), 400

        owner_user_id = scope.get("owner_user_id")
        if not owner_user_id:
            return jsonify(ok=False, error="Falta owner_user_id en scope"), 400
        try:
            owner_user_id = int(owner_user_id)
        except (TypeError, ValueError):
            return jsonify(ok=False, error="owner_user_id inválido"), 400

        # 👇 viene del front como targetId_raw (id del contacto / botón)
        target_user_id = data.get("targetId_raw")

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

        # Si el que abre el chat ES el dueño del ámbito (viewer == owner),
        # el "cliente" de la conversación tiene que ser el target (el otro usuario).
        if client_user_id == owner_user_id:
            if not target_user_id:
                return jsonify(ok=False, error="Falta targetId_raw para owner del ámbito"), 400
            try:
                client_user_id = int(target_user_id)
            except (TypeError, ValueError):
                return jsonify(ok=False, error="targetId_raw inválido"), 400

        # ========== 2) CONVERSACIÓN: USAR FUNCIÓN MODULAR ==========

        with get_db_session() as session:
            # 👇 ahora usamos la versión que devuelve (conv, i_am_server)
            conv, i_am_server = get_or_create_conversation(
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
                channel="dpia",
            )

            # quien llama es cliente si NO creó la conversación
            viewer_role = "owner" if i_am_server else "client"
            is_client   = not i_am_server
            is_server   = i_am_server

            # ========== 3) HISTORIAL DE MENSAJES ==========

            msgs = (
                session
                .query(Message)
                .filter_by(conversation_id=conv.id)
                .order_by(Message.id.asc())
                .all()
            )

            is_new = (len(msgs) == 0)

            def msg_to_dict(m: Message) -> dict:
                return {
                    "id":           m.id,
                    "role":         m.role,
                    "via":          m.via,
                    "content_type": m.content_type,
                    "content":      m.content,
                    "created_at":   m.created_at.isoformat()   if m.created_at   else None,
                    "delivered_at": m.delivered_at.isoformat() if m.delivered_at else None,
                    "read_at":      m.read_at.isoformat()      if m.read_at      else None,
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
                # 👇 esto es lo que pediste: saber si esta llamada es cliente o no
                viewer_role=viewer_role,   # "owner" o "client"
                is_client=is_client,       # True si NO creó la conversación
                is_server=is_server,       # True si creó la conversación
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
    conv, i_am_server  = get_or_create_conversation(
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
    return conv, i_am_server


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
                "created_at":   m.created_at.isoformat()   if m.created_at   else None,
                "delivered_at": m.delivered_at.isoformat() if m.delivered_at else None,
                "read_at":      m.read_at.isoformat()      if m.read_at      else None,
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
    role    = (data.get("role") or "").lower()  # ⚠️ proteger el None

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

            now_utc = datetime.now()

            msg = Message(
                conversation_id = conv.id,
                role            = role,
                via             = "dpia",
                content_type    = "text",
                content         = text,
                # si created_at tiene default en el modelo, podés omitirlo
                created_at      = now_utc,
                delivered_at    = now_utc,  # ✅ llegó al server
                read_at         = None,     # aún no leído
            )
            session.add(msg)
            session.flush()  # para tener msg.id

            # actualizar "actividad" de la conversación
            conv.updated_at = func.now()

            # el commit lo hace get_db_session() al salir del with
            return jsonify(
                ok=True,
                message={
                    "id":           msg.id,
                    "role":         msg.role,
                    "via":          msg.via,
                    "content_type": msg.content_type,
                    "content":      msg.content,
                    "created_at":   msg.created_at.isoformat() if msg.created_at else None,
                    "delivered_at": msg.delivered_at.isoformat() if msg.delivered_at else None,
                    "read_at":      msg.read_at.isoformat() if msg.read_at else None,
                }
            )

    except Exception as e:
        current_app.logger.exception("Error en /api_chat_bp/send")
        return jsonify(ok=False, error=str(e)), 500
    

@api_chat_bp.route("/api_chat_bp/read/", methods=["POST"])
def mark_read():
    data      = request.get_json() or {}
    conv_id   = data.get("conversation_id")
    viewer_id = data.get("viewer_id")

    if not conv_id or not viewer_id:
        return jsonify(ok=False, error="conversation_id y viewer_id son obligatorios"), 400

    try:
        conv_id   = int(conv_id)
        viewer_id = int(viewer_id)
    except (TypeError, ValueError):
        return jsonify(ok=False, error="IDs inválidos"), 400

    try:
        with get_db_session() as session:
            conv = (
                session.query(Conversation)
                       .filter(Conversation.id == conv_id)
                       .first()
            )
            if not conv:
                return jsonify(ok=False, error="conversation no encontrada"), 404

            # Determinar si el que mira es owner o client
            if viewer_id == conv.owner_user_id:
                viewer_role = "owner"
            elif viewer_id == conv.client_user_id:
                viewer_role = "client"
            else:
                # este usuario ni siquiera pertenece a esta conversación
                return jsonify(ok=False, error="viewer no pertenece a esta conversación"), 400

            other_role = "client" if viewer_role == "owner" else "owner"
            now_utc    = datetime.utcnow()

            # Mensajes del OTRO lado, aún no leídos
            msgs_q = (
                session.query(Message)
                       .filter(
                           and_(
                               Message.conversation_id == conv_id,
                               Message.role == other_role,
                               Message.read_at.is_(None),
                           )
                       )
                       .order_by(Message.id.asc())
            )

            updated_ids = []
            for m in msgs_q:
                m.read_at = now_utc
                updated_ids.append(m.id)

            # get_db_session() se encarga del commit/rollback
            return jsonify(
                ok=True,
                updated_ids=updated_ids,
                viewer_role=viewer_role,
                other_role=other_role,
            )

    except Exception as e:
        current_app.logger.exception("Error en /api_chat_bp/read/")
        return jsonify(ok=False, error=str(e)), 500








