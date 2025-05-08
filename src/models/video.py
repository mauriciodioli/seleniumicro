from flask_marshmallow import Marshmallow
from flask import Blueprint
from utils.db import db
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy import inspect

ma = Marshmallow()

video = Blueprint('video', __name__)

class Video(db.Model):
    __tablename__ = 'video'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer,nullable=False)
    title = db.Column(db.String(255), unique=True, nullable=False)
    description = db.Column(db.String(255), nullable=False)   
    colorDescription = db.Column(db.String(255), nullable=False) 
    filepath = db.Column(db.String(500), nullable=True)
    randomNumber = db.Column(db.Integer)
    size = db.Column(db.Float)
    mimetype = db.Column(db.String(255), nullable=True)  # Agregado: video.mimetype,  # Tipo MIME correcto
    
    # Relación con Public_imagen_video
    #publicaciones_video = relationship("Public_imagen_video", back_populates="video")

   
    def __init__(self, user_id, title, description, filepath, randomNumber, colorDescription,size, mimetype):
        self.user_id = user_id
        self.title = title
        self.description = description
        self.filepath = filepath
        self.randomNumber = randomNumber
        self.colorDescription = colorDescription
        self.size = size
        self.mimetype = mimetype

    def __repr__(self):
        return f"Video(id={self.id}, user_id={self.user_id}, title={self.title}, description={self.description}, filepath={self.filepath}, randomNumber={self.randomNumber}, colorDescription={self.colorDescription}, size={self.size}, mimetype={self.mimetype})"

    @classmethod
    def crear_tabla_video(cls):
        insp = inspect(db.engine)
        if not insp.has_table("video"):
            cls.__table__.create(db.engine)

class MerShema(ma.Schema):
    class Meta:
        fields = ("id", "user_id", "title", "description", "filepath", "randomNumber", "colorDescription", "size", "mimetype")

mer_schema = MerShema()
mer_shema = MerShema(many=True)
