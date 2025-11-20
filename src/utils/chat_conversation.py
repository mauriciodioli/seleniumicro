# services/chat_conversation.py (o donde lo tengas)
from sqlalchemy.exc import IntegrityError
from extensions import db
from models.chats.conversation import Conversation
from typing import Optional
from utils.chat_scope import get_or_create_scope




def get_or_create_conversation(
    *,
    owner_user_id: int,
    client_user_id: int,
    dominio: str,
    ambito_id: Optional[int] = None,
    categoria_id: Optional[int] = None,
    codigo_postal: Optional[str] = None,
    codigo_postal_id: Optional[int] = None,
    locale: str = "es",
    publicacion_id: Optional[int] = None,
    channel: str = "dpia",
    session=None,
) -> Conversation:
    """
    Devuelve SIEMPRE la misma conversación para el mismo:
      - owner_user_id
      - client_user_id
      - scope (dominio/ámbito/categoría/CP/locale/publicación/owner)
      - channel='dpia'
      - status='open'
      - ia_active = True
    """

    sess = session or db.session

    # --- normalizar publicación ---
    if publicacion_id:
        try:
            publicacion_id = int(publicacion_id)
            if publicacion_id <= 0:
                publicacion_id = None
        except (TypeError, ValueError):
            publicacion_id = None
    else:
        publicacion_id = None

    # --- 1) scope (esto ya deduplica por hash_contextid) ---
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

    # --- 2) buscar conversación existente coherente ---
    q = (
        sess.query(Conversation)
        .filter(
            Conversation.scope_id == scope.id,
            Conversation.owner_user_id == owner_user_id,
            Conversation.client_user_id == client_user_id,
            Conversation.channel == channel,
            Conversation.status == "open",
            Conversation.ia_active.is_(True),
        )
    )

    if publicacion_id is None:
        q = q.filter(
            (Conversation.publicacion_id.is_(None)) |
            (Conversation.publicacion_id == 0)
        )
    else:
        q = q.filter(Conversation.publicacion_id == publicacion_id)

    # si hay varias, usamos la más nueva
    conv = q.order_by(Conversation.id.desc()).first()
    if conv:
        return conv

    # --- 3) crear si no existe ---
    conv = Conversation(
        scope_id=scope.id,
        owner_user_id=owner_user_id,
        client_user_id=client_user_id,
        channel=channel,
        status="open",
        ia_active=True,
        publicacion_id=publicacion_id,  # puede ser None
    )
    sess.add(conv)
    sess.flush()  # para tener conv.id

    return conv