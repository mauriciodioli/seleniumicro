# utils/chat_scope.py
import hashlib
from sqlalchemy.exc import IntegrityError

from extensions import db
from models.chats.chat_scope import ChatScope


def make_context_hash(
    dominio,
    ambito_id,
    categoria_id,
    owner_user_id,
    locale,
) -> str:
    """
    Hash de CONTEXTO lógico:

      - owner_user_id  -> dueño del ámbito (servidor)
      - ambito_id
      - categoria_id
      - dominio (por si tenés varios dominios)
      - locale (si querés separar por idioma)

    NO depende de:
      - código postal
      - código_postal_id
      - publicacion_id
      - cliente

    Así, cualquier CP comparte el mismo chat_scope si pertenece
    al mismo owner/ámbito/categoría/idioma.
    """
    raw = f"{dominio}|{ambito_id or 0}|{categoria_id or 0}|{owner_user_id or 0}|{locale or ''}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def get_or_create_scope(
    dominio,
    ambito_id=None,
    categoria_id=None,
    codigo_postal=None,
    codigo_postal_id=None,
    locale="es",
    publicacion_id=None,
    owner_user_id=None,   # ESTE define el contexto junto con ámbito/categoría
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

    # cp_key ya no se usa para el hash, solo guardamos texto/ID en la fila
    # Hash SOLO por owner/ambito/categoria/dominio/locale
    h = make_context_hash(
        dominio=dominio,
        ambito_id=ambito_id,
        categoria_id=categoria_id,
        owner_user_id=owner_user_id,
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
        publicacion_id=publicacion_id,   # se guarda, pero no entra al hash
        owner_user_id=owner_user_id,
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
