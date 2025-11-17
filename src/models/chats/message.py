from extensions import db
from models.chats.message_media import MessageMedia  # 👈 IMPORTA LA CLASE


class Message(db.Model):
    __tablename__ = "message"

    id = db.Column(db.BigInteger, primary_key=True)

    conversation_id = db.Column(
        db.BigInteger,
        db.ForeignKey("conversation.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    role = db.Column(db.String(16), nullable=False)   # client|owner|ia
    via  = db.Column(db.String(16), default="dpia")   # dpia|wa|email|webhook

    content_type = db.Column(db.String(12), default="text")  # text|media|mixed

    content  = db.Column(db.Text)
    blob_ref = db.Column(db.String(255))

    intent      = db.Column(db.String(64))
    emotion     = db.Column(db.String(32))
    confidence  = db.Column(db.Float)
    labels_json = db.Column(db.JSON)

    created_at = db.Column(db.DateTime, server_default=db.func.now())

    # 👇 ACÁ ESTABA EL PROBLEMA: usar el nombre de la CLASE, no de la tabla
    media = db.relationship(
        "MessageMedia",        # NO "message_media"
        backref="message",
        lazy="select",
        cascade="all, delete-orphan",
    )
