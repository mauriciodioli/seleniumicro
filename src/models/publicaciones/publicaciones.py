from flask_marshmallow import Marshmallow
from flask import Blueprint
from utils.db import db
from sqlalchemy import inspect, Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship


ma = Marshmallow()

publicaciones = Blueprint('publicaciones', __name__)

class Publicacion(db.Model):
    __tablename__ = 'publicacion'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('usuarios.id'))   
    titulo = db.Column(db.String(120), unique=True, nullable=False)
    texto = db.Column(db.Text, nullable=False)  # Cambiado a db.Text
    ambito = db.Column(db.String(120), nullable=False)
    categoria_id = db.Column(db.Integer,nullable=True)
    correo_electronico = db.Column(db.String(120), nullable=False)
    descripcion = db.Column(db.String(1000), nullable=False)
    color_texto = db.Column(db.String(120), nullable=False)
    color_titulo = db.Column(db.String(120), nullable=False)
    fecha_creacion = db.Column(db.DateTime)
    estado = db.Column(db.String(120), nullable=False)
    botonCompra = db.Column(db.Boolean, default=False)  # Nuevo campo
    imagen = db.Column(db.String(255), nullable=True)
    idioma = db.Column(db.String(255), nullable=True)
    codigoPostal = db.Column(db.String(255), nullable=True)
    pagoOnline = db.Column(db.Boolean, default=True)
    
    def __init__(self, user_id, titulo, texto, ambito,categoria_id, correo_electronico, descripcion, color_texto, color_titulo, fecha_creacion, estado,codigoPostal,pagoOnline, botonCompra=False, imagen=None,idioma=None):
        self.user_id = user_id       
        self.titulo = titulo
        self.texto = texto
        self.ambito = ambito
        self.categoria_id = categoria_id
        self.correo_electronico = correo_electronico
        self.descripcion = descripcion
        self.color_texto = color_texto
        self.color_titulo = color_titulo
        self.fecha_creacion = fecha_creacion
        self.estado = estado
        self.botonCompra = botonCompra
        self.imagen = imagen
        self.idioma = idioma
        self.codigoPostal = codigoPostal
        self.pagoOnline = pagoOnline

    def __repr__(self):
        return f"Publicacion(id={self.id}, user_id={self.user_id}, titulo={self.titulo}, texto={self.texto}, ambito={self.ambito}, categoria_id={self.categoria_id}, correo_electronico={self.correo_electronico}, descripcion={self.descripcion}, color_texto={self.color_texto}, color_titulo={self.color_titulo}, fecha_creacion={self.fecha_creacion}, botonCompra={self.botonCompra}, imagen={self.imagen}, idioma={self.idioma}, codigoPostal={self.codigoPostal}, pagoOnline={self.pagoOnline})"

    @classmethod
    def crear_tabla_publicacion(cls):
        insp = inspect(db.engine)
        if not insp.has_table("publicaciones"):
            db.create_all()
            
class MerShema(ma.Schema):
    class Meta:
        fields = ("id", "user_id", "titulo", "texto", "ambito", "categoria_id", "correo_electronico", "descripcion", "color_texto", "color_titulo", "fecha_creacion", "estado", "botonCompra", "imagen", "idioma", "codigoPostal", "pagoOnline")


mer_schema = MerShema()
mer_shema = MerShema(many=True)
