from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from config import DATABASE_CONNECTION_URI
from sqlalchemy.exc import OperationalError, SQLAlchemyError

# Importar desde extensions
from extensions import db, ma

# Crear la aplicación Flask
app = Flask(__name__)

# Configuración
app.secret_key = '*0984632'
app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_CONNECTION_URI
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['SQLALCHEMY_POOL_SIZE'] = 10
app.config['SQLALCHEMY_POOL_RECYCLE'] = 280
app.config['SQLALCHEMY_MAX_OVERFLOW'] = 10

# Inicializar extensiones con el app
db.init_app(app)
ma.init_app(app)

# Importar blueprints
from controllers.selenium_controller import selenium_controller
from controllers.conexionesSheet.datosSheet import datoSheet
from controllers.publicaciones import publicaciones
from controllers.conexionesSheet.conexion_externa import conexion_externa
from controllers.scrape_amazon_dpia import scrape_amazon_dpia
from controllers.filtro_publicacion import filtro_publicacion

# Registrar blueprints
app.register_blueprint(selenium_controller)
app.register_blueprint(datoSheet)
app.register_blueprint(conexion_externa)
app.register_blueprint(publicaciones)
app.register_blueprint(scrape_amazon_dpia)
app.register_blueprint(filtro_publicacion)

# Probar conexión
def test_db_connection():
    try:
        with app.app_context():
            db.engine.connect()
            print("Conexión exitosa a la base de datos.")
    except OperationalError as e:
        print(f"Error de conexión a la base de datos: {e}")
    except SQLAlchemyError as e:
        print(f"Error en SQLAlchemy: {e}")

test_db_connection()

if __name__ == '__main__':   
    app.run(host="0.0.0.0", port=8000, debug=True, use_reloader=False)

