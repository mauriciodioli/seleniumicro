# services/chat_conversation.py (o donde lo tengas)
from sqlalchemy.exc import IntegrityError
from extensions import db
from models.chats.conversation import Conversation
from utils.chat_scope import get_or_create_scope

def get_or_create_conversation(
    owner_user_id: int,
    client_user_id: int,
    dominio: str,
    ambito_id=None,
    categoria_id=None,
    codigo_postal=None,
    codigo_postal_id=None,
    locale="es",
    publicacion_id=None,
    session=None,
) -> Conversation:
    sess = session or db.session

    # 1) Scope idempotente
    scope = get_or_create_scope(
        dominio=dominio,
        ambito_id=ambito_id,
        categoria_id=categoria_id,
        codigo_postal=codigo_postal,
        codigo_postal_id=codigo_postal_id,
        locale=locale,
        publicacion_id=publicacion_id,
        owner_user_id=owner_user_id,
        session=sess,
    )

    # 2) ¿Ya hay conversación para (scope_id, client_user_id)?
    conv = (
        sess.query(Conversation)
        .filter_by(scope_id=scope.id, client_user_id=client_user_id)
        .first()
    )
    if conv:
        return conv

    # 3) Crear si no existe
    conv = Conversation(
        scope_id=scope.id,
        owner_user_id=owner_user_id,
        client_user_id=client_user_id,
        publicacion_id=publicacion_id,
    )
    sess.add(conv)

    try:
        sess.flush()
    except IntegrityError:
        # carrera si hay UNIQUE(scope_id, client_user_id)
        sess.rollback()
        conv = (
            sess.query(Conversation)
            .filter_by(scope_id=scope.id, client_user_id=client_user_id)
            .first()
        )
        if conv:
            return conv
        raise

    return conv
