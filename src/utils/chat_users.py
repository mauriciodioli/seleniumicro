# utils/chat_users.py
from utils.db import db

from models.usuario import Usuario
from utils.phone import normalize_phone

def get_or_create_user_from_phone(tel_raw: str, tel) -> Usuario:
    tel = normalize_phone(tel_raw)
    if not tel:
        raise ValueError("Teléfono inválido")

    # correo sintético estable por número
    fake_email = f"wa_{tel.replace('+', '')}@dpia.local"

    user = Usuario.query.filter_by(correo_electronico=fake_email).first()
    if user:
        return user

    # 🔥 usuario mínimo, password random (no va a loguearse por ahora)
    import os
    pwd = os.urandom(32)

    user = Usuario(
        id=None,
        correo_electronico=fake_email,
        token=None,
        refresh_token=None,
        activo=True,
        password=pwd,
        roll="USUARIO"
    )
    db.session.add(user)
    db.session.flush()  # ya tengo user.id

    return user
