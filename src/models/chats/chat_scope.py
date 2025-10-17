from extensions import db

class ChatScope(db.Model):
    __tablename__ = "chat_scope"

    id = db.Column(db.BigInteger, primary_key=True)
    dominio = db.Column(db.String(120), nullable=False)
    ambito_id = db.Column(db.BigInteger)
    categoria_id = db.Column(db.BigInteger)
    codigo_postal_id = db.Column(db.BigInteger)
    locale = db.Column(db.String(10), nullable=False)  # ej: es-AR, it-IT
    publication_id = db.Column(db.BigInteger, nullable=False)
    owner_user_id = db.Column(db.BigInteger, nullable=False)

    hash_contextid = db.Column(db.String(64), unique=True, index=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(
        db.DateTime, server_default=db.func.now(), onupdate=db.func.now()
    )
