from sqlalchemy.exc import IntegrityError
from extensions import db
from models.chats.conversation import Conversation
from typing import Optional, Tuple
from utils.chat_scope import get_or_create_scope
from sqlalchemy import or_, and_


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
) -> Tuple[Conversation, bool]:
    """
    Devuelve SIEMPRE la misma conversación para la misma pareja de usuarios
    (en cualquier orden) y el mismo scope.

    Retorna:
        (conversation, i_am_server)

        i_am_server = True  -> el usuario pasado como owner_user_id
                               ES el owner de esta conversación
        i_am_server = False -> el owner real es el otro (conv.owner_user_id)
    """

    sess = session or db.session

    # --- normalizar publicación ---
    if publicacion_id != 0 and publicacion_id is not None:
        try:
            publicacion_id = int(publicacion_id)
            if publicacion_id <= 0:
                publicacion_id = None
        except (TypeError, ValueError):
            publicacion_id = None
    else:
        publicacion_id = None

    # --- 1) scope (esto ya deduplica por hash_contextid sin usuarios) ---
    scope = get_or_create_scope(
        dominio=dominio,
        ambito_id=ambito_id,
        categoria_id=categoria_id,
        codigo_postal=codigo_postal,
        codigo_postal_id=codigo_postal_id,
        locale=locale,
        publicacion_id=publicacion_id,
        owner_user_id=owner_user_id,   # se guarda pero NO entra en el hash
        session=sess,
    )

    # --- 2) buscar conversación EXISTENTE en cualquier orden ---
    base_filters = [
        Conversation.scope_id == scope.id,
        Conversation.channel == channel,
        Conversation.status == "open",
        Conversation.ia_active.is_(True),
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
    ]

    q = sess.query(Conversation).filter(*base_filters)

    if publicacion_id is None:
        q = q.filter(
            (Conversation.publicacion_id.is_(None)) |
            (Conversation.publicacion_id == 0)
        )
    else:
        q = q.filter(Conversation.publicacion_id == publicacion_id)

    conv = q.order_by(Conversation.id.desc()).first()
    if conv:
        # 💡 soy "server" si el owner REAL de la conversación soy yo
        i_am_server = (conv.owner_user_id == owner_user_id)
        return conv, i_am_server

    # --- 3) crear si no existe ---
    conv = Conversation(
        scope_id=scope.id,
        owner_user_id=owner_user_id,   # 👈 el que llama AHORA queda como owner
        client_user_id=client_user_id, # 👈 el otro queda como client
        channel=channel,
        status="open",
        ia_active=True,
        publicacion_id=publicacion_id,  # puede ser None
    )
    sess.add(conv)
    sess.flush()  # para tener conv.id

    # 💡 si llegamos acá, el que llamó ES el server de esta conv
    return conv, True
