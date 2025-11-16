from extensions import db

class Message(db.Model):
    __tablename__ = "message"

    id = db.Column(db.BigInteger, primary_key=True)
    conversation_id = db.Column(
        db.BigInteger, nullable=False, index=True
    )
    role = db.Column(db.String(16), nullable=False)  # client|owner|ia
    via = db.Column(db.String(16), default="dpia")   # dpia|wa|email|webhook
    content_type = db.Column(db.String(12), default="text")  # text|image|audio|file

    content = db.Column(db.Text)     # texto
    blob_ref = db.Column(db.String(255))  # path/URL si es adjunto

    intent = db.Column(db.String(64))
    emotion = db.Column(db.String(32))
    confidence = db.Column(db.Float)
    labels_json = db.Column(db.JSON)  # chips: pregunta_avanzada, etc.

    created_at = db.Column(db.DateTime, server_default=db.func.now())
