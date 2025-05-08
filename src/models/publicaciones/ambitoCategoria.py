from flask_marshmallow import Marshmallow
from flask import Blueprint
from utils.db import db
from sqlalchemy import inspect, Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

ma = Marshmallow()


ambitoCategoria = Blueprint('ambitoCategoria', __name__)


class AmbitoCategoria(db.Model):
    __tablename__ = 'ambitoCategoria'
    
    # Columnas de la tabla
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)  
    nombre = db.Column(db.String(500), unique=True, nullable=False)
    descripcion = db.Column(db.String(500), nullable=True)
    idioma = db.Column(db.String(500), nullable=True)
    valor = db.Column(db.String(500), nullable=True)
    color = db.Column(db.String(50), nullable=True)
    estado = db.Column(db.String(500), nullable=True)
    
    
    # Constructor
    def __init__(self, nombre, descripcion,color, idioma=None, valor=None, estado=None):
        self.nombre = nombre
        self.descripcion = descripcion
        self.idioma = idioma
        self.valor = valor
        self.color = color
        self.estado = estado
       
    
    def __repr__(self):
        return f"AmbitoCategoria(id={self.id}, nombre={self.nombre}, descripcion={self.descripcion}, idioma={self.idioma},color={self.color}, valor={self.valor}, estado={self.estado})"
    
    @classmethod
    def crear_tabla_ambitoCategoria(self):
        # Verificar si la tabla 'ambitos' existe antes de crearla
        insp = inspect(db.engine)
        if not insp.has_table("ambitoCategoria"):
            db.create_all()



# Schema de Marshmallow para serialización
class MerShema(ma.Schema):
    class Meta:       
        fields = ("id", "nombre", "descripcion", "idioma","color" "valor", "estado")  # Campos a serializar

