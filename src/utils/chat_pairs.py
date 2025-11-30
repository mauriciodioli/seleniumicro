# utils/chat_pairs.py
from sqlalchemy import or_, and_
from models.chats.conversation import Conversation
from models.chats.chat_scope import ChatScope

def get_chat_scopes_for_pair(session, viewer_id: int, other_user_id: int):
    """
    Devuelve TODOS los scopes de conversación entre viewer y other_user,
    sin importar quién es owner o client.
    """
    rows = (
        session.query(ChatScope, Conversation)
        .join(Conversation, Conversation.scope_id == ChatScope.id)
        .filter(
            Conversation.status == "open",
            Conversation.ia_active.is_(True),
            or_(
                and_(
                    Conversation.owner_user_id == viewer_id,
                    Conversation.client_user_id == other_user_id,
                ),
                and_(
                    Conversation.owner_user_id == other_user_id,
                    Conversation.client_user_id == viewer_id,
                ),
            )
        )
        .all()
    )

    scopes = []
    for scope, conv in rows:
        scopes.append({
            "scope_id":        scope.id,
            "conversation_id": conv.id,
            "dominio":         scope.dominio,
            "ambito_id":       scope.ambito_id,
            "categoria_id":    scope.categoria_id,
            "codigo_postal":   scope.codigo_postal,
            "locale":          scope.locale,
            "from_chat":       True,          # <- bandera importante
        })
    return scopes
