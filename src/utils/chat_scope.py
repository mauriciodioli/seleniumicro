# utils/chat_scope.py
import hashlib
from sqlalchemy.exc import IntegrityError

from extensions import db
from models.chats.chat_scope import ChatScope


def make_context_hash(
    dominio,
    ambito_id,
    categoria_id,
    cp_key,          # <- puede ser ID numérico, CP string, o None
    locale,
    publicacion_id,
) -> str:
    """
    Hash de CONTEXTO puro: NO depende de usuarios.
    Así, ambos lados (22 y 54) con el mismo ámbito/categoría/CP/idioma
    comparten el mismo chat_scope.
    """
    raw = f"{dominio}|{ambito_id}|{categoria_id}|{cp_key}|{locale}|{publicacion_id}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()



def get_or_create_scope(
    dominio,
    ambito_id=None,
    categoria_id=None,
    codigo_postal=None,
    codigo_postal_id=None,
    locale="es",
    publicacion_id=None,
    owner_user_id=None,   # lo seguimos guardando, pero NO entra en el hash
    session=None,
) -> ChatScope:

    sess = session or db.session

    # --- Normalizar CP ---
    cp_id = None
    cp_txt = None

    if isinstance(codigo_postal_id, int):
        cp_id = codigo_postal_id
    elif isinstance(codigo_postal_id, str):
        if codigo_postal_id.isdigit():
            cp_id = int(codigo_postal_id)
        else:
            cp_txt = codigo_postal_id

    if codigo_postal:
        cp_txt = codigo_postal

    if cp_id is not None:
        cp_key = cp_id
    else:
        cp_key = cp_txt or None

    # 🚨 IMPORTANTE: hash SIN owner_user_id
    h = make_context_hash(
        dominio=dominio,
        ambito_id=ambito_id,
        categoria_id=categoria_id,
        cp_key=cp_key,
        locale=locale,
        publicacion_id=publicacion_id,
    )

    # 1) Buscar primero
    scope = sess.query(ChatScope).filter_by(hash_contextid=h).first()
    if scope:
        return scope

    # 2) Crear si no existe
    scope = ChatScope(
        dominio=dominio,
        ambito_id=ambito_id,
        categoria_id=categoria_id,
        codigo_postal=cp_txt,
        codigo_postal_id=cp_id,
        locale=locale,
        publicacion_id=publicacion_id,
        owner_user_id=owner_user_id,   # se guarda, pero no define el hash
        hash_contextid=h,
    )
    sess.add(scope)

    try:
        sess.flush()
    except IntegrityError:
        sess.rollback()
        scope = sess.query(ChatScope).filter_by(hash_contextid=h).first()
        if scope:
            return scope
        raise

    return scope

