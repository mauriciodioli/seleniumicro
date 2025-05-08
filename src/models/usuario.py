from flask_marshmallow import Marshmallow
from flask import Blueprint
from utils.db import db
from sqlalchemy import inspect
from sqlalchemy.orm import relationship
# Importar la clase Image
from models.image import Image

class Usuario(db.Model):
    __tablename__ = 'usuarios'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    activo = db.Column(db.Boolean, nullable=False, default=False)    
    correo_electronico = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.LargeBinary(128), nullable=False)
    token = db.Column(db.String(1000), nullable=True)
    roll = db.Column(db.String(20), nullable=False, default='regular')
    refresh_token = db.Column(db.String(1000), nullable=True)
    calendly_url = db.Column(db.String(255))  # URL de Calendly del usuario
    
  
# Asegúrate de que la clase Image esté definida
class Image(db.Model):
    __tablename__ = 'imagenes'
    id = db.Column(db.Integer, primary_key=True)
    url = db.Column(db.String(255))
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'))

    # Relación inversa
    usuarios = relationship("Usuario", back_populates="imagenes")


ma = Marshmallow()

usuario = Blueprint('usuario', __name__)

class Usuario(db.Model):
    __tablename__ = 'usuarios'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    activo = db.Column(db.Boolean, nullable=False, default=False)    
    correo_electronico = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.LargeBinary(128), nullable=False)
    token = db.Column(db.String(1000), nullable=True)
    roll = db.Column(db.String(20), nullable=False, default='regular')
    refresh_token = db.Column(db.String(1000), nullable=True)
    calendly_url = db.Column(db.String(255))  # URL de Calendly del usuario
    imagenes = relationship("Image", back_populates="usuarios")
 

    # constructor
    def __init__(self, id, correo_electronico, token, refresh_token, activo, password, roll='USUARIO'):
        self.id = id
        self.correo_electronico = correo_electronico
        self.token = token
        self.refresh_token = refresh_token
        self.activo = activo        
        self.password = password
        self.roll = roll

    def is_authenticated(self):
        return True

    def is_active(self):
        return self.activo

    def is_anonymous(self):
        return False

    def get_id(self):
        return str(self.id)

    @classmethod
    def crear_tabla_usuarios(cls):
        insp = inspect(db.engine)
        if not insp.has_table("usuarios"):
            db.create_all()

# Correct the schema definition
class MerSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Usuario  # Ensure it's linked to the model
        fields = ("id", "correo_electronico", "token", "refresh_token", "activo", "password", "roll")

# Instantiate the schema
mer_schema = MerSchema()
mer_shema = MerSchema(many=True)
