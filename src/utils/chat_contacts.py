# utils/chat_contacts.py
from extensions import db

from models.chats.contacto import Contacto, TIPOS_VALIDOS
from utils.phone import normalize_phone


AMBITO_PERSONAL_ID   = 1   # los que ya tengas definidos
CATEGORIA_PERSONAL_ID = 1  # idem


def get_or_create_contacto_personal(user_id: int, tel_raw: str, codigo_postal_id=None):
    tel = normalize_phone(tel_raw)
    if not tel:
        raise ValueError("Teléfono inválido")

    # ✅ AHORA SÍ: usando db.session
    c = (
        db.session
          .query(Contacto)
          .filter_by(user_id=user_id, tipo="whatsapp", valor=tel)
          .first()
    )
    if c:
        return c

    c = Contacto(
        user_id=user_id,
        tipo="whatsapp",
        valor=tel,
        publicacion_id=None,
        codigo_postal_id=codigo_postal_id,
        ambito_id=AMBITO_PERSONAL_ID,
        categoria_id=CATEGORIA_PERSONAL_ID,
        is_primary=True,
        is_active=True,
    )
    db.session.add(c)
    db.session.flush()   # deja el id disponible
    return c