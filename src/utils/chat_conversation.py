# utils/chat_conversation.py
from extensions import db
from models.chats.conversation import Conversation
from utils.chat_scope import get_or_create_scope


def get_or_create_conversation(
    *,
    owner_user_id: int,
    client_user_id: int,
    dominio: str,
    ambito_id: int | None,
    categoria_id: int | None,
    codigo_postal: str | None,
    codigo_postal_id: int | None,
    locale: str,
    publication_id: int | None,
) -> Conversation:

    scope = get_or_create_scope(
        dominio=dominio,
        ambito_id=ambito_id,
        categoria_id=categoria_id,
        codigo_postal=codigo_postal,
        codigo_postal_id=codigo_postal_id,
        locale=locale,
        publication_id=publication_id,
        owner_user_id=owner_user_id,
    )

    conv = (
        db.session.query(Conversation)
        .filter_by(
            scope_id=scope.id,
            owner_user_id=owner_user_id,
            client_user_id=client_user_id,
            channel="dpia",
        )
        .first()
    )
    if conv:
        return conv

    conv = Conversation(
        scope_id=scope.id,
        owner_user_id=owner_user_id,
        client_user_id=client_user_id,
        channel="dpia",
        status="open",
        ia_active=True,
    )
    db.session.add(conv)
    db.session.flush()
    return conv
