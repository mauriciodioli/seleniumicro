# utils/chat_scope.py
import hashlib
from utils.db import db

from models.chats.chat_scope import ChatScope

def make_context_hash(dominio, ambito_id, categoria_id, codigo_postal_id,
                      locale, publication_id, owner_user_id) -> str:
    raw = f"{dominio}|{ambito_id}|{categoria_id}|{codigo_postal_id}|{locale}|{publication_id}|{owner_user_id}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def get_or_create_scope(dominio, ambito_id, categoria_id, codigo_postal_id,
                        locale, publication_id, owner_user_id) -> ChatScope:
    h = make_context_hash(dominio, ambito_id, categoria_id, codigo_postal_id,
                          locale, publication_id, owner_user_id)

    scope = ChatScope.query.filter_by(hash_contextid=h).first()
    if scope:
        return scope

    scope = ChatScope(
        dominio=dominio,
        ambito_id=ambito_id,
        categoria_id=categoria_id,
        codigo_postal_id=codigo_postal_id,
        locale=locale,
        publication_id=publication_id,
        owner_user_id=owner_user_id,
        hash_contextid=h
    )
    db.session.add(scope)
    db.session.flush()
    return scope
