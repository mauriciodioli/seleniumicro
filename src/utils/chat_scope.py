# utils/chat_scope.py
import hashlib
from extensions import db
from models.chats.chat_scope import ChatScope


def make_context_hash(
    dominio,
    ambito_id,
    categoria_id,
    cp_key,          # <- puede ser ID numérico, CP string, o None
    locale,
    publication_id,
    owner_user_id,
) -> str:
    raw = f"{dominio}|{ambito_id}|{categoria_id}|{cp_key}|{locale}|{publication_id}|{owner_user_id}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def get_or_create_scope(
    dominio,
    ambito_id=None,
    categoria_id=None,
    codigo_postal=None,      # "52-200"
    codigo_postal_id=None,   # 123 (FK) o None
    locale="es",
    publication_id=None,
    owner_user_id=None,
    session=None,
) -> ChatScope:
    """
    Usa siempre db.session (o la sesión pasada por parámetro)
    para buscar/crear el scope.
    NO hace commit, solo add/flush.
    """

    sess = session or db.session

    # Normalizar ID de CP si viene como string numérica
    cp_id = None
    cp_txt = None

    if isinstance(codigo_postal_id, int):
        cp_id = codigo_postal_id
    elif isinstance(codigo_postal_id, str):
        if codigo_postal_id.isdigit():
            cp_id = int(codigo_postal_id)
        else:
            # si viene "52-200" acá, lo tratamos como texto de CP
            cp_txt = codigo_postal_id

    # Si ya vino codigo_postal explícito, lo respetamos
    if codigo_postal:
        cp_txt = codigo_postal

    # cp_key = lo que identifica el CP en el hash (ID o texto)
    if cp_id is not None:
        cp_key = cp_id
    else:
        cp_key = cp_txt or None

    h = make_context_hash(
        dominio=dominio,
        ambito_id=ambito_id,
        categoria_id=categoria_id,
        cp_key=cp_key,
        locale=locale,
        publication_id=publication_id,
        owner_user_id=owner_user_id,
    )

    # 🔍 Buscar con db.session
    scope = sess.query(ChatScope).filter_by(hash_contextid=h).first()
    if scope:
        return scope

    # 🆕 Crear si no existe
    scope = ChatScope(
        dominio=dominio,
        ambito_id=ambito_id,
        categoria_id=categoria_id,
        codigo_postal=cp_txt,
        codigo_postal_id=cp_id,
        locale=locale,
        publication_id=publication_id,
        owner_user_id=owner_user_id,
        hash_contextid=h,
    )
    sess.add(scope)
    sess.flush()  # para tener id sin hacer commit todavía

    return scope

