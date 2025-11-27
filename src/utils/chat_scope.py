# utils/chat_scope.py
import hashlib
from sqlalchemy.exc import IntegrityError

from extensions import db
from models.chats.chat_scope import ChatScope


def make_context_hash(
    dominio,
    ambito_id,
    categoria_id,
    locale,
) -> str:
    """
    Hash de CONTEXTO lógico MÍNIMO:

      - ambito_id
      - categoria_id

    NO depende de:
      - dominio
      - locale
      - owner_user_id
      - código postal / codigo_postal_id
      - publicacion_id
      - cliente

    Cualquier combinación que tenga el mismo (ambito_id, categoria_id)
    comparte el mismo chat_scope.
    """
    raw = f"{ambito_id or 0}|{categoria_id or 0}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def get_or_create_scope(
    dominio,
    ambito_id=None,
    categoria_id=None,
    codigo_postal=None,
    codigo_postal_id=None,
    locale="es",
    publicacion_id=None,
    owner_user_id=None,   # se guarda, pero NO entra en el hash
    session=None,
) -> ChatScope:
    sess = session or db.session

    # --- Normalizar CP (solo informativo, NO entra en el hash) ---
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

    # 🔑 Hash SOLO por (ambito_id, categoria_id)
    h = make_context_hash(
        dominio=dominio,
        ambito_id=ambito_id,
        categoria_id=categoria_id,
        locale=locale,
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
        publicacion_id=publicacion_id,  # solo informativo
        owner_user_id=owner_user_id,    # solo informativo
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
