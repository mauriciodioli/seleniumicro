from flask_marshmallow import Marshmallow
from flask import Blueprint
from utils.db import db
from sqlalchemy import inspect
from sqlalchemy.orm import relationship
from sqlalchemy import Column, Integer, String, ForeignKey
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema


ma = Marshmallow()

usuario = Blueprint('usuario',__name__) 



class Usuario(db.Model):
    __tablename__ = 'usuarios'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    activo = db.Column(db.Boolean, nullable=False, default=False)    
    correo_electronico = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.LargeBinary(128), nullable=False)
    token = db.Column(db.String(1000), nullable=True)
    roll = db.Column(db.String(20), nullable=False, default='regular')
    refresh_token = db.Column(db.String(1000), nullable=True)
  
  


 
   
 # constructor
    def __init__(self, id,correo_electronico,token,refresh_token,activo,password,roll='USUARIO'):
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
    def crear_tabla_usuarios(serlf):
         insp = inspect(db.engine)
         if not insp.has_table("usuarios"):
              db.create_all()
    
        
class MerShema(SQLAlchemyAutoSchema):
    class Meta:
        model = Usuario  # Indica que este esquema está basado en el modelo Image
        load_instance = True  # Permite que las instancias de modelos se carguen directamente
        sqla_session = db.session  # Si usas un `db.session` específico, configúralo aquí

# Instancia del esquema
mer_schema = MerShema()