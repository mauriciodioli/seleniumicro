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
    codigo_postal=None,      # "52-200"
    codigo_postal_id=None,   # 123 (FK) o None
    locale="es",
    publicacion_id=None,
    owner_user_id=None,
    session=None,
) -> ChatScope:
    """
    Usa siempre db.session (o la sesión pasada por parámetro)
    para buscar/crear el scope.

    No hace commit, solo add/flush. Maneja carrera por UNIQUE(hash_contextid).
    """

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
        owner_user_id=owner_user_id,
        hash_contextid=h,
    )
    sess.add(scope)

    try:
        # flush para obtener el id sin hacer commit todavía
        sess.flush()
    except IntegrityError:
        # Otro request metió el mismo hash entre que buscamos y flusheamos
        sess.rollback()
        scope = sess.query(ChatScope).filter_by(hash_contextid=h).first()
        if scope:
            return scope
        # Si aún así no existe, eso ya es un bug más serio
        raise

    return scope
