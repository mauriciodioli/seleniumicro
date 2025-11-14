# routes/api_chat.py
from flask import Blueprint, request, jsonify
# flask_login ni lo usás acá, lo podés borrar
# from flask_login import current_user
from extensions import db
from models.chats.message import Message
from models.usuario import Usuario  # ajustá al nombre real
from utils.phone import normalize_phone
from utils.chat_users import get_or_create_user_from_phone
from utils.chat_contacts import get_or_create_contacto_personal
from utils.chat_conversation import get_or_create_conversation


api_chat_bp = Blueprint("api_chat_bp", __name__, url_prefix="/api/chat")

@api_chat_bp.route("/open", methods=["POST"])
def open_conversation():
    data   = request.get_json() or {}
    scope  = data.get("scope")  or {}
    client = data.get("client") or {}
    publication_id = scope.get("publication_id") or 0
    try:
        # ========== 1) DATOS QUE YA VIENEN DEL FRONT ==========

        # Teléfono (obligatorio)
        raw_tel = (client.get("tel") or "").strip()
        tel = normalize_phone(raw_tel)
        if not tel:
            return jsonify(ok=False, error="Falta teléfono del cliente"), 400

        # ID del usuario cliente (ya existe, lo trae el front)
        cu_id = client.get("user_id")
        if not cu_id:
            return jsonify(ok=False, error="Falta client.user_id en el payload"), 400
        try:
            client_user_id = int(cu_id)
        except (TypeError, ValueError):
            return jsonify(ok=False, error="client.user_id inválido"), 400

        # Owner del micrositio (lo manda el scope)
        owner_user_id = scope.get("owner_user_id")
        if not owner_user_id:
            return jsonify(ok=False, error="Falta owner_user_id en scope"), 400

        # Contexto
        dominio = scope.get("dominio") or "tecnologia"
        locale  = scope.get("locale")  or "es"

        ambito_id        = scope.get("ambito_id")
        categoria_id     = scope.get("categoria_slug")
        codigo_postal_id = scope.get("codigo_postal")
       
        # Slugs / etiquetas solo para mostrar “desde dónde viene”
        ambito_slug    = scope.get("ambito_slug")
        categoria_slug = scope.get("categoria_slug")
        codigo_postal  = scope.get("codigo_postal")

        alias = client.get("alias")
        email = client.get("email")

        # ========== 2) CONVERSACIÓN: GET OR CREATE ==========

        conv = get_or_create_conversation(
            owner_user_id=owner_user_id,
            client_user_id=client_user_id,
            dominio=dominio,
            ambito_id=ambito_id,
            categoria_id=int(categoria_id),
            codigo_postal_id=codigo_postal_id,
            locale=locale,
            publication_id=publication_id,
        )

        # ========== 3) HISTORIAL DE MENSAJES ==========

        msgs = (
            db.session
              .query(Message)
              .filter_by(conversation_id=conv.id)
              .order_by(Message.id.asc())
              .all()
        )

        is_new = (len(msgs) == 0)

        def msg_to_dict(m: Message) -> dict:
            return {
                "id": m.id,
                "role": m.role,
                "via": m.via,
                "content_type": m.content_type,
                "content": m.content,
                "created_at": m.created_at.isoformat() if m.created_at else None,
                "intent": m.intent,
                "emotion": m.emotion,
                "confidence": m.confidence,
                "labels": m.labels_json,
            }

        messages_json = [msg_to_dict(m) for m in msgs]

        # ========== 4) RESUMEN PARA EL FRONT (from_summary) ==========

        from_summary = " · ".join(
            x for x in [
                dominio or "",
                ambito_slug or "",
                categoria_slug or "",
                codigo_postal or "",
            ] if x
        )

        db.session.commit()

        return jsonify(
            ok=True,
            conversation_id=conv.id,
            is_new=is_new,
            from_summary=from_summary,
            scope={
                "id": conv.scope_id,
                "owner_user_id": conv.owner_user_id,
                "client_user_id": conv.client_user_id,
                "dominio": dominio,
                "locale": locale,
                "ambito_id": ambito_id,
                "categoria_id": int(categoria_id),
                "codigo_postal_id": codigo_postal_id,
                "publication_id": publication_id,
            },
            client={
                "id": client_user_id,
                "tel": tel,
                "alias": alias,
                "email": email,
            },
            messages=messages_json,
        )

    except Exception as e:
        db.session.rollback()
        return jsonify(ok=False, error=str(e)), 500
    finally:
        db.session.close()
    


@api_chat_bp.route("/messages", methods=["POST"])
def get_messages():
    data    = request.get_json() or {}
    conv_id = data.get("conversation_id")
    if not conv_id:
        return jsonify(ok=False, error="conversation_id requerido"), 400

    msgs = (
        Message.query
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
        "created_at":   m.created_at.isoformat()
    } for m in msgs]

    return jsonify(ok=True, messages=payload)


@api_chat_bp.route("/send", methods=["POST"])
def send():
    """
    Body:
    {
      "conversation_id": 123,
      "text": "hola",
      "as": "client" | "owner" | "ia"
    }
    """
    data   = request.get_json() or {}
    conv_id = data.get("conversation_id")
    text    = (data.get("text") or "").strip()
    role    = (data.get("as") or "client").lower()

    if not conv_id or not text:
        return jsonify(ok=False, error="conversation_id y text son obligatorios"), 400

    if role not in {"client", "owner", "ia"}:
        role = "client"

    try:
        msg = Message(
            conversation_id = conv_id,
            role            = role,
            via             = "dpia",
            content_type    = "text",
            content         = text,
        )
        db.session.add(msg)
        db.session.commit()
        return jsonify(ok=True, id=msg.id)
    except Exception as e:
        db.session.rollback()
        return jsonify(ok=False, error=str(e)), 500
